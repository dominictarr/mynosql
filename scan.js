var pl   = require('pull-level')
var pull = require('pull-stream')
var path = require('./path')

module.exports = function (db, query, cb) {

  if(!cb) throw new Error('mynosql.scan: must provide callback')

  var batch = [], maxTs = 0

  pull(
    db.scan(),
    pull.filter(function (data) {
      maxTs = Math.max(data.ts, maxTs)
      query.forEach(function (subquery) {
        batch.push({
          key: [subquery.path, path(subquery.path, data.value), data.key],
          value: '', type: 'put'
        })
      })
    }),
    pull.drain(null, function (err) {
      var batch = []
      query.forEach(function (index) {
        batch.push({
          key: index.path, value: maxTs,
          prefix: db.sublevel('meta'), type: 'put'
        })
      })
      db.sublevel('idx').batch(batch, cb)
    })
  )

}
