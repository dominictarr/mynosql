var util = require('../util')
var pl = require('pull-level')
var pull = require('pull-stream')
var paramap = require('pull-paramap')

var LO = null
var HI = undefined

module.exports = function (db, query) {
  //choose the most indexable parameter
  //use eq instead of a range.
  var index = db.indexes.filter(function (e) {
    if(!e) return
    var str = ''+e.path
    return util.find(query, function (q) {
      return q.path == str
    })
  }).shift()

  if(!index) return

  var q = util.find(query, function (e) {
    return e.path == ''+index.path
  })

  var opts

  if(q.eq)
    opts = {gte: [[q.path], [q.eq], LO], lte: [[q.path], [q.eq], HI]}
  else {
    opts = {}
    if(q.gte) opts.gte = [[q.path], [q.gte], LO]
    if(q.gt)  opts.gt  = [[q.path], [q.gt],  LO]
    if(q.lte) opts.lte = [[q.path], [q.lte], HI]
    if(q.lt)  opts.lt  = [[q.path], [q.lt],  HI]
  }

  opts.values = false

  return {
    opts: opts,
    query: query,
    exec: function () {
      var filter = util.createFilter(query)

      return pull(
        pl.read(db.sublevel('idx'), opts),
        paramap(function (key, cb) {
          db.get(key[2], function (err, value) {
            cb(null, {key: key[2], value: value})
          })
        }),
        pull.filter(function (data) {
          return filter(data.value)
        })
      )
    }
  }
}
