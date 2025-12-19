import React from 'react';
import { findAggregatorEntries } from '../utils/aggregatorUtils';

export default function AggregatorCanvas({ data }) {
  const entries = findAggregatorEntries(data);

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 6, padding: 12, minHeight: 120, maxHeight: 300, overflowY: 'auto' }}>
      <h4 style={{ marginTop: 0 }}>Aggregator nodes</h4>
      {entries.length === 0 ? (
        <div style={{ color: '#666' }}>No aggregator entries found.</div>
      ) : (
        entries.map((e, idx) => (
          <div key={idx} style={{ padding: 8, borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ fontSize: 12, color: '#333', marginBottom: 6 }}>id: {e.checkpoint_id || e.id || e.name || '—'}</div>
            <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 12 }}>{JSON.stringify(e, null, 2)}</pre>
          </div>
        ))
      )}
    </div>
  );
}
