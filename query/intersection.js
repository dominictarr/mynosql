var defer     = require('pull-defer')
var intersect = require('intersect')
var cont      = require('cont')
var pull      = require('pull-stream')
var ltgt      = require('ltgt')
var paramap   = require('pull-paramap')
var util      = require('../util')
//can use this strategy when there are multiple
//indexes that match the query.

module.exports = function (db, query, opts) {
  var valid = true

  if(query.length <= 1) return

  // check whether we have matching indexes for this query.
  var indexable = query.map(util.toIndexable).filter(Boolean)
  console.log('intersection', indexable)

  if(indexable.length <= 1) return

  var indexes = indexable.map(function (q) {
    var i = db.getIndex(q.path)
    if(!i) valid = false
    return i
  })


  if(!valid) return


  return {
    indexes: indexes,
    name: 'intersection',
    exec: function () {
      var stream = defer.source()

      var filter = require('../util').createFilter(query)

      //TODO: implement a streaming lookup
      //though this can be deprioritized until we have big enough
      //data that we are mostly using disk indexes.
      cont.para(
        indexes.map(function (index, i) {
          return function (cb) {
            pull(index.read(indexable[i]), pull.collect(cb))
          }
        })
      ) (function (err, ary) {

        stream.resolve(pull(
          pull.values(intersect(ary)),
          paramap(function (key, cb) {
            db.get(key, function (err, value) {
              cb(null, {key: key, value: value})
            })
          }),
          pull.filter(function (data) {
            return filter(data.value)
          })
        ))
      })

      return stream
    }
  }

}
