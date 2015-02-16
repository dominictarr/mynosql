
var db = require('./db')
var pull = require('pull-stream')

var query = [
    {path: ['author', 'name'], eq: 'Dominic Tarr'},
    {path: 'version', eq: '1.0.0'},
//    {path: ['scripts', 'test'], neq: null},
//    {path: ['dist', 'shasum'], eq: '4822c65c545d3f08e0d461356faa4c31bdea6496'},
  ]

var scan = require('../scan')

pull(
  scan(db, query, function (err, data) {
    //get the best index and add it to the database.
    var min
    console.error(data.indexes.map(function (e) {
      var o = {}; for(var k in e) o[k] = e[k]; delete o.index
      o.accuracy = (data.reads / o.matched) * 100
      o.precision = (o.matched / data.count) * 100
      return o
    }))
    data.indexes.forEach(function (index) {
      if(!min || min.matched > index.matched)
        min = index
    })
    var index = min.index.map(function (e) {
      return {key: e, value: '', type: 'put'}
    })
    index.push({
      key: ['meta', min.path], value: Date.now(), type: 'put'
    })
    db.sublevel('idx').batch(index, function (err) {
      console.error('wrote index:', min.path, index.length)
    })
  }),
  pull.drain(console.error)
)

