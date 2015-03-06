
var level = require('level-test')()
var tape = require('tape')

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

//load all the dependencies into database.

tape('query dependency database', function (t) {

  require('../example').init(db, null, function (err) {
    if(err) throw err
    t.end()
  })

})

var query = [{path: ['version'], lt: '1.0.0'}]

tape('full scan', function (t) {

  all(require('../query/scan')(db, query).exec())
    (function (err, fullScanAry) {

      fullScanAry.forEach(function (pkg) {
        t.ok(pkg.value.version < '1.0.0')
      })

      db.createIndex([['version']], function (err) {
        pull(
          require('../query/filtered-index')(db, query).exec(),
          pull.collect(function (err, ary) {
            ary.forEach(function (pkg) {
              t.ok(pkg.value.version < '1.0.0')
            })

            fullScanAry.sort(function (a, b) {
              return (
                compare(a.value.version, b.value.version) || 
                compare(a.key, b.key)
              )
            })

            t.equal(ary.length, fullScanAry.length)

            function min (e) {
              return [e.key, e.value.name, e.value.version]
            }

            t.deepEqual(ary.map(min), fullScanAry.map(min))

            t.deepEqual(ary.slice(0, 3), fullScanAry.map(function (e) {
              delete e.ts; return e
            }).slice(0, 3))

            t.end()
          })
        )

      })

    })

})

tape('compound indexes', function (t) {

  t.deepEqual(db.indexes.map(function (e) { return e.path }), [
    [['version']]
  ])

  db.createIndex([['name'], ['version']], function (err) {
    if(err) throw err

    pull(
      pl.read(db.sublevel('idx'), {
        values: false,
        gte: [[['name'], null]],
        lte: [[['name'], undefined]]
      }),
      pull.through(function (key) {
        t.deepEqual(key[0], [['name'], ['version']])
        t.equal(key[1].length, 2, 'key length is correct')
        t.ok('string' === typeof key[2], 'key[2] is a string')
      }),
      pull.collect(function (err, ary) {
        t.ok(ary.length)

        all(db.query([
          {path: ['name'], eq: 'ltgt'},
          {path: ['version'], gte: '2.0.0', lt: '3.0.0'}
        ])) (function (err, ary) {
          if(err) throw err
          t.ok(ary.length >= 1, 'found at least one module')
          ary.forEach(function (pkg) {
            t.equal(pkg.value.name, 'ltgt')
            t.ok(pkg.value.version >= '2.0.0', 'version >= 2.0.0')
            t.ok(pkg.value.version < '3.0.0', 'version < 3.0.0')
          })
          t.end()
        })
      })
    )
  })

})

tape('glob query for keyword.*', function (t) {
  var start = Date.now()
  all(db.query([
    {path: ['keywords', true], eq: 'database'}
  ], {index: false})) (function (err, ary) {
    var p = ary.filter(function (pkg) {
      return pkg.value.name === 'level'
    }).shift()
    t.equal(p.value.name, 'level')
    var scantime = Date.now() - start
    console.log('FULL SCAN TIME', scantime)
    
    db.createIndex([['keywords', true]], function (err) {
      all(pl.read(db.sublevel('idx'), {
        values: false,
        gte: [[['keywords', true]], LO],
        lte: [[['keywords', true]], HI]
      })) (function (err, ary) {
        console.log('GLOB INDEX', ary.map(JSON.stringify))

        t.ok(ary.length)
        var start = Date.now()
        all(db.query([
          {path: ['keywords', true], eq: 'database'}
        ])) (function (err, ary) {
          //check the index time is smaller than full scan time
          //although both will be small since the database is tiny.
          t.ok(Date.now() - start < scantime)
          console.log('indexed query time', Date.now() - start)
          t.end()
        })
      })
    })
  })
})


tape('build glob index in realtime', function (t) {

  db2.createIndex([['keywords', true]], function (err) {
    if(err) throw err
    pull(
      db.scan(),
      pl.write(db2, function (err) {
        all(pl.read(db.sublevel('idx'), {
            values: false,
            gte: [[['keywords', true]], LO],
            lte: [[['keywords', true]], HI]
          })) (function (err, ary) {
            console.log(ary)
            t.ok(ary.length, 'realtime index non-empty')
            t.end()
          })
      })
    )
  })
})

