import { useEffect, useRef, useState, useCallback } from 'react';

// Very broad matching — French STT transcribes "Oppy" in many unexpected ways
function matchesWakeWord(transcript) {
  const t = transcript.toLowerCase().replace(/[.,!?'"\-]/g, ' ').trim();
  return /opp?[iey]|au?pp?[iey]|oh? p[iey]|au pi|o[bp]+ ?[iey]|hop[iey]|op[iey]|hey op|ok op|aux? pi/.test(t);
}

export default function useWakeWord({ enabled, onDetected }) {
  const recognitionRef = useRef(null);
  const isRunningRef = useRef(false);
  const enabledRef = useRef(enabled);
  const [micActive, setMicActive] = useState(false);
  const [micError, setMicError] = useState(false);
  enabledRef.current = enabled;

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition || !enabledRef.current || isRunningRef.current) return;

    const recognition = new SpeechRecognition();
    recognition.lang = '';  // Auto-detect language
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setMicActive(true);
      setMicError(false);
    };

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (matchesWakeWord(transcript)) {
          recognition.stop();
          isRunningRef.current = false;
          setMicActive(false);
          onDetected();
          return;
        }
      }
    };

    recognition.onend = () => {
      isRunningRef.current = false;
      setMicActive(false);
      // Only restart if still enabled AND this recognition instance is still current
      if (enabledRef.current && recognitionRef.current === recognition) {
        setTimeout(() => {
          if (enabledRef.current) startListening();
        }, 300);
      }
    };

    recognition.onerror = (event) => {
      isRunningRef.current = false;
      setMicActive(false);
      if (event.error === 'not-allowed') {
        setMicError(true);
        return;
      }
      if (enabledRef.current) {
        setTimeout(() => startListening(), 500);
      }
    };

    recognitionRef.current = recognition;
    isRunningRef.current = true;
    try {
      recognition.start();
    } catch {
      isRunningRef.current = false;
      setMicActive(false);
    }
  }, [onDetected]);

  // Manual trigger — needed because browsers block auto-start without user gesture
  const requestMic = useCallback(() => {
    if (!isRunningRef.current) {
      setMicError(false);
      startListening();
    }
  }, [startListening]);

  useEffect(() => {
    if (enabled) {
      // Try auto-start (works if mic was already granted)
      startListening();
    } else {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
        isRunningRef.current = false;
      }
      setMicActive(false);
    }
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
        isRunningRef.current = false;
      }
    };
  }, [enabled, startListening]);

  return { micActive, micError, requestMic };
}
