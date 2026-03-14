export default function Header({ scanProgress, scanPhase }) {
  return (
    <header style={{
      padding: '24px 32px',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 700,
            color: 'var(--green)',
            letterSpacing: '4px',
          }}>
            &#9632; OPERATOR
          </h1>
          <p style={{
            fontSize: '12px',
            color: 'var(--text-dim)',
            marginTop: '4px',
            fontStyle: 'italic',
          }}>
            The AI Agent That Works While You Talk.
          </p>
        </div>
        {scanProgress > 0 && scanProgress < 100 && (
          <span style={{
            fontSize: '12px',
            color: 'var(--green)',
            letterSpacing: '2px',
            fontWeight: 700,
            animation: 'pulse 1.5s infinite',
          }}>
            SCANNING...
          </span>
        )}
      </div>

      {/* Progress bar */}
      {scanProgress > 0 && scanProgress < 100 && (
        <div style={{ marginTop: '16px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '6px',
          }}>
            <span style={{
              fontSize: '11px',
              color: 'var(--text-dim)',
              letterSpacing: '1px',
            }}>
              {scanPhase}
            </span>
            <span style={{
              fontSize: '11px',
              color: 'var(--text-dim)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {scanProgress}%
            </span>
          </div>
          <div style={{
            width: '100%',
            height: '6px',
            background: '#1a1a1a',
            borderRadius: '3px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${scanProgress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--green), #00cc6a)',
              borderRadius: '3px',
              boxShadow: '0 0 8px rgba(0, 255, 136, 0.4)',
            }} />
          </div>
        </div>
      )}
    </header>
  );
}
