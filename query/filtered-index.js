'use strict'
var util = require('../util')
var ltgt = require('ltgt')
var deepEqual = require('deep-equal')

var LO = null
var HI = undefined

module.exports = function (db, query) {
  //choose the most indexable parameter
  //use eq instead of a range.

  var pair = query.map(function (q) {
    return {index: db.getIndex([q.path]), querypath: q}
  }).filter(function (e) { return e.index }).shift()

  if(!pair) return

  var q = pair.querypath
  var index = pair.index

  var opts

  if(q.eq)
    opts = {index: [q.path], gte: [q.eq], lte: [q.eq]}
  else {
    opts = ltgt.toLtgt(
      q, {index: index.path},
      function (value) { return [value] }
    )
  }

  opts.values = false

  util.assertDepth(opts.index, 'filteredIndex')

  return {
    opts: opts,
    query: query,
    exec: function () {
      return db.readIndex(opts, util.createFilter(query))
    }
  }
}
