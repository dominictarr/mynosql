
var tape = require('tape')
var path = require('../path')

tape('match paths', function (t) {

  t.equal(path(['foo'], {
    foo: 7
  }), 7)

  t.equal(path(['foo', 'bar'], {
    foo: 7
  }), undefined)

  t.equal(path('foo', {
    foo: 7
  }), 7)

  t.end()

})


