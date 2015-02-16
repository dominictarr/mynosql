 

function has (obj, prop) {
  return Object.hasOwnProperty.call(obj, prop)
}

//I have a feeling that hasOwnProperty is not that fast.
//maybe it would be better to select the 

module.exports = function (query, value) {

  var matches = true
  if(has(query, 'lt')   && !(value <  query.lt))   matches = false
  if(has(query, 'lte')  && !(value <= query.lte))  matches = false
  if(has(query, 'gt')   && !(value >  query.gt))   matches = false
  if(has(query, 'gte')  && !(value >= query.gte))  matches = false
  if(has(query, 'eq')   && !(value === query.eq))  matches = false
  if(has(query, 'neq')  && !(value !== query.neq)) matches = false
  if(has(query, 'ok')   && !(!!value))             matches = false
  if(has(query, 'nok')  && !(!value))              matches = false

  return matches
}
