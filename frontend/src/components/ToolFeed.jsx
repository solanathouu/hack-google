const STATUS_ICONS = {
  running: '\u25CF',
  done: '\u2713',
  waiting: '\u25CB',
};

const PROJECT_COLORS = {
  school: '#00FF88',
  company: '#FF4444',
  startup: '#FF8800',
};

export default function ToolFeed({ toolCalls }) {
  if (!toolCalls || toolCalls.length === 0) {
    return (
      <div style={{
        background: 'var(--card-bg)',
        padding: '20px',
        borderTop: '1px solid var(--border)',
      }}>
        <h4 style={{ fontSize: '11px', color: 'var(--text-dim)', letterSpacing: '2px', marginBottom: '8px' }}>
          TOOL FEED
        </h4>
        <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
          En attente du scan...
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--card-bg)',
      padding: '20px',
      borderTop: '1px solid var(--border)',
      maxHeight: '220px',
      overflowY: 'auto',
    }}>
      <h4 style={{ fontSize: '11px', color: 'var(--text-dim)', letterSpacing: '2px', marginBottom: '12px' }}>
        TOOL FEED
      </h4>
      {toolCalls.map((tc, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '6px 0',
            fontSize: '13px',
            animation: 'slideIn 0.3s ease-out',
            animationDelay: `${i * 0.1}s`,
            animationFillMode: 'both',
          }}
        >
          <span style={{
            color: tc.status === 'done' ? '#00FF88' : tc.status === 'running' ? '#FF8800' : '#666',
            minWidth: '14px',
          }}>
            {STATUS_ICONS[tc.status] || STATUS_ICONS.waiting}
          </span>
          <span style={{ color: '#fff', minWidth: '180px', fontSize: '12px' }}>
            {tc.tool}(<span style={{ color: PROJECT_COLORS[tc.project] || '#888' }}>{tc.project}</span>)
          </span>
          <div style={{
            flex: 1,
            height: '4px',
            background: '#222',
            borderRadius: '2px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: tc.status === 'done' ? '100%' : tc.status === 'running' ? '60%' : '0%',
              height: '100%',
              background: PROJECT_COLORS[tc.project] || 'var(--green)',
              transition: 'width 0.5s ease',
            }} />
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)', minWidth: '40px', textAlign: 'right' }}>
            {tc.status === 'done' ? 'done' : tc.status === 'running' ? '...' : 'wait'}
          </span>
        </div>
      ))}
    </div>
  );
}
