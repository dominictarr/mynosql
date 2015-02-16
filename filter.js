var range = require('./range')
var path = require('./path')

var isArray = Array.isArray

function filter(query, data) {
  return range(query, path(query.path, data))
}

module.exports = function (query) {
  return function (data) {
    if(isArray(query)) {
      for(var i = 0; i < query.length; i++)
        if(!filter(query[i], data)) return false
      return true
    }
    return filter(query, data)
  }
}
