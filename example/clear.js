
var pull = require('pull-stream')
var pl = require('pull-level')

var db = require('./db')

pull(
  pl.read(db.sublevel('idx'), {
    gte: ['meta', null],
    lte: ['meta', undefined],
    values: false
  }),
  pull.map(function (key) {
    return {key: key, type: 'del'}
  }),
  pl.write(db.sublevel('idx'), function (err) {
    if(err) throw err
    console.log('deleted')
  })
)
