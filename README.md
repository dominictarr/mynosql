# mynosql

Arbitary WHERE queries for leveldb.

[levelup#283](https://github.com/rvagg/node-levelup/issues/283)

mynosql currently supports SQL-like where queries with over manual indexes.
Queries are specified via a simple AND format with
`eq`, `neq`, `lt`, `gt`, `lte`, `gte` operators and paths into objects.

Currently, indexes must be created manually, although clever
automatic indexing should be possible.

## Example

Pass a new leveldb instance to mynosql.

``` js
var level = require('level')
var mynosql = require('mynosql')

var db = mynosql(level(pathToDb, {encoding: 'json'}))

//add data...
db.put(...)

//create an index for author name.
db.createIndex([['author', 'name']], function () {
  //query an index with pull streams.
  //all records where doc.author.name === 'Dominic Tarr'
  pull(
    db.query([
      {path: ['author', 'name'], eq: 'Dominic Tarr'}
    ]),
    pull.drain(console.log)
  )
})
```


## api

### put, del, batch

Familiar levelup methods are available and work as before.

### query (q)

query the database. `q` should be an array of path + operator objects.

you must provide at least one operator.
Upper bound (lt, lte) and Lower Bound (gt, gte) may be used together.
equality operators (eq, neq) should be used alone.

``` js
var validQuery = [
  {
    path: [...], //an array of strings into the object.

    // *** and at least ONE of the following ***
    gt:  value, //greater than <value>
    gte: value, //greater than or equal to <value>
    lt:  value, //less than <value>
    lte: value, //less than or equal to <value>
    eq:  value, //equal to <value>
    neq: value  //not equal to <value>
  },
  ... //multiple subqueries may be provided.
      //records returned will satisfy at all the queries.
]
```

paths _may_ contain wildcards - currently only the simplest wildcard
is supported (true) which matches every key. [JSONStream](https://github.com/dominictarr/JSONStream)
is a popular module that behaves the same.

### createIndex (paths); createIndexes (pathsArray)

To make queries fast, indexes are necessary.
An index is a ordered lookup that maps from the path into the value,
the value at the point, back to the original record.
So to create an index, you must pass in a path into the records.
This can then be used to read less data for queries involving that path,
which means the query will not take as long.

All indexes are expressed as compound indexes, so pass in an array of paths into your data.
example, if you have data with a nest property `{author: {name: 'bob', email: 'bob@bob.io'}}`
and you want to retrive records by `author.name`, create an index with
the call `db.createIndex([['author', 'name']], cb)`

`cb` is called when the index has been created. After this point,
all new data added will also be indexed.

Multiple indexes can be created at once using `db.createIndexes`.
To create an index the entire database must be scanned,
but this means at least it's only scanned once.

``` js
//create a single index
db.createIndex(['author', 'name'], cb)

//create multiple indexes
db.createIndexes([['author', 'name'], ['scripts', 'test']], cb)

//create a compound index (index pairs of properties)
db.createIndex([['name'], ['version']], cb)

//create an index with a wildcard glob.
//this matches all values inside keywords: [...]
db.createIndex([['keywords', true]], cb)

//NOTE, you cannot create compound indexes of two glob paths.
//but a compound index with one glob path is okay.

```

### Query Strategies

Deciding how to efficently execute a query is essentially an AI problem.
It depends on statistical properties in the data, and on what indexes are available.

#### Filtered Scan

The simplest and least efficient strategy is to scan through the entire
database and filter out all records that do not match the query.
Although this is very inefficent it's also very simple, and gives the correct answer.
All other strategies may be considered to be optimizations on this strategy.

#### Filtered Index

Given an index on one of the paths in your query, read from that index,
and then filter out records that do not match the other paths.
If that subquery is an `eq` operator, then this may limit the data read
significantly, And thus be a fairly optimizable query.

#### Compound Index

If a query has at least two parts, and at all but one of them uses `eq`
operator, then you can look up that data using a single compound index.
Creating a compound index is more expensive, but it is most optimal,
and means filtering may be unnecessary.

#### Merged Indexes (not yet implemented)

For a two part query that has two available indexes,
each index can be read and then merged. In some cases, this may
read less data than Filtered Index strategy.

## License

MIT
