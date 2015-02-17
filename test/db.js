
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
      console.log('written')

      db.createIndexes([['name'], ['version']], function (err) {
        pull(
          db.query([{path: ['version'], lt: '1.0.0'}]),
          pull.collect(function (err, ary) {
            ary.forEach(function (pkg) {
              t.ok(pkg.version < '1.0.0')
            })

            pull(
              db.query([{path: ['name'], gte: 'c'}]),
              pull.collect(function (err, ary) {
                ary.forEach(function (pkg) {
                  t.ok(pkg.name >= 'c')
                })
                t.end()
              })
            )

          })
        )
      })
    })
  )

})
