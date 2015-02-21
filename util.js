'use strict'
var has = exports.has = function (obj, prop) {
  return Object.hasOwnProperty.call(obj, prop)
}

var isString = exports.isString = function (s) {
  return 'string' === typeof s
}

var isUndef = exports.isUndef = function isUndef (u) {
  return 'undefined' === typeof u
}


var find = exports.find = function (ary, test) {
  for(var i = 0; i < ary.length; i++)
    if(test(ary[i], i, ary)) return ary[i]
}

var first = exports.first = function (ary, map) {
  for(var i = 0; i < ary.length; i++) {
    var v = map(ary[i], i, ary)
    if(v) return v
  }
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

var starpath = exports.starpath = function (path, obj) {

  if(isString(path)) path = [path]//throw new Error('path must be array')

  var collection = []

  ;(function recurse(obj, i) {
    console.log(i, obj, path)
    if(path.length <= i) collection.push(obj)
    else if(path[i] === true) {
      for(var k in obj)
        recurse(obj[k], i + 1)
    }
    else if(obj != null)
      recurse(obj[path[i]], i + 1)
  })(obj, 0)

  return collection

}

var eachpath = exports.eachpath = function (paths, value) {
  if(isString(paths[0])) paths = [paths]
  var values = paths.map(function (p) {
    return starpath(p, value)
  })

  var maxlen = values.reduce(function (M, a) {
    return Math.max(M, a.length)
  }, 0)

  var o = new Array(maxlen)
  for(var i = 0; i < maxlen; i++) o[i] = []

  values.forEach(function (a, j) {
    for(var i = 0; i < maxlen; i++) {
      o[i][j] = a[i%a.length]
    }
  })
  return o
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
  return starpath(query.path, data).some(function (value) {
    return range(query, value)
  })
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

