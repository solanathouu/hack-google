import { useState, useEffect } from 'react';

export default function BriefPanel({ briefText }) {
  const [displayedText, setDisplayedText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!briefText) {
      setDisplayedText('');
      return;
    }
    setDisplayedText('');
    let i = 0;
    const interval = setInterval(() => {
      if (i < briefText.length) {
        setDisplayedText(briefText.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 12);
    return () => clearInterval(interval);
  }, [briefText]);

  const handleSpeak = () => {
    if (isPlaying) {
      speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(briefText);
    utterance.lang = 'fr-FR';
    utterance.rate = 1.1;
    utterance.pitch = 0.9;
    utterance.onend = () => setIsPlaying(false);
    speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  if (!briefText) {
    return null;
  }

  return (
    <div style={{
      background: 'var(--card-bg)',
      padding: '24px',
      borderTop: '1px solid var(--border)',
      animation: 'fadeIn 0.5s ease-out',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
      }}>
        <h4 style={{ fontSize: '11px', color: 'var(--text-dim)', letterSpacing: '2px' }}>
          BRIEF PROACTIF
        </h4>
        <button
          onClick={handleSpeak}
          style={{
            background: 'none',
            border: '1px solid var(--green)',
            color: 'var(--green)',
            padding: '6px 16px',
            fontFamily: 'inherit',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {isPlaying ? '\u23F9 Stop' : '\uD83D\uDD0A Play'}
        </button>
      </div>
      <div style={{
        fontSize: '14px',
        lineHeight: '1.7',
        whiteSpace: 'pre-wrap',
        color: '#e0e0e0',
      }}>
        {displayedText}
        {displayedText.length < (briefText?.length || 0) && (
          <span style={{ animation: 'pulse 0.8s infinite', color: 'var(--green)' }}>|</span>
        )}
      </div>
    </div>
  );
}
