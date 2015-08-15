var test = require('tape')
var parse = require('mynosql-query')
var pull = require('pull-stream')
var level = require('level')
var sublevel = require('level-sublevel')
var fs = require('fs')

try{
  fs.mkdirSync('testdata')
} catch(err){}

var _db = sublevel(level('./testdata', {encoding: 'json'}))
var db = require('../')(_db)

test('create index', function(t){

  t.plan(1)

  db.createIndex([['first']], function(err){
    
    t.equals(err, null)

    t.end()

  })


})

test('put data', function(t){
  
  t.plan(1)

  var data = {}
  data.first = 'johnny' 
  data.last = 'script'
  data.phone = '555-555-5555'
  data.email = 'mostmodernist@gmail.com'
  data.id = 'abc' + Date.now()

  db.put(data.id, data, function(err){
    t.equals(err, null)
    t.end()
  })
  
})

test('query index', function(t){
  t.plan(1)

  pull(
    db.query(parse('first=johnny')),
    pull.collect(function(d){
      t.ok(true, 'did it not error?')
      t.end()
    })
  )
})

