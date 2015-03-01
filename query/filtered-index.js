'use strict'
var util = require('../util')
var ltgt = require('ltgt')

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
    opts = {index: [q.path], gte: [q.eq], lte: [q.eq]}
  else {
    opts = ltgt.toLtgt(q, {index: [q.path]}, function (value) { return [value] })
  }

  opts.values = false

  return {
    opts: opts,
    query: query,
    exec: function () {
      return db.readIndex(opts, util.createFilter(query))
    }
  }
}
