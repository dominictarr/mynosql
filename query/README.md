
# query strategies

Each query strategy should expose an api like this:
The query returns a plan, and then the database decides which query to execute.
It's important that constructing the plan does not allocate or use significant resources.

``` js
module.exports = function (db, query, cb) {
  //construct a query plan, and return an object describing it
  //with an execute method
  return {
    exec: function (db, plan) {
      return pull(db.scan(), filter)
    }
  }
}
```
