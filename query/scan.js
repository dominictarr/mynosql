'use strict'
var util = require('../util')
var pull = require('pull-stream')
var BSS = require('binary-sorted-set')

module.exports = function (db, query) {

  var filter = util.createFilter(query)

  var indexes = query.map(function (q) {
    return {path: q.path, since: 0, data: BSS(), mem: true}
  })

  return {
    query: query,
    exec: function () {
      return pull(
        db.scan(),
        pull.filter(function (data) {
          indexes.forEach(function (index) {
            util.eachpath(index.path, data.value)
            .forEach(function (value) {
              index.data.add([value, data.key])
            })
          })
          return filter(data.value)
        })
      )
    }
  }
}
