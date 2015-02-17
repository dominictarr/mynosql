'use strict'
var sublevel  = require('level-sublevel/bytewise')
var pull      = require('pull-stream')
var pl        = require('pull-level')
var paramap   = require('pull-paramap')
var timestamp = require('monotonic-timestamp')
var defer     = require('pull-defer')

var createFilter = require('./filter')
var createInit = require('./init')
var pathTo = require('./path')

function addTo(aryTo, aryFrom) {
  aryFrom.forEach(function (e) { aryTo.push(e) })
}

var isArray = Array.isArray

function find (ary, test) {
  for(var i = 0; i < ary.length; i++)
    if(test(ary[i])) return ary[i]
}

var LO = null
var HI = undefined

module.exports = function (_db) {

  var db = sublevel(_db)
  var logDb = db.sublevel('log')

  // ************************************
  // Log / Scan
  //
  //index everything into logDb.

  db.pre(function (op, add) {
    add({
      prefix: logDb, type: 'put',
      key: timestamp(), value: op.key,
    })
  })

  //output EVERYTHING currently in the database.
  //in the same order as it was added.
  db.scan = function (opts) {
    return pull(
      pl.read(logDb),
      paramap(function (data, cb) {
        db.get(data.value, function (err, value) {
          cb(null, {key: data.value, value: value, ts: data.key})
        })
      })
    )
  }

  // ************************************
  // Drain / Pause

  db.inflight = 0
  db.landed = 0

  var waiting = []
  db.pre(function () {
    db.inflight ++
  })

  db.post(function (op) {
    db.landed ++
    if(waiting.length && db.landed === db.landed)
      while(waiting.length) waiting.shift()()
  })

  db.drain = function (cb) {
    if(landed === inflight) cb()
    else waiting.shift(cb)
  }

  // ************************************
  // Index Creation
  //
  // for a set of paths into the database,
  // create indexes for those values.

  var indexes = []

  db.createIndex = function (path, cb) {
    return db.createIndexes([path], cb)
  }

  db.createIndexes = function (paths, cb) {
    if(!cb) throw new Error('mynosql.createIndexes: must provide callback')

    var batch = [], maxTs = 0

    pull(
      db.scan(),
      pull.drain(function (data) {
        maxTs = Math.max(data.ts, maxTs)
        paths.forEach(function (path) {
          var value = pathTo(path, data.value)
          if(value !== undefined)
            batch.push({
              key: [path, value, data.key], value: '', type: 'put'
            })
        })
      },
      function (err) {
        paths.forEach(function (index) {
          batch.push({
            key: index, value: maxTs,
            prefix: db.sublevel('meta'), type: 'put'
          })
        })
        db.sublevel('idx').batch(batch, function (err) {
          if(err) return cb(err)
          paths.forEach(function (path) {
            indexes.push({path: path, since: maxTs})
          })
          cb()
        })
      })
    )
  }

  // ************************************
  // Querying!
  //

  //load the index table into memory...

  db.pre(function (data, add) {
    indexes.forEach(function (path) {
      add({
        key: [path, pathTo(path, data.value), data.key],
        value: '', type: 'put', prefix: db.sublevel('idx')
      })
    })
  })

  var init = createInit(function (cb) {
    pull(
      pl.read(db.sublevel('meta')),
      pull.drain(function (op) {
        indexes.push({
          path: op.key, since: op.since
        })
      }, cb)
    )
  })

  //move this out and have multiple query strategies
  function getQueryIndex (query) {
    //choose the most indexable parameter
    //use eq instead of a range.
    var index = indexes.filter(function (e) {
      if(!e) return
      var str = ''+e.path
      return find(query, function (q) {
        return q.path == str
      })
    }).shift()

    console.log(index)

    if(!index) return

    var q = find(query, function (e) {
      return e.path == ''+index.path
    })

    var opts

    if(q.eq)
      opts = {gte: [q.path, q.eq, LO], lte: [q.path, q.eq, HI]}
    else {
      opts = {}
      if(q.gte) opts.gte = [q.path, q.gte, LO]
      if(q.gt)  opts.gt  = [q.path, q.gt,  LO]
      if(q.lte) opts.lte = [q.path, q.lte, HI]
      if(q.lt)  opts.lt  = [q.path, q.lt,  HI]
    }

    opts.values = false

    return opts
  }

  db.query = function (query) {
    if(!isArray(query)) query = [query]
    var stream = defer.source()
    init(function () {
      var opts = getQueryIndex(query)
      var filter = createFilter(query)
      console.log('QUERY', opts)
      stream.resolve(
          opts
        //Query using the best index.
        ? pull(
            pl.read(db.sublevel('idx'), opts),
            paramap(function (key, cb) {
              db.get(key[2], function (err, value) {
                cb(null, value )
              })
            }),
            pull.filter(filter)
          )
        //full table scan...
        : pull(db.scan(), pull.filter(filter))
      )
    })
    return stream
  }

  return db
}
