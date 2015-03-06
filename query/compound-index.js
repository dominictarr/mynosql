'use strict'
var LO = null
var HI = undefined
var util = require('../util')
var ltgt = require('ltgt')
var deepEqual = require('deep-equal')

module.exports = function Compound (db, query) {

  // the query must have an eq and a range/eq

  // say: name @ version

  /*
  okay so this:

    db.query([
      {path: ['name'], eq: 'mynosql'},
      {path: ['version'], gte: '1.0.0', lt: '2.0.0'}
    ])

  gets compared to this:

  [
    ...,
    {path: [['name'], ['version']], since:...},
    ...
  ]

  needs to become this:

    pl.read(db, {
      gte:
        [[['name'], ['version']], ['mynosql', '1.0.0'], LO],
      lt:
        [[['name'], ['version']], ['mynosql', '2.0.0'], HI],
    })

  */

  //iterate over the indexes, and check if this index have > 1

  return util.first(db.indexes, function (index) {

    //don't bother if this index has more values than the query.
    if(index.path.length > query.path) return

    //don't use this strategy for single indexes
    if(index.path.length <= 1) return

    var l = index.path.length

    var querypath = [], opts = {index: index.path, values: false}

    for(var i = 0; i < l; i++) {
      var last = i == l - 1
      //try and find a subquery that matches this path.
      var subquery = util.find(query, function (p) {
        return deepEqual(p.path, index.path[i])
      })

      if(!subquery) return

      if(util.has(subquery, 'eq'))
        querypath[i] = subquery.eq
      else if(last)
        opts = ltgt.toLtgt(subquery, opts, function (e, hi) {
          return querypath.concat(e)
        }, LO, HI)
      else
        return false //couldn't use this index.
    }

    //if the query didn't end in a range...
    if(!opts)
      opts.gte = opts.lte = querypath

    return {
      opts: opts,
      index: index,
      compound: true,
      exec: function () {
        opts.index = index.path
        return db.readIndex(opts, util.createFilter(query))
      }
    }
  })

}
