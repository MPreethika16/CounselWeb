import React from 'react';

const StrategyPanel = () => {
  return (
    <div className="strategy-panel glass-card animate-up" style={{ padding: '20px' }}>
      <h3 className="strategy-panel-title" style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', color: 'var(--text-primary)' }}>
        How to Use These Options
      </h3>
      <ol className="strategy-panel-list" style={{ paddingLeft: '20px', margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
        <li style={{ marginBottom: '8px' }}>Add a few <strong>Competitive Colleges</strong>.</li>
        <li style={{ marginBottom: '8px' }}>Add more <strong>Best Matching Colleges</strong>.</li>
        <li style={{ marginBottom: '8px' }}>Keep some <strong>Backup Colleges</strong>.</li>
        <li style={{ marginBottom: '8px' }}>Arrange colleges in the order you are willing to join.</li>
      </ol>
    </div>
  );
};

export default StrategyPanel;
