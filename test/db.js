
var level = require('level-test')()
var tape = require('tape')

var db = require('../')(level('test-mynosql', {encoding: 'json'}))

var pl   = require('pull-level')
var pull = require('pull-stream')
var pfs  = require('pull-fs')
var glob = require('pull-glob')

var createHash = require('crypto').createHash

function hash(o) {
  return createHash('sha256')
    .update(JSON.stringify(o))
    .digest().slice(0, 20).toString('base64')
}

function compare (a, b) {
  return a < b ? -1 : a > b ? 1 : 0
}

//load all the dependencies into database.

tape('query dependency database', function (t) {

  pull(
    glob('**/package.json'),
    pfs.readFile(JSON.parse),
    pull.map(function (pkg) {
      return {key: hash(pkg), value: pkg, type: 'put'}
    }),
    pl.write(db, function (err) {
      if(err) throw err
      t.end()
    })
  )

})

var query = [{path: ['version'], lt: '1.0.0'}]

tape('full scan', function (t) {

  pull(
    require('../query/scan')(db, query).exec(),
    pull.collect(function (err, fullScanAry) {

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
  )

})

tape('compound indexes', function (t) {

  t.deepEqual(db.indexes.map(function (e) { return e.path }), [
    [['version']]
  ])

  db.createIndex([['name'], ['version']], function (err) {
    pull(
      pl.read(db.sublevel('idx'), {
        values: false,
        gte: [['name'], undefined],
        lte: [['name'], null]
      }),
      pull.through(function (key) {
        t.deepEqual(key[0], [[['name'], ['version']]])
        t.ok(key[1].length, 2)
        t.ok('string' === typeof key[2])
        console.log(JSON.stringify(key))
      }),
      pull.drain(null, function (err) {

        pull(
          db.query([
            {path: ['name'], eq: 'ltgt'},
            {path: ['version'], gte: '2.0.0', lt: '3.0.0'}
          ]),
          pull.collect(function (err, ary) {
            if(err) throw err
            console.log(ary)
            t.ok(ary.length >= 1)
            ary.forEach(function (pkg) {
              t.equal(pkg.value.name, 'ltgt')
              t.ok(pkg.value.version >= '2.0.0')
              t.ok(pkg.value.version < '3.0.0')
            })
            t.end()
          })
        )
      })
    )
  })

})
