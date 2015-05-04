var level = require('level-test')();
db = require('../')(level('wrong', {encoding: 'json'}));

var pull = require('pull-stream');

var batch = [ {
  type: 'put',
  key: 'david',
  value: {
    books: [{name:'foo'}, {name: 'baz'}],
    collaborators: [{name: 'richard'}, {name: 'george'}]
  }
}, {
  type: 'put',
  key: 'george',
  value: {
    books: [{name:'foo2'}, {name:'baz2'}],
    collaborators: [{name:'john'}, {name:'schwartz'}]
  }
}];

db.batch(batch, function(err) {
  db.createIndex([['books', 'name']], function(err) {
    if(err) throw err
    pull(
      db.query([
        {path: ['books', 'name'], eq: 'foo'}
      ]),
      pull.drain(console.log, function (err, a) {
        console.log('end', err, a)
      })
    );
  });
});

