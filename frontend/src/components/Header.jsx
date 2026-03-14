export default function Header({ onScan, isScanning, authenticated, oauthAvailable, onLogin, onLogout }) {
  return (
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '24px 32px',
      borderBottom: '1px solid var(--border)',
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
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        {oauthAvailable && (
          <>
            <span style={{
              fontSize: '11px',
              color: authenticated ? 'var(--green)' : 'var(--text-dim)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: authenticated ? 'var(--green)' : 'var(--text-dim)',
                display: 'inline-block',
              }} />
              {authenticated ? 'GOOGLE CONNECTED' : 'DEMO MODE'}
            </span>
            <button
              onClick={authenticated ? onLogout : onLogin}
              style={{
                background: 'transparent',
                color: authenticated ? 'var(--text-dim)' : '#4285F4',
                border: `1px solid ${authenticated ? 'var(--border)' : '#4285F4'}`,
                padding: '8px 16px',
                fontFamily: 'inherit',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '1px',
                transition: 'all 0.2s',
              }}
            >
              {authenticated ? 'DISCONNECT' : 'CONNECT GOOGLE'}
            </button>
          </>
        )}
        <button
          onClick={onScan}
          disabled={isScanning}
          style={{
            background: isScanning ? 'var(--border)' : 'var(--green)',
            color: '#0a0a0a',
            border: 'none',
            padding: '12px 24px',
            fontFamily: 'inherit',
            fontSize: '14px',
            fontWeight: 700,
            cursor: isScanning ? 'not-allowed' : 'pointer',
            letterSpacing: '2px',
            transition: 'all 0.2s',
          }}
        >
          {isScanning ? 'SCANNING...' : 'LANCER LE SCAN'}
        </button>
      </div>
    </header>
  );
}
