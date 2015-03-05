'use strict'
var util = require('../util')
var pull = require('pull-stream')
var BSS = require('binary-sorted-set')
var deepEqual = require('deep-equal')
var ltgt = require('ltgt')

var LO = null, HI = undefined

module.exports = function (db, query, opts) {

  function findIndex(path) {
    return util.find(db.indexes, function (index) {
      return deepEqual(index.path, path)
    })
  }

  var filter = util.createFilter(query)

  var indexes = query.map(function (q) {
    //do not build an index if it already exists
    if(findIndex([q.path])) return

    var index
    return index = {
      path: [q.path],
      since: 0,
      data: BSS(),
      mem: true,
      read: function (opts) {
        opts = ltgt.toLtgt(opts, opts, function (value, isUpper) {
          var bound = isUpper ? HI : LO
          return [value, bound]
        })
        return pull.values(
          index.data.range(opts)
          .map(function (key) { return key[1] })
        )
      }
    }
  })
  .filter(Boolean)

  //set opts.index = false to disable indexing
  var enabled = !(opts && opts.index === false)

  return {
    query: query,
    exec: function () {
      return pull(
        db.scan(),
        pull.filter(function (data) {
          if(enabled)
           indexes.forEach(function (index) {
              util.eachpath(index.path, data.value)
              .forEach(function (value) {
                index.data.add([value, data.key])
              })
            })
          return filter(data.value)
        }),
        function (read) {
          return function (abort, cb) {
            read(abort, function (end, data) {
              if(enabled && end === true && !abort)
                indexes.forEach(function (index) {
                  if(!findIndex([index.path]))
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
