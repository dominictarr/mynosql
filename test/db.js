

var db = require('../')(
    require('level')
      ('/tmp/test-mynosql', {encoding: 'json'})
  )

var pl   = require('pull-level')
var pull = require('pull-stream')
var pfs  = require('pull-fs')
var glob = require('pull-glob')

//load all the dependencies into database.

pull(
  glob('**/package.json'),
  pfs.readFile(JSON.parse),
  pull.map(function (pkg) {
    return {key: pkg.name + '@' + pkg.version, value: pkg, type: 'put'}
  }),
  pl.write(db, function (err) {
    if(err) throw err
    console.log('written')

    db.createIndexes([['name'], ['version']], function (err) {
      pull(
        db.query([{path: ['version'], eq: '1.0.0'}]),
        pull.drain(console.log)
      )
    })
  })
)


