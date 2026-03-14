import { useState, useCallback } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const TOOL_LABELS = {
  read_emails: 'Lecture emails',
  get_events: 'Calendrier',
  search_web: 'Signaux web',
};

const PROJECT_LABELS = {
  school: 'Sorbonne',
  company: 'BNP Paribas',
  startup: 'NoctaAI',
};

export default function useOperatorSSE() {
  const [projectStatuses, setProjectStatuses] = useState({});
  const [briefText, setBriefText] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [feedLines, setFeedLines] = useState([]); // real-time feed

  const addFeed = (text, color) => {
    setFeedLines(prev => [...prev.slice(-8), { text, color, id: Date.now() + Math.random() }]);
  };

  const startScan = useCallback(() => {
    setProjectStatuses({});
    setBriefText(null);
    setIsScanning(true);
    setFeedLines([]);

    const source = new EventSource(`${BACKEND_URL}/api/run`);

    source.addEventListener('tool_call', (e) => {
      const data = JSON.parse(e.data);
      const tool = TOOL_LABELS[data.tool] || data.tool;
      const proj = PROJECT_LABELS[data.project] || data.project;
      addFeed(`${tool} — ${proj}...`, '#666');
    });

    source.addEventListener('tool_result', (e) => {
      const data = JSON.parse(e.data);
      const tool = TOOL_LABELS[data.tool] || data.tool;
      const proj = PROJECT_LABELS[data.project] || data.project;
      addFeed(`${tool} — ${proj} OK`, '#00FF88');
    });

    source.addEventListener('urgency', (e) => {
      const data = JSON.parse(e.data);
      const proj = PROJECT_LABELS[data.project] || data.project;
      const pct = Math.round(data.score * 100);
      const color = pct > 60 ? '#FF4444' : pct > 30 ? '#FF8800' : '#00FF88';
      addFeed(`Urgence ${proj}: ${data.email_subject} (${pct}%)`, color);
    });

    source.addEventListener('initiative', (e) => {
      const data = JSON.parse(e.data);
      const proj = PROJECT_LABELS[data.project] || data.project;
      setProjectStatuses(prev => ({
        ...prev,
        [data.project]: { status: data.status, alerts: data.alerts },
      }));
      const color = data.status === 'URGENT' ? '#FF4444' : data.status === 'SIGNAL' ? '#FF8800' : '#00FF88';
      addFeed(`${proj} → ${data.status}`, color);
    });

    source.addEventListener('brief', (e) => {
      const data = JSON.parse(e.data);
      setBriefText(data.text);
      setIsScanning(false);
      addFeed('Brief pret !', '#00FF88');
      source.close();
    });

    source.onerror = () => {
      setIsScanning(false);
      source.close();
    };
  }, []);

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

  return { projectStatuses, briefText, isScanning, startScan, sendChat, feedLines };
}
