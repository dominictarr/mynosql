var join = require('path').join

var pull      = require('pull-stream')
var pfs       = require('pull-fs')
var glob      = require('pull-glob')
var pl        = require('pull-level')
var stringify = require('pull-stringify')
var toPull    = require('stream-to-pull-stream')
var level     = require('level')
var mynosql   = require('../')

var createHash = require('crypto').createHash

function hash(o) {
  return createHash('sha256')
    .update(JSON.stringify(o))
    .digest().slice(0, 20).toString('base64')
}

exports.init = function (db, dir, cb) {
  if(Array.isArray(dir)) dir = dir[0]
  pull(
    glob(join(dir || join(__dirname, '..'), '**/package.json')),
    pfs.readFile(JSON.parse),
    pull.map(function (pkg) {
      process.stderr.write('.')
      return {key: hash(pkg), value: pkg, type: 'put'}
    }),
    pl.write(db, function (err) {
      cb(err)
    })
  )
}

var splitter = /(<=|<|>=|>|!=|=|[?])/

var operators = {
  "<=": "lte",
  "<" : "lt",
  ">=": "gte",
  ">" : "gt",
  "=" : "eq",
  '!=': "neq",
  "?" : 'ok'
}


function parse (str) {
  return str
    .split(',')
    .map(function (subquery) {
      //split on operator
      subquery = subquery.split(splitter).map(function (s) {
        return s.trim()
      })
      var q = {
        path: subquery.shift().split('.').map(function (e) {
          return e === '*' ? true : e
        })
      }
      while(subquery.length) {
        var s
        var op = operators[s = subquery.shift()]
        if(!op)
          throw new Error(s + 'is not a valid operator, expected: < <= > >= or =')
        if(!subquery[0])
          throw new Error('missing operand for ' + s)
        q[op] = subquery.shift()
     }
      return q
    })
}

exports.query = function (db, args) {
  var query = parse(args.join(' '))
  pull(
    db.query(query),
    stringify(),
    toPull.sink(process.stdout)
  )
}

exports.parse = function (_, args) {
  console.log(parse(args.join(' ')))
}

exports.scan = function (db) {
  pull(
    db.scan(),
    stringify(),
    toPull.sink(process.stdout)
  )

}

if(!module.parent) {

  var dir = '/tmp/mynosql-example'

  var db = mynosql(level(dir, {encoding: 'json'}))

  var cmd = process.argv[2]

  function done (err) {
    if(err) throw err
  }

  if(exports[cmd]) exports[cmd](db, process.argv.slice(3), done)
  else             exports.query(db, process.argv.slice(2), done)
}
