import OppyFace from './OppyFace';

const phaseStyles = {
  LOADING: {
    background: 'radial-gradient(circle, rgba(66,133,244,0.2) 0%, transparent 70%)',
    boxShadow: '0 0 40px rgba(66,133,244,0.1)',
    animation: 'breathe 4s ease-in-out infinite',
    opacity: 0.4,
  },
  IDLE: {
    background: 'radial-gradient(circle, rgba(66,133,244,0.35) 0%, rgba(161,66,244,0.15) 50%, transparent 70%)',
    boxShadow: '0 0 50px rgba(66,133,244,0.2), 0 0 100px rgba(161,66,244,0.08)',
    animation: 'breathe 3s ease-in-out infinite',
    opacity: 0.75,
  },
  LISTENING: {
    background: 'radial-gradient(circle, rgba(66,133,244,0.5) 0%, rgba(161,66,244,0.25) 50%, transparent 70%)',
    boxShadow: '0 0 60px rgba(66,133,244,0.35), 0 0 120px rgba(161,66,244,0.12)',
    animation: 'listenPulse 1.5s ease-in-out infinite',
    opacity: 1,
  },
  THINKING: {
    background: 'radial-gradient(circle, rgba(161,66,244,0.5) 0%, rgba(244,57,160,0.25) 50%, transparent 70%)',
    boxShadow: '0 0 60px rgba(161,66,244,0.35), 0 0 120px rgba(244,57,160,0.12)',
    animation: 'thinkSpin 2s linear infinite',
    opacity: 0.9,
  },
  SPEAKING: {
    background: 'radial-gradient(circle, rgba(66,133,244,0.55) 0%, rgba(161,66,244,0.35) 40%, rgba(244,57,160,0.15) 70%, transparent 80%)',
    boxShadow: '0 0 70px rgba(66,133,244,0.3), 0 0 130px rgba(161,66,244,0.15)',
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
            position: 'absolute', inset: '-10px', width: '200px', height: '200px',
            animation: 'orbSpin 1.8s linear infinite',
          }}
        >
          <circle cx="100" cy="100" r="94" fill="none" stroke="rgba(66,133,244,0.1)" strokeWidth="2" />
          <circle
            cx="100" cy="100" r="94" fill="none" stroke="url(#geminiGrad)"
            strokeWidth="2.5" strokeLinecap="round" strokeDasharray="140 460"
          />
          <defs>
            <linearGradient id="geminiGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4285f4" stopOpacity="0" />
              <stop offset="40%" stopColor="#4285f4" stopOpacity="1" />
              <stop offset="70%" stopColor="#a142f4" stopOpacity="1" />
              <stop offset="100%" stopColor="#f439a0" stopOpacity="0.3" />
            </linearGradient>
          </defs>
        </svg>
      )}

      {/* Ripple rings for LISTENING */}
      {phase === 'LISTENING' && (
        <>
          <div style={{
            position: 'absolute', inset: '-20px', borderRadius: '50%',
            border: '1px solid rgba(66,133,244,0.3)',
            animation: 'ripple 2s ease-out infinite',
          }} />
          <div style={{
            position: 'absolute', inset: '-20px', borderRadius: '50%',
            border: '1px solid rgba(161,66,244,0.2)',
            animation: 'ripple 2s ease-out infinite 0.6s',
          }} />
        </>
      )}

      {/* Glow background */}
      <div style={{
        width: '100%', height: '100%', borderRadius: '50%',
        transition: 'opacity 0.5s',
        ...style,
      }} />

      {/* Oppy face SVG — centered, fills the orb */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '140px',
        height: '140px',
      }}>
        <OppyFace phase={phase} size={140} />
      </div>
    </div>
  );
}
