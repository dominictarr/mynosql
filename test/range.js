var tape = require('tape')

var range = require('../range')


tape('test range', function (t) {

  t.equal(range({gt: 6}, 7),  true)
  t.equal(range({gte: 6}, 6), true)
  t.equal(range({gt: 6}, 6),  false)
  t.equal(range({gte: 6}, 5), false)

  t.equal(range({lt: 6}, 6),  false)
  t.equal(range({lte: 6}, 7), false)
  t.equal(range({lt: 6}, 5),  true)
  t.equal(range({lte: 6}, 6), true)

  t.end()

})
