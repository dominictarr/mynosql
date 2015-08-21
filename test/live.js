
var level = require('level-test')()
var tape  = require('tape')
var pl    = require('pull-level')
var pull  = require('pull-stream')
var cat   = require('pull-cat')
var db = require('../')(level('test-mynosql', {encoding: 'json'}))

tape('realtime queries', function (t) {

  var expected = 0, actual = 0, aCount = 0, eCount = 0, done = false
  var a = [], e = [], sync = false, onSync

  function checkDone () {
    console.log(done, eCount, aCount)
    if(aCount === eCount && done && sync) {
      t.equal(expected, actual)
      t.deepEqual(e, a)
      t.ok(sync)
      return t.end(), false
    }
  }

  function query(){
    pull(
      db.query({
        query: [
          {path: ['random'], gt: 0.7}
        ],
        live: true, sync: true
      }),
      pull.drain(function (data) {
        console.log(data)
        if(data.sync) return sync = true, onSync()

        actual += data.value.random
        aCount ++
        a.push(data.value.count)
        checkDone()
      })
    )
  }

  pull(
    cat([pull.count(50), function (abort, cb) {
      query()
      onSync = function () { cb(true) }
    }, pull.count(30)]),
    pull.map(function (n) {
      return {key: n, value: {random: Math.random(), count: n}, type: 'put'}
    }),
    pull.through(function (data) {
      if(data.value.random > 0.7) {
        eCount ++
        expected += data.value.random
        e.push(data.value.count)
      }
    }),
    pl.write(db, function (err) {
      if(err) throw err
      t.ok(eCount > 10, 'count')
      t.ok(true, 'written')
      t.notOk(err)
      console.log('done')
      done = true
      checkDone()
    })
  )
})
