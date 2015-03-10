'use strict'
var sublevel  = require('level-sublevel/bytewise')
var pull      = require('pull-stream')
var pl        = require('pull-level')
var paramap   = require('pull-paramap')
var timestamp = require('monotonic-timestamp')
var defer     = require('pull-defer')
var ltgt      = require('ltgt')
var deepEqual = require('deep-equal')

var cont      = require('cont')

var util = require('./util')
var createDiskIndex = require('./indexes/disk')

var LO = null
var HI = undefined

function addTo(aryTo, aryFrom) {
  aryFrom.forEach(function (e) { aryTo.push(e) })
}

var isArray = Array.isArray

function find (ary, test) {
  for(var i = 0; i < ary.length; i++)
    if(test(ary[i], i, ary)) return ary[i]
}

module.exports = function (_db) {

  var db = _db.sublevel ? _db : sublevel(_db)
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
      //filter by unique is a hack. would rather make sure
      //that things where not added twice...
      pull.unique('value'),
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

  db.drain = cont(function (cb) {
    if(landed === inflight) cb()
    else waiting.shift(cb)
  })

  // ************************************
  // Index Creation
  //
  // for a set of paths into the database,
  // create indexes for those values.

  db.indexes = []

  db.getIndex = function (path) {
    util.assertDepth(path, 'getIndex')
    return util.find(db.indexes, function (index) {
      return deepEqual(index.path, path)
    })
  }

  db.createIndex = cont(function (path, cb) {

    //TODO: persist memory indexes
    if(db.getIndex(path)) return cb()

    return db.createIndexes([path], cb)
  })

  db.createIndexes = cont(function (paths, cb) {
    if(!cb) throw new Error('mynosql.createIndexes: must provide callback')

    var batch = [], maxTs = 0

    var indexes = paths.map(function (path) {
      return createDiskIndex(db, path)
    })

    pull(
      db.scan(),
      pull.drain(function (data) {
        maxTs = Math.max(data.ts, maxTs)

        indexes.forEach(function (index) {
          index.pre(data).forEach(function (op) { batch.push(op) })
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
          indexes.forEach(function (index) {
            if(!db.getIndex(index.path))
              db.indexes.push(index)
          })
          cb()
        })
      })
    )
  })

  // ************************************
  // Querying!
  //

  //preinsert, add to persitent indexes

  db.pre(function (data, add) {
    db.indexes.forEach(function (index) {
      if(index.pre) index.pre(data).forEach(add)
    })
  })

  //postinsert, add to memory indexes

  db.post(function (data) {
    db.indexes.forEach(function (index) {
      if(index.post) index.post(data)
    })
  })



  var init = util.createInit(function (cb) {
    pull(
      pl.read(db.sublevel('meta')),
      pull.drain(function (op) {
        db.indexes.push({
          path: op.key, since: op.since
        })
      }, cb)
    )
  })

  var strategies = [
    require('./query/compound-index'),
    require('./query/intersection'),
    require('./query/filtered-index'),
    require('./query/scan')
  ]

  //read out of the index and lookup original,
  //with optional filtering...

  db.readIndex = function (opts, filter) {
    var index = db.getIndex(opts.path || opts.index)

    if(!index) throw new Error('no index for:' + JSON.stringify(opts.path || opts.index))

    return pull(
      index.read(opts),
      paramap(function (key, cb) {
        db.get(key, function (err, value) {
          cb(null, {key: key, value: value})
        })
      }),
      filter ? pull.filter(function (data) {
        return filter(data.value)
      }) : null
    )
  }

  db.plan = cont(function (query, opts, cb) {
    if(!isArray(query)) query = [query]
    init(function () {
      cb(null, strategies.map(function (strategy) {
        return strategy(db, query, opts)
      }).filter(Boolean))
    })
  })

  db.query = function (query, opts) {
    var stream = defer.source()
    db.plan(query, opts, function (err, plans) {
      stream.resolve(plans.filter(Boolean).shift().exec())
    })
    return stream
  }

  db.wipeIndexes = cont(function (cb) {
    var batch = db.indexes.map(function (index) {
      if(index.pre) //a persisted index
        return {key: index.path, type: 'del'}
    }).filter(Boolean)

    db.sublevel('meta').batch(batch, function (err) {
      db.indexes = [] //todo, delete indexes from disk!
      cb()
    })
  })

  return db}
