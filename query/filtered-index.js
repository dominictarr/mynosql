'use strict'
var util = require('../util')
var ltgt = require('ltgt')
var deepEqual = require('deep-equal')

var LO = null
var HI = undefined

module.exports = function (db, query) {
  //choose the most indexable parameter
  //use eq instead of a range.

  var opts = util.first(query, function (q) {
    var index = db.getIndex([q.path])
    if(!index) return
    return util.toIndexable(q)
  })

  if(!opts) return

  opts.values = false

  util.assertDepth(opts.path, 'filteredIndex')

  return {
    opts: opts,
    query: query,
    name: 'filtered',
    exec: function () {
      return db.readIndex(opts, util.createFilter(query))
    }
  }
}
