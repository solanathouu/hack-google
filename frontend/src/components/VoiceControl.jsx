import { useState, useRef, useEffect } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export default function VoiceControl({ onReply, chatMessages, visible }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const hasSpeechAPI = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isThinking]);

  // Focus input when panel becomes visible
  useEffect(() => {
    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [visible]);

  // Setup speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      const text = final || interim;
      setTranscript(text);
      setInputText(text);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error('STT error:', event.error);
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

  // Auto-send when recognition ends with a final transcript
  const pendingSendRef = useRef(false);
  useEffect(() => {
    if (!isListening && pendingSendRef.current && transcript.trim() && !isThinking) {
      pendingSendRef.current = false;
      sendMessage(transcript.trim());
    }
  }, [isListening]);

  const toggleMic = () => {
    if (isListening) {
      pendingSendRef.current = true;
      recognitionRef.current?.stop();
      return;
    }
    setTranscript('');
    setInputText('');
    pendingSendRef.current = true;
    recognitionRef.current?.start();
    setIsListening(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || isThinking) return;
    sendMessage(text);
  };

  const sendMessage = async (text) => {
    setIsThinking(true);
    setInputText('');
    setTranscript('');
    onReply?.({ role: 'user', text });

    try {
      const res = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      // Read SSE stream for chat reply
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let replyText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data:') || line.startsWith('data: ')) {
            try {
              const jsonStr = line.replace(/^data:\s*/, '');
              const data = JSON.parse(jsonStr);
              if (data.type === 'chat_reply') {
                replyText = data.text;
              }
            } catch { /* skip non-JSON lines */ }
          }
        }
      }

      if (replyText) {
        onReply?.({ role: 'assistant', text: replyText });
        await speakReply(replyText);
      }
    } catch (err) {
      console.error('Chat error:', err);
      onReply?.({ role: 'assistant', text: 'Erreur de connexion. Reessaie.' });
    } finally {
      setIsThinking(false);
    }
  };

  const speakReply = async (text) => {
    try {
      setIsSpeaking(true);
      const res = await fetch(`${BACKEND_URL}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) { setIsSpeaking(false); return; }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
      };
      await audio.play();
    } catch (err) {
      console.error('TTS error:', err);
      setIsSpeaking(false);
    }
  };

  if (!visible) return null;

  return (
    <div style={{
      background: 'var(--card-bg)',
      borderTop: '2px solid var(--green)',
      marginTop: '8px',
      animation: 'fadeIn 0.4s ease-out',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px 0',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span style={{ color: 'var(--green)', fontSize: '14px' }}>&#9654;</span>
        <h4 style={{
          fontSize: '11px',
          color: 'var(--green)',
          letterSpacing: '2px',
          margin: 0,
        }}>
          CONVERSATION AVEC OPERATOR
        </h4>
        {isSpeaking && (
          <span style={{
            fontSize: '10px',
            color: '#6666ff',
            letterSpacing: '1px',
            marginLeft: 'auto',
            animation: 'pulse 1s infinite',
          }}>
            PARLE...
          </span>
        )}
      </div>

      {/* Chat messages */}
      <div style={{
        maxHeight: '300px',
        overflowY: 'auto',
        padding: '12px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}>
        {(!chatMessages || chatMessages.length === 0) && !isThinking && (
          <p style={{
            fontSize: '13px',
            color: 'var(--text-dim)',
            fontStyle: 'italic',
            margin: '8px 0',
          }}>
            Dis-moi par quoi tu veux commencer, ou pose-moi une question sur tes projets.
          </p>
        )}

        {chatMessages && chatMessages.map((msg, i) => (
          <div key={i} style={{
            padding: '10px 14px',
            borderRadius: '4px',
            fontSize: '13px',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap',
            background: msg.role === 'user' ? '#1a2a1a' : '#1a1a2a',
            borderLeft: `3px solid ${msg.role === 'user' ? 'var(--green)' : '#6666ff'}`,
            color: '#e0e0e0',
            animation: 'slideIn 0.3s ease-out',
          }}>
            <span style={{
              fontSize: '10px',
              color: msg.role === 'user' ? 'var(--green)' : '#6666ff',
              letterSpacing: '1px',
              fontWeight: 700,
              display: 'block',
              marginBottom: '4px',
            }}>
              {msg.role === 'user' ? 'TOI' : 'OPERATOR'}
            </span>
            {msg.text}
          </div>
        ))}

        {isThinking && (
          <div style={{
            padding: '10px 14px',
            fontSize: '13px',
            color: '#6666ff',
            fontStyle: 'italic',
            animation: 'pulse 1.5s infinite',
          }}>
            Operator reflechit...
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input bar */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 24px 16px',
          borderTop: '1px solid var(--border)',
        }}
      >
        {hasSpeechAPI && (
          <button
            type="button"
            onClick={toggleMic}
            disabled={isThinking || isSpeaking}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: `2px solid ${isListening ? 'var(--red)' : '#444'}`,
              background: isListening ? 'rgba(255, 68, 68, 0.15)' : 'transparent',
              color: isListening ? 'var(--red)' : '#888',
              fontSize: '16px',
              cursor: isThinking || isSpeaking ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: isThinking || isSpeaking ? 0.4 : 1,
              animation: isListening ? 'pulse 1s infinite' : 'none',
              flexShrink: 0,
            }}
          >
            {'\uD83C\uDF99'}
          </button>
        )}

        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isThinking || isSpeaking}
          placeholder={isListening ? 'Ecoute en cours...' : 'Ecris ta question ou parle...'}
          style={{
            flex: 1,
            background: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '4px',
            padding: '10px 14px',
            color: '#e0e0e0',
            fontFamily: 'inherit',
            fontSize: '13px',
            outline: 'none',
          }}
        />

        <button
          type="submit"
          disabled={!inputText.trim() || isThinking || isSpeaking}
          style={{
            background: inputText.trim() && !isThinking ? 'var(--green)' : '#333',
            color: '#0a0a0a',
            border: 'none',
            borderRadius: '4px',
            padding: '10px 18px',
            fontFamily: 'inherit',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '1px',
            cursor: !inputText.trim() || isThinking ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            flexShrink: 0,
          }}
        >
          ENVOYER
        </button>
      </form>
    </div>
  );
}
