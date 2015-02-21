
var tape = require('tape')
var util = require('../util')
var path = util.path

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


tape('match wildcardless globs', function (t) {

  t.deepEqual(util.glob(['foo'], {
    foo: 7
  }), [7])

  t.deepEqual(util.glob(['foo', 'bar'], {
    foo: 7
  }), [undefined])

  t.deepEqual(util.glob(['foo', 'bar'], {
    foo: {bar: 6}
  }), [6])

  t.deepEqual(util.glob(['foo'], {
    foo: 7
  }), [7])

  t.end()

})

tape('match globs', function (t) {


  t.deepEqual(util.glob([true], {
    foo: 1, bar: 2, baz: 3
  }), [1, 2, 3])

  t.deepEqual(util.glob(['level', true], {
    level: { foo: 1, bar: 2, baz: 3}
  }), [1, 2, 3])


  t.deepEqual(util.glob([true, 'level'], {
    foo: {level: 1}, bar: {level: 2}, baz: {level: 3}
  }), [1, 2, 3])

  t.end()

})

var obj = {
  foo: [
    {bar: 1},
    {bar: 2},
    {bar: 3}
  ],
  type: 'example',
  this: {that: 'self'}
}

tape('iterate globs', function (t) {


  t.deepEqual(
    util.eachpath([['this', 'that'], ['type']], obj),
    [['self', 'example']]
  )



  t.deepEqual(
    util.eachpath([['foo', true, 'bar'], ['type']], obj),
    [
      [1, 'example'],
      [2, 'example'],
      [3, 'example']
    ]
  )


  t.deepEqual(
    util.eachpath([['foo', true], ['this', 'that']], obj),
    [
      [{bar: 1}, 'self'],
      [{bar: 2}, 'self'],
      [{bar: 3}, 'self']
    ]
  )



  t.end()
})
