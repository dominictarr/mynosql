

function has (obj, prop) {
  return Object.hasOwnProperty.call(obj, prop)
}

function isString(s) {
  return 'string' === typeof s
}

var find = exports.find = function (ary, test) {
  for(var i = 0; i < ary.length; i++)
    if(test(ary[i], i, ary)) return ary[i]
}


var path = exports.path = function (path, obj) {

  if(isString(path))
    return obj[path]

  var l = path.length

  for(var i = 0; i < l; i++) {
    obj = obj[path[i]]
    if(null == obj) return obj
  }

  return obj
}

exports.createInit = function (setup) {
  var ready = false, waiting = []
  setup(function (err) {
    ready = true
    while(waiting.length) waiting.shift()(err)
  })

  return function (cb) {
    if(ready) return cb()
    waiting.push(cb)
  }
}

var range = exports.range = function (query, value) {

  var matches = true
  if(has(query, 'lt')   && !(value <  query.lt))   matches = false
  if(has(query, 'lte')  && !(value <= query.lte))  matches = false
  if(has(query, 'gt')   && !(value >  query.gt))   matches = false
  if(has(query, 'gte')  && !(value >= query.gte))  matches = false
  if(has(query, 'eq')   && !(value === query.eq))  matches = false
  if(has(query, 'neq')  && !(value !== query.neq)) matches = false
  if(has(query, 'ok')   && !(!!value))             matches = false
  if(has(query, 'nok')  && !(!value))              matches = false

  return matches
}

var isArray = Array.isArray

function filter(query, data) {
  return range(query, path(query.path, data))
}

exports.createFilter = function (query) {
  return function (data) {
    if(isArray(query)) {
      for(var i = 0; i < query.length; i++)
        if(!filter(query[i], data)) return false
      return true
    }
    return filter(query, data)
  }
}
