
var db = require('./db')

var path = require('../path')

var idx = db.sublevel('idx')
db.createReadStream()
  .on('data', function (d) {

    var value = path(['author', 'name'], d.value)
    idx.put(['AxN', value, d.key], '')
  })
