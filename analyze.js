
//Okay... do a scan, but count how much was wasted.

//Total read - total discarded.

//Also, calculate the data that would be used if you created an index.

// How to calculate the size an index would be?
// Calculate the amount of extra data you would need for the index:
// [indexno, value, doc_id].length
//
// + the amount you would read using that index.


function length(data) {
  return JSON.stringify(data).length
}

module.exports = function (filter) {
  var total = 0, used = 0
  return function (data) {
    var l = length(data)
    total += l
    if(filter(data)) {
      used += l
      return true
    }
    return false
  }
}

