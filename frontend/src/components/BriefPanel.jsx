import { useState, useEffect, useRef } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export default function BriefPanel({ briefText }) {
  const [displayedText, setDisplayedText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!briefText) {
      setDisplayedText('');
      return;
    }
    // Typewriter effect
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

    // Auto-launch TTS in parallel
    (async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: briefText }),
        });
        if (!res.ok) throw new Error('TTS failed');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(url);
        };
        setIsPlaying(true);
        await audio.play();
      } catch (err) {
        console.error('TTS auto-play error:', err);
      } finally {
        setIsLoading(false);
      }
    })();

    return () => clearInterval(interval);
  }, [briefText]);

  const handleSpeak = async () => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsPlaying(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: briefText }),
      });
      if (!res.ok) throw new Error('TTS failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
      };

      setIsPlaying(true);
      await audio.play();
    } catch (err) {
      console.error('TTS error:', err);
    } finally {
      setIsLoading(false);
    }
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
          disabled={isLoading}
          style={{
            background: 'none',
            border: '1px solid var(--green)',
            color: 'var(--green)',
            padding: '6px 16px',
            fontFamily: 'inherit',
            fontSize: '12px',
            cursor: isLoading ? 'wait' : 'pointer',
            transition: 'all 0.2s',
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          {isLoading ? '\u23F3 Chargement...' : isPlaying ? '\u23F9 Stop' : '\uD83D\uDD0A Play'}
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
