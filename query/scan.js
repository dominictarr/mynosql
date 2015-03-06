'use strict'
var util = require('../util')
var pull = require('pull-stream')
//var BSS = require('binary-sorted-set')
//var deepEqual = require('deep-equal')
//var ltgt = require('ltgt')

var createMemIndex = require('../indexes/memory')

var LO = null, HI = undefined

module.exports = function (db, query, opts) {

  var filter = util.createFilter(query)

  //set opts.index = false to disable indexing
  var enabled = !(opts && opts.index === false)

  //get indexes to be built.
  var indexes = query.map(function (q) {
    return db.getIndex([q.path]) ? null : createMemIndex([q.path])
  }).filter(Boolean)

  return {
    query: query,
    exec: function () {
      return pull(
        db.scan(),
        pull.filter(function (data) {
          if(enabled)
            indexes.forEach(function (index) {
              if(index.post) index.post(data)
            })
          return filter(data.value)
        }),
        function (read) {
          return function (abort, cb) {
            read(abort, function (end, data) {
              if(enabled && end === true && !abort)
                indexes.forEach(function (index) {
                  if(!db.getIndex(index.path))
                    db.indexes.push(index)
                })
              cb(end, data)
            })
          }
        }
      )
    }
  }
}
