
var fs = require('fs')

var db = require('./db')

var JSONStream = require('JSONStream')

fs.createReadStream(process.argv[2])
  .pipe(JSONStream.parse(['rows', true, 'doc', 'versions', true]))
  .on('data', function (d) {
    if(Math.random() < 0.01)
      console.log(d.name + '@' + d.version)
    db.put(d.name + '@' + d.version, d)
  })

