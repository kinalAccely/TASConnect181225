// Utility: find entries where `next` contains 'aggregator'
// Supports input as an object or array of nodes.
function hasAggregatorNext(node) {
  if (!node) return false;
  const next = node.next;
  if (!next) return false;
  if (Array.isArray(next)) {
    return next.includes('aggregator');
  }
  if (typeof next === 'string') {
    return next === 'aggregator';
  }
  // handle object form: { key: 'aggregator' } or nested
  if (typeof next === 'object') {
    try {
      return Object.values(next).some(v => v === 'aggregator' || (Array.isArray(v) && v.includes('aggregator')));
    } catch (e) {
      return false;
    }
  }
  return false;
}

function findAggregatorEntries(data) {
  if (!data) return [];
  const items = Array.isArray(data) ? data : [data];
  const results = [];
  for (const item of items) {
    if (item && item.values && item.values.messages) {
      // top-level object that contains messages
      if (hasAggregatorNext(item)) results.push(item);
      // also inspect tasks array
      if (Array.isArray(item.tasks)) {
        for (const t of item.tasks) {
          if (hasAggregatorNext(t) && !results.includes(t)) results.push(t);
        }
      }
    } else if (typeof item === 'object') {
      // generic object with next
      if (hasAggregatorNext(item)) results.push(item);
    }
  }
  return results;
}

module.exports = { hasAggregatorNext, findAggregatorEntries };
