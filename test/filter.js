
var tape = require('tape')

var filter = require('../filter')


tape('simple', function (t) {

  var actual = [
    {foo: 1},
    {bar: 3},
    {foo: 10},
    {foo: 7}
  ].filter(filter({path: 'foo', lt: 10}))

  t.deepEqual(actual, [
    {foo: 1}, {foo: 7}
  ])

  t.end()

})

//AND is way more important than OR.
//lets not worry about OR.

tape('AND', function (t) {

  var actual = [
    {foo: 1, bar: 10},
    {bar: 3, foo: 743},
    {foo: 10, bar: true},
    {foo: 7, bar: 17}
  ].filter(filter([
      {path: 'foo', lt: 10},
      {path: 'bar', gte: 5},
    ]))

  t.deepEqual(actual, [
    {foo: 1, bar: 10}, {foo: 7, bar: 17}
  ])

  t.end()

})


tape('eq', function (t) {

  var actual = [
    {foo: 1, author: { name: 'alice'}},
    {bar: 3, author: { name: 'bob'}},
    {foo: 10,author: {  name: 'alice'}},
    {foo: 7, author: { name: 'bob'}}
  ].filter(filter([
      {path: ['author', 'name'], eq: 'alice'},
    ]))

  t.deepEqual(actual, [
    {foo: 1, author: {name: 'alice'}},
    {foo: 10, author: {name: 'alice'}}
  ])

  t.end()

})

