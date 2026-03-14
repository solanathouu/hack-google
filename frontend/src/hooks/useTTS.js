import { useState, useRef, useCallback } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export default function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef(null);

  const speak = useCallback(async (text) => {
    if (!text) return;
    setIsSpeaking(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error('TTS failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      return new Promise((resolve) => {
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
          resolve();
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
          resolve();
        };
        audio.play().catch(() => {
          setIsSpeaking(false);
          resolve();
        });
      });
    } catch (err) {
      console.error('TTS error:', err);
      setIsSpeaking(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking };
}
