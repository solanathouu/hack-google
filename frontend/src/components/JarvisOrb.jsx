const phaseStyles = {
  LOADING: {
    background: 'radial-gradient(circle, #00FF8833 0%, transparent 70%)',
    boxShadow: '0 0 40px rgba(0, 255, 136, 0.15)',
    animation: 'breathe 4s ease-in-out infinite',
    opacity: 0.4,
  },
  IDLE: {
    background: 'radial-gradient(circle, #00FF8855 0%, #00FF8811 60%, transparent 70%)',
    boxShadow: '0 0 50px rgba(0, 255, 136, 0.25), 0 0 100px rgba(0, 255, 136, 0.1)',
    animation: 'breathe 3s ease-in-out infinite',
    opacity: 0.75,
  },
  LISTENING: {
    background: 'radial-gradient(circle, #00FF8888 0%, #00FF8833 50%, transparent 70%)',
    boxShadow: '0 0 60px rgba(0, 255, 136, 0.4), 0 0 120px rgba(0, 255, 136, 0.15)',
    animation: 'listenPulse 1.5s ease-in-out infinite',
    opacity: 1,
  },
  THINKING: {
    background: 'radial-gradient(circle, #FF880088 0%, #FF880033 50%, transparent 70%)',
    boxShadow: '0 0 60px rgba(255, 136, 0, 0.4), 0 0 120px rgba(255, 136, 0, 0.15)',
    animation: 'thinkSpin 2s linear infinite',
    opacity: 0.9,
  },
  SPEAKING: {
    background: 'radial-gradient(circle, #6666ffaa 0%, #00FF8855 50%, transparent 70%)',
    boxShadow: '0 0 70px rgba(102, 102, 255, 0.4), 0 0 130px rgba(0, 255, 136, 0.2)',
    animation: 'speakPulse 0.8s ease-in-out infinite',
    opacity: 1,
  },
};

export default function JarvisOrb({ phase, onClick, isLoading }) {
  const style = phaseStyles[phase] || phaseStyles.LOADING;

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        width: '180px',
        height: '180px',
        cursor: phase === 'IDLE' || phase === 'LOADING' ? 'pointer' : 'default',
      }}
    >
      {/* Loading ring */}
      {isLoading && (
        <svg
          viewBox="0 0 200 200"
          style={{
            position: 'absolute',
            inset: '-10px',
            width: '200px',
            height: '200px',
            animation: 'orbSpin 1.8s linear infinite',
          }}
        >
          <circle
            cx="100" cy="100" r="94"
            fill="none"
            stroke="rgba(0, 255, 136, 0.15)"
            strokeWidth="2"
          />
          <circle
            cx="100" cy="100" r="94"
            fill="none"
            stroke="url(#loadGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="140 460"
          />
          <defs>
            <linearGradient id="loadGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00FF88" stopOpacity="0" />
              <stop offset="50%" stopColor="#00FF88" stopOpacity="1" />
              <stop offset="100%" stopColor="#00FF88" stopOpacity="0.3" />
            </linearGradient>
          </defs>
        </svg>
      )}

      {/* Ripple rings for LISTENING */}
      {phase === 'LISTENING' && (
        <>
          <div style={{
            position: 'absolute',
            inset: '-20px',
            borderRadius: '50%',
            border: '1px solid rgba(0, 255, 136, 0.3)',
            animation: 'ripple 2s ease-out infinite',
          }} />
          <div style={{
            position: 'absolute',
            inset: '-20px',
            borderRadius: '50%',
            border: '1px solid rgba(0, 255, 136, 0.2)',
            animation: 'ripple 2s ease-out infinite 0.6s',
          }} />
        </>
      )}

      {/* Main orb */}
      <div style={{
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        transition: 'opacity 0.5s',
        ...style,
      }} />
    </div>
  );
}
