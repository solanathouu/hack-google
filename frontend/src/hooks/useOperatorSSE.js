import { useCallback } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export default function useOperatorSSE() {
  const sendChat = useCallback(async (message) => {
    const res = await fetch(`${BACKEND_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });

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
            const data = JSON.parse(line.replace(/^data:\s*/, ''));
            if (data.type === 'chat_reply') {
              replyText = data.text;
            }
          } catch { /* skip */ }
        }
      }
    }

    return replyText;
  }, []);

  return { sendChat };
}
