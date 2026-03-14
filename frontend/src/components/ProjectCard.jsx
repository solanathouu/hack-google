const STATUS_CONFIG = {
  STANDBY: { label: 'STANDBY', bg: '#222', color: '#666' },
  READY: { label: 'READY', bg: '#00FF8822', color: '#00FF88' },
  URGENT: { label: 'URGENT', bg: '#FF444433', color: '#FF4444' },
  SIGNAL: { label: 'SIGNAL', bg: '#FF880033', color: '#FF8800' },
};

export default function ProjectCard({ project, status, alerts }) {
  const st = STATUS_CONFIG[status] || STATUS_CONFIG.STANDBY;

  return (
    <div style={{
      background: 'var(--card-bg)',
      borderLeft: `4px solid ${project.color}`,
      padding: '20px',
      flex: 1,
      minWidth: '250px',
      animation: status !== 'STANDBY' ? 'fadeIn 0.5s ease-out' : 'none',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
      }}>
        <span style={{ fontSize: '11px', color: 'var(--text-dim)', letterSpacing: '2px' }}>
          PROJECT
        </span>
        <span style={{
          fontSize: '11px',
          fontWeight: 700,
          padding: '4px 10px',
          background: st.bg,
          color: st.color,
          letterSpacing: '1px',
          animation: status === 'URGENT' ? 'pulse 1.5s infinite' : 'none',
        }}>
          {st.label}
        </span>
      </div>

      <h3 style={{ fontSize: '16px', color: '#fff', marginBottom: '8px' }}>
        {project.name}
      </h3>

      {project.contact && (
        <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '12px' }}>
          {project.contact}
        </p>
      )}

      {alerts && alerts.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {alerts.map((alert, i) => (
            <li key={i} style={{
              fontSize: '12px',
              color: st.color,
              padding: '6px 0',
              borderTop: '1px solid var(--border)',
              animation: 'slideIn 0.3s ease-out',
              animationDelay: `${i * 0.15}s`,
              animationFillMode: 'both',
            }}>
              {alert}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
