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
          padding: '12px 16px',
          borderRadius: '12px',
          fontSize: '14px',
          lineHeight: '1.6',
          whiteSpace: 'pre-wrap',
          background: msg.role === 'user' ? '#e8f0fe' : '#f8f9fa',
          borderLeft: `3px solid ${msg.role === 'user' ? '#4285f4' : '#a142f4'}`,
          color: '#1f1f1f',
          animation: 'fadeInUp 0.3s ease-out',
          alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
          maxWidth: '85%',
        }}>
          <span style={{
            fontSize: '11px',
            color: msg.role === 'user' ? '#4285f4' : '#a142f4',
            fontWeight: 500,
            display: 'block',
            marginBottom: '4px',
          }}>
            {msg.role === 'user' ? 'Toi' : 'Oppy'}
          </span>
          {msg.text}
        </div>
      ))}

      {isThinking && (
        <div style={{
          padding: '12px 16px',
          fontSize: '14px',
          color: '#a142f4',
          fontStyle: 'italic',
          animation: 'pulse 1.5s infinite',
        }}>
          Oppy reflechit...
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}
