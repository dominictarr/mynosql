
function isString(s) {
  return 'string' === typeof s
}

module.exports = function (path, obj) {

  if(isString(path))
    return obj[path]

  var l = path.length

  for(var i = 0; i < l; i++) {
    obj = obj[path[i]]
    if(null == obj) return obj
  }

  return obj
}

