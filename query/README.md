
# query strategies


``` js
exports.plan = function (db, query, cb) {
  //construct a query plan, or cb null.
  cb(null, {...})
}

exports.exec = function (db, plan) {
  return pull(db.scan(), filter)
}

```
