var level = require('level')
var sublevel = require('level-sublevel/bytewise')

module.exports = sublevel(level('/tmp/mynosql-npm-example', {encoding: 'json'}))

