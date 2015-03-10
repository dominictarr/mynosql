
var level = require('level-test')()
var tape = require('tape')
var util = require('../util')

var db = require('../')(level('test-mynosql', {encoding: 'json'}))
var db2 = require('../')(level('test-mynosql2', {encoding: 'json'}))

var pl   = require('pull-level')
var pull = require('pull-stream')

var pull = require('pull-stream')
var pl   = require('pull-level')


var LO = null
var HI = undefined

function compare (a, b) {
  return a < b ? -1 : a > b ? 1 : 0
}

var all = function (stream, cb) {
  if('function' === typeof cb) return go(cb)

  function go (cb) {
    pull(stream, pull.collect(cb))
  }

  return go
}

function _pluck (name) {
  return function (it) { return it[name] }
}


function test (query, strategies, asserts) {

  var qstr =  JSON.stringify(query)

  var ary
  tape('setup: ' + qstr, function (t) {

    db.wipeIndexes(function (err) {
      pull(
        db.query(query), //will scan, and build indexes.
        pull.collect(function (err, _ary) {
          ary = _ary
          t.ok(ary.length)
          t.end()
        })
      )
    })
  })

  strategies.forEach(function (strategy) {

    tape(strategy + '('+qstr+')', function (t) {
      db.plan(query, {}) (function (err, plans) {
        var plan = util.find(plans, function (e) {
          return e.name === strategy
        })
        t.ok(plan, 'found plan for:' + strategy)
        pull(plan.exec(), pull.collect(function (err, _ary) {
          t.deepEqual(
            _ary.map(_pluck('key')).sort(),
            ary.map(_pluck('key')).sort()
          )
          if(asserts) asserts(t, _ary, ary)
          t.end()
        }))
      })
    })
  })
}

//load all the dependencies into database.

tape('query dependency database', function (t) {

  require('../example').init(db, null, function (err) {
    if(err) throw err
    t.end()
  })

})

var query = [{path: ['version'], lt: '1.0.0'}]


test(
  [{path: ['version'], lt: '1.0.0'}], 
  ['filtered']
)

test([
    {path: ['name'], eq: 'ltgt'},
    {path: ['version'], gte: '2.0.0', lt: '3.0.0'}
  ],
  ['filtered', 'intersection']
)

test([
    {path: ['name'], eq: 'ltgt'},
    {path: ['version'], gte: '2.0.0', lt: '3.0.0'}
  ],
  ['filtered']
)

test([
    {path: ['keywords', true], eq: 'database'}
  ],
  ['filtered']
)

