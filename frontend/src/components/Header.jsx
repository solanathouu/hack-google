export default function Header({ onScan, isScanning }) {
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
    </header>
  );
}
