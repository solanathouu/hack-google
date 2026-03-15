import { useState, useRef, useCallback } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:8000' : '');

// Split text into sentences (handles French and English punctuation)
function splitSentences(text) {
  const raw = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  if (!raw) return [text];
  // Merge very short fragments with previous sentence
  const sentences = [];
  for (const s of raw) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    if (sentences.length > 0 && trimmed.length < 20) {
      sentences[sentences.length - 1] += ' ' + trimmed;
    } else {
      sentences.push(trimmed);
    }
  }
  return sentences.length > 0 ? sentences : [text];
}

// Fetch TTS audio without playing — returns a blob URL
async function fetchTTSAudio(text) {
  const res = await fetch(`${BACKEND_URL}/api/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('TTS failed');
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export default function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef(null);

  // Play a single audio URL, returns a promise that resolves when done
  const playAudioUrl = useCallback((url) => {
    return new Promise((resolve) => {
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.play().catch(() => resolve());
    });
  }, []);

  // Simple speak — single TTS call (for short phrases like acknowledgments)
  const speak = useCallback(async (text) => {
    if (!text) return;
    setIsSpeaking(true);
    try {
      const url = await fetchTTSAudio(text);
      await playAudioUrl(url);
    } catch (err) {
      console.error('TTS error:', err);
    }
    setIsSpeaking(false);
  }, [playAudioUrl]);

  // Chunked speak — split into sentences, prefetch next while current plays
  const speakChunked = useCallback(async (text) => {
    if (!text) return;
    setIsSpeaking(true);

    const sentences = splitSentences(text);

    try {
      // Prefetch first sentence
      let nextAudioPromise = fetchTTSAudio(sentences[0]);

      for (let i = 0; i < sentences.length; i++) {
        // Wait for current audio to be ready
        const url = await nextAudioPromise;

        // Start prefetching next sentence while current one plays
        if (i + 1 < sentences.length) {
          nextAudioPromise = fetchTTSAudio(sentences[i + 1]);
        }

        // Play current sentence
        await playAudioUrl(url);
      }
    } catch (err) {
      console.error('TTS chunked error:', err);
    }

    setIsSpeaking(false);
  }, [playAudioUrl]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsSpeaking(false);
  }, []);

  return { speak, speakChunked, stop, isSpeaking };
}
