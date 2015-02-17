// delay a callback until an async operation has completed.

module.exports = function (setup) {
  var ready = false, waiting = []
  setup(function (err) {
    ready = true
    while(waiting.length) waiting.shift()(err)
  })

  return function (cb) {
    if(ready) return cb()
    waiting.push(cb)
  }
}
