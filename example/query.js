var db = require('./db')
var pull = require('pull-stream')
var pl = require('pull-level')
var defer = require('pull-defer')
var scan = require('../scan')
var query = [
    {path: ['author', 'name'], eq: 'Dominic Tarr'},
    {path: 'version', lt: '1.0.0'}
  ]

var filter = require('../filter')(query)

function toString(s) {
  return 'string' === typeof s
}

function find (ary, test) {
  for(var i = 0; i < ary.length; i++)
    if(test(ary[i])) return ary[i]
}

var LO = null
var HI = undefined

function writeIndex (db, data, cb) {

  var min
  data.indexes.forEach(function (index) {
    if(!min || min.matched > index.matched)
      min = index
  })
  var index = min.index.map(function (e) {
    return {key: e, value: '', type: 'put'}
  })
  index.push({
    key: ['meta', min.path], value: Date.now(), type: 'put'
  })
  db.sublevel('idx').batch(index, function (err) {
    console.error('wrote index:', min.path, index.length)
    cb()
  })

}


function getIndexedQuery(db, query, cb) {
  pull(
    pl.read(db.sublevel('idx'), {
      gte: ['meta', null], lte: ['meta', undefined],
      keys: true, values: false
    }),
    pull.collect(function (err, ary) {
      if(err || !ary.length)
        return cb(err || new Error('no indexes'))

      var index = ary.filter(function (e) {
        if(!e[1]) return
        var str = ''+e[1]
        return find(query, function (e) {
          return e.path == str
        })
      }).shift()

      if(!index)
        return cb(new Error('no index'))

      index = index[1]

      var q = find(query, function (e) {
        return e.path == ''+index
      })

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

      cb(null, opts)
    })
  )
}

function indexedQuery(db, query) {

  var deferred = defer.source()

  var once = false
  getIndexedQuery(db, query, function (err, opts) {
    if(once) throw new Error('should only happen once')

    once = true
    if(!err)
      deferred.resolve(pull(
        pl.read(db.sublevel('idx'), opts),
        pull.asyncMap(function (key, cb) {
          db.get(key[2], function (err, value) {
            cb(null, value )
          })
        }),
        pull.filter(filter)
      ))
    else
      deferred.resolve(scan(db, query, function (err, data) {
        writeIndex(db, data, function (err) { if(err) throw err })
      }))
  })

  return deferred

}


pull(
  indexedQuery(db, query),
  pull.drain(console.log)
)
