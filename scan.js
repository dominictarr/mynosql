var pl   = require('pull-level')
var pull = require('pull-stream')
var createFilter = require('./filter')
var path = require('./path')

function length (s) {
  return JSON.stringify(s).length
}

var total = 0, used = 0, reads = 0, start = Date.now()
var index = 0, indexUsed = 0

function createIndex (subquery) {
  var filter = createFilter(subquery)
  var indexer
  return indexer = {
    path: subquery.path,
    query: subquery,
    used: 0, matched: 0,
    hits: 0, index: [],
    add: function (data, matched) {
      var index = [subquery.path, path(subquery.path, data.value), data.key]
      indexer.index.push(index)
      indexer.used += length(index)
      if(filter(data.value)) {
        indexer.matched ++
        if(matched) indexer.hits ++
        return true
      }
      return false
    }
  }
}

function onEnd (onend) {
  return function (read) {
    return function (abort, cb) {
      read(abort, function (end, data) {
        cb(end, data)
        if(end) onend(end === true ? null : end)
      })
    }
  }
}

module.exports = function (db, query, cb) {

  if(!cb) throw new Error('mynosql.scan: must provide callback')

  var indexes = query.map(createIndex)
  var filter = createFilter(query)
  var total = 0, len = 0, count = 0
  var start = Date.now()
  return pull(
    pl.read(db),
    pull.filter(function (data) {
      count ++;
      var len = length(data.value)
      total += len

      var matched = filter(data.value)

      indexes.forEach(function (index) {
        index.add(data, matched)
      })

      if(matched) {
        reads ++; used += len
      }


      return matched
    }),
    onEnd(function (err) {
      var seconds = (Date.now() - start)/1000
      cb(err, {
        total: total,
        count: count,
        reads: reads,
        used: used,
        wasted: total-used,
        efficency: (used/total)*100,
        elapsed: seconds,
        rps: reads/seconds,
        indexes: indexes
      })
    })
  )

}
