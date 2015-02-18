
var createFilter = require('../filter')
var pull = require('pull-stream')

module.exports = function (db, query) {

  var filter = createFilter(query)
  return {
    query: query,
    exec: function () {
      return pull(
        db.scan(),
        pull.filter(function (e) {
          return filter(e.value)
        })
      )
    }
  }
}
