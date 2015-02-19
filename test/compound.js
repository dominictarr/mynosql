
var LO = null
var HI = undefined
var tape = require('tape')

var compound = require('../query/compound-index')

var indexes = [
  {path: [['name']]},
  {path: [['version']]},
  {path: [['name'], ['version']]}
]

var mockDb = {indexes: indexes}

tape('plan query with compound index', function (t) {

  var plan = compound(mockDb, [
    {path: ['name'], eq: 'mynosql'},
    {path: ['version'], gte: '1.0.0', lt: '2.0.0'}
  ])

  t.deepEqual(plan.opts, {
    gte:
      [[['name'], ['version']], ['mynosql', '1.0.0'], LO],
    lt:
      [[['name'], ['version']], ['mynosql', '2.0.0'], HI],
  })

  console.log(JSON.stringify(plan))

  t.end()

})
