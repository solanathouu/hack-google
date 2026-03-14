import { useState, useRef, useEffect, useCallback } from 'react';

export default function useSpeechRecognition({ enabled, onResult, onTimeout, timeoutMs = 15000 }) {
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);
  const timeoutRef = useRef(null);
  const enabledRef = useRef(enabled);
  const busyRef = useRef(false); // prevent double-fire of onResult
  enabledRef.current = enabled;

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition || !enabledRef.current) return;

    // Full cleanup before starting fresh
    cleanup();
    busyRef.current = false;
    setTranscript('');

    const recognition = new SpeechRecognition();
    recognition.lang = '';  // Auto-detect language
    recognition.continuous = false;
    recognition.interimResults = true;

    let finalText = '';

    recognition.onresult = (event) => {
      // Reset timeout on every result
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      let interim = '';
      finalText = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setTranscript(finalText || interim);
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      const text = finalText.trim();
      if (text && !busyRef.current) {
        busyRef.current = true;
        onResult(text);
        // Don't restart — the phase will change and re-enable us later
      } else if (enabledRef.current && !busyRef.current) {
        // No speech — restart after a pause
        setTimeout(() => {
          if (enabledRef.current) start();
        }, 500);
      }
    };

    recognition.onerror = (event) => {
      recognitionRef.current = null;
      if (event.error === 'no-speech' || event.error === 'aborted') {
        if (enabledRef.current && !busyRef.current) {
          setTimeout(() => {
            if (enabledRef.current) start();
          }, 500);
        }
      }
    };

    recognitionRef.current = recognition;

    // Silence timeout
    timeoutRef.current = setTimeout(() => {
      cleanup();
      onTimeout?.();
    }, timeoutMs);

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
    }
  }, [cleanup, onResult, onTimeout, timeoutMs]);

  useEffect(() => {
    if (enabled) {
      // Delay start to let browser release previous mic session
      const timer = setTimeout(() => start(), 300);
      return () => {
        clearTimeout(timer);
        cleanup();
        busyRef.current = false;
      };
    } else {
      cleanup();
      busyRef.current = false;
      setTranscript('');
    }
  }, [enabled, start, cleanup]);

  return { transcript };
}
