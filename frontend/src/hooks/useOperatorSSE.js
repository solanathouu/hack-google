import { useState, useCallback, useRef, useEffect } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const TOTAL_STEPS = 13; // 9 tool_results + 3 initiatives + 1 brief

export default function useOperatorSSE() {
  const [toolCalls, setToolCalls] = useState([]);
  const [projectStatuses, setProjectStatuses] = useState({});
  const [briefText, setBriefText] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanPhase, setScanPhase] = useState('');

  // Smooth progress: ceiling is raised by events, timer fills up to it
  const ceilingRef = useRef(0);
  const displayRef = useRef(0);
  const timerRef = useRef(null);
  const doneRef = useRef(false);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => stopTimer, [stopTimer]);

  const startTimer = useCallback(() => {
    stopTimer();
    timerRef.current = setInterval(() => {
      const ceiling = ceilingRef.current;
      const current = displayRef.current;

      if (current >= 100) {
        stopTimer();
        return;
      }

      // Smoothly approach ceiling: move 15% of remaining gap, min +0.3
      let next;
      if (doneRef.current) {
        // Brief received — rush to 100
        next = Math.min(100, current + Math.max(2, (100 - current) * 0.15));
      } else {
        // Normal: approach ceiling but never exceed it
        const gap = ceiling - current;
        if (gap <= 0.5) return; // at ceiling, wait for next event
        next = current + Math.max(0.3, gap * 0.12);
        next = Math.min(next, ceiling);
      }

      displayRef.current = next;
      setScanProgress(Math.round(next));

      if (Math.round(next) >= 100) {
        stopTimer();
      }
    }, 40); // ~25fps for smooth motion
  }, [stopTimer]);

  const startScan = useCallback(() => {
    setToolCalls([]);
    setProjectStatuses({});
    setBriefText(null);
    setIsScanning(true);
    setScanProgress(0);
    setScanPhase('Connexion au serveur...');
    ceilingRef.current = 5; // initial small bump
    displayRef.current = 0;
    doneRef.current = false;

    let stepsDone = 0;
    const raiseCeiling = (label) => {
      stepsDone++;
      // Leave 10% headroom for brief (steps go to 90%, brief fills to 100%)
      const pct = Math.round((stepsDone / TOTAL_STEPS) * 90);
      ceilingRef.current = Math.max(ceilingRef.current, pct);
      setScanPhase(label);
    };

    startTimer();

    const source = new EventSource(`${BACKEND_URL}/api/run`);

    source.addEventListener('tool_call', (e) => {
      const data = JSON.parse(e.data);
      setToolCalls(prev => [...prev, { tool: data.tool, project: data.project, status: 'running' }]);
      setScanPhase(`${data.tool}(${data.project})...`);
      // Small ceiling bump on tool_call to show activity
      ceilingRef.current = Math.max(ceilingRef.current, ceilingRef.current + 2);
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
      raiseCeiling(`${data.tool}(${data.project}) OK`);
    });

    source.addEventListener('urgency', () => {
      setScanPhase('Analyse des urgences...');
    });

    source.addEventListener('initiative', (e) => {
      const data = JSON.parse(e.data);
      setProjectStatuses(prev => ({
        ...prev,
        [data.project]: { status: data.status, alerts: data.alerts },
      }));
      raiseCeiling(`Evaluation ${data.project}`);
    });

    source.addEventListener('brief', (e) => {
      const data = JSON.parse(e.data);
      setBriefText(data.text);
      setScanPhase('Brief pret !');
      doneRef.current = true;
      ceilingRef.current = 100;
      // isScanning will be cleared once display hits 100
      const checkDone = setInterval(() => {
        if (displayRef.current >= 99) {
          setIsScanning(false);
          setScanProgress(100);
          clearInterval(checkDone);
        }
      }, 50);
      source.close();
    });

    source.onerror = () => {
      setIsScanning(false);
      stopTimer();
      setScanPhase('');
      source.close();
    };
  }, [startTimer, stopTimer]);

  const addChatMessage = useCallback((msg) => {
    setChatMessages(prev => [...prev, msg]);
  }, []);

  return {
    toolCalls,
    projectStatuses,
    briefText,
    isScanning,
    startScan,
    chatMessages,
    addChatMessage,
    scanProgress,
    scanPhase,
  };
}
