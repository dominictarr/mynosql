var ltgt = require('ltgt')
var pull = require('pull-stream')
var BSS = require('binary-sorted-set')
var util = require('../util')

var LO = null
var HI = undefined

module.exports = function (path) {

  util.assertDepth(path, 'createMemIndex')

  var table = BSS()
  var index = {
    path: path,
    since: 0,
    mem: true,
    read: function (opts) {
      opts = ltgt.toLtgt(opts, opts, function (value, isUpper) {
        var bound = isUpper ? HI : LO
        return [value, bound]
      })
      return pull.values(
        table.range(opts)
        .map(function (key) { return key[1] })
      )
    },

    // the data is already written. mutate the index.
    // this should be a sync function,
    // that mutates the indexes actual data.

    post: function (data) {
      util.eachpath(path, data.value)
      .forEach(function (value) {
        table.add([value, data.key])
      })
    }
  }

  return index
}
