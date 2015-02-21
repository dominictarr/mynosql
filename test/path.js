
var tape = require('tape')
var util = require('../util')
var path = util.path
var star = util.starpath

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


tape('match flat starpaths', function (t) {

  t.deepEqual(star(['foo'], {
    foo: 7
  }), [7])

  t.deepEqual(star(['foo', 'bar'], {
    foo: 7
  }), [undefined])

  t.deepEqual(star(['foo', 'bar'], {
    foo: {bar: 6}
  }), [6])

  t.deepEqual(star(['foo'], {
    foo: 7
  }), [7])

//  t.throws(function () {
//    starpath('string')
//  })
//
  t.end()

})

tape('match star paths', function (t) {


  t.deepEqual(star([true], {
    foo: 1, bar: 2, baz: 3
  }), [1, 2, 3])

  t.deepEqual(star(['level', true], {
    level: { foo: 1, bar: 2, baz: 3}
  }), [1, 2, 3])


  t.deepEqual(star([true, 'level'], {
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

tape('iterate starpaths', function (t) {


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
