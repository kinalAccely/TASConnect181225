Aggregator helper and canvas

This small utility helps find entries in your Loop/Run data whose `next` points to the `aggregator` node and renders them.

Files added:
- `src/utils/aggregatorUtils.js` - find entries where `next` contains 'aggregator'.
- `src/components/AggregatorCanvas.jsx` - React component that renders matched entries.

Usage (Node):

const { findAggregatorEntries } = require('./src/utils/aggregatorUtils');
const data = require('./path/to/your.json');
console.log(findAggregatorEntries(data));

Usage (React):

import AggregatorCanvas from './src/components/AggregatorCanvas';

function App() {
  const data = /* fetch or import the JSON object shown in your attachment */;
  return <AggregatorCanvas data={data} />;
}
