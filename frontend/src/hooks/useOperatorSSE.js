import { useState, useCallback } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export default function useOperatorSSE() {
  const [toolCalls, setToolCalls] = useState([]);
  const [projectStatuses, setProjectStatuses] = useState({});
  const [briefText, setBriefText] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  const startScan = useCallback(() => {
    setToolCalls([]);
    setProjectStatuses({});
    setBriefText(null);
    setIsScanning(true);

    const source = new EventSource(`${BACKEND_URL}/api/run`);

    source.addEventListener('tool_call', (e) => {
      const data = JSON.parse(e.data);
      setToolCalls(prev => [...prev, { tool: data.tool, project: data.project, status: 'running' }]);
    });

    source.addEventListener('tool_result', (e) => {
      const data = JSON.parse(e.data);
      setToolCalls(prev =>
        prev.map(tc =>
          tc.tool === data.tool && tc.project === data.project && tc.status === 'running'
            ? { ...tc, status: 'done' }
            : tc
        )
      );
    });

    source.addEventListener('initiative', (e) => {
      const data = JSON.parse(e.data);
      setProjectStatuses(prev => ({
        ...prev,
        [data.project]: { status: data.status, alerts: data.alerts },
      }));
    });

    source.addEventListener('brief', (e) => {
      const data = JSON.parse(e.data);
      setBriefText(data.text);
      setIsScanning(false);
      source.close();
    });

    source.onerror = () => {
      setIsScanning(false);
      source.close();
    };
  }, []);

  return { toolCalls, projectStatuses, briefText, isScanning, startScan };
}
