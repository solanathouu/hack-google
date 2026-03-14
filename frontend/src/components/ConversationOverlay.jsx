import { useEffect, useRef } from 'react';

export default function ConversationOverlay({ messages, isThinking }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  if ((!messages || messages.length === 0) && !isThinking) return null;

  return (
    <div style={{
      width: '100%',
      maxWidth: '600px',
      maxHeight: '40vh',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      padding: '10px 0',
    }}>
      {messages.map((msg, i) => (
        <div key={i} style={{
          padding: '10px 16px',
          borderRadius: '8px',
          fontSize: '13px',
          lineHeight: '1.6',
          whiteSpace: 'pre-wrap',
          background: msg.role === 'user' ? '#1a2a1a' : '#1a1a2a',
          borderLeft: `3px solid ${msg.role === 'user' ? 'var(--green)' : '#6666ff'}`,
          color: '#e0e0e0',
          animation: 'fadeInUp 0.3s ease-out',
          alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
          maxWidth: '85%',
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
          padding: '10px 16px',
          fontSize: '13px',
          color: '#FF8800',
          fontStyle: 'italic',
          animation: 'pulse 1.5s infinite',
        }}>
          Operator reflechit...
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}
