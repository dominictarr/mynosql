var defer     = require('pull-defer')
var intersect = require('intersect')
var cont      = require('cont')

//can use this strategy when there are multiple
//indexes that match the query.

module.exports = function (db, query, opts) {
  var valid = true

  // check whether we have matching indexes for this query.
  var indexes = query.map(function (q) {
    var i = db.getIndex(q.path)
    if(!i) valid = false
    return i
  })

  if(query.length <= 1) return

  if(!valid) return

  return {
    indexes: indexes,
    exec: function () {
      var stream = defer.source()

      cont.para(
        indexes.map(function (index, i) {
          return function (cb) {
            pull(index.read(query[i]), pull.collect(cb))
          }
        })
      ) (function (err, ary) {
        stream.resolve(pull.values(intersect(ary)))
      })

      return stream
    }
  }

}
