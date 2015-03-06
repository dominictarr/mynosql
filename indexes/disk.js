
var util = require('../util')
var ltgt = require('ltgt')
var pull = require('pull-stream')
var pl   = require('pull-level')

var HI = undefined
var LO = null

module.exports = function (db, path) {

  util.assertDepth(path, 'createDiskIndex')

  var index = {
    path: path,
    read: function (opts) {
      opts = ltgt.toLtgt(opts, opts, function (value, isUpper) {
        var bound = isUpper ? HI : LO
        return [path, value, bound]
      })
      return pull(
        pl.read(db.sublevel('idx'), opts),
        pull.map(function (e) {
          return e[2]
        })
      )
    },
    pre: function (data) {
      return util.eachpath(path, data.value)
        .map(function (values) {
          if(!values.length) return
          if(!values.every(util.isUndef))
            return {
              key: [path, values, data.key], value: '', type: 'put'
            }
        }).filter(Boolean)
    }
  }

  return index
}
