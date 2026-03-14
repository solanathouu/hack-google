import { useEffect, useState, useCallback, useRef } from 'react';
import JarvisOrb from './components/JarvisOrb';
import ConversationOverlay from './components/ConversationOverlay';
import ProjectCardsDrawer from './components/ProjectCardsDrawer';
import useOperatorSSE from './hooks/useOperatorSSE';
import useWakeWord from './hooks/useWakeWord';
import useSpeechRecognition from './hooks/useSpeechRecognition';
import useTTS from './hooks/useTTS';

const PROJECTS = [
  { id: 'school', name: 'Master IA \u2014 Sorbonne', contact: 'prof.martinez@sorbonne.fr', color: '#00FF88' },
  { id: 'company', name: 'Alternance \u2014 BNP Paribas', contact: 'sophie.renard@bnpparibas.com', color: '#FF4444' },
  { id: 'startup', name: 'Side Project \u2014 NoctaAI', contact: 'yassine@noctaai.com', color: '#FF8800' },
];

export default function App() {
  const { projectStatuses, briefText, isScanning, startScan, sendChat, feedLines } = useOperatorSSE();
  const { speak, isSpeaking } = useTTS();

  // Phase: LOADING | IDLE | LISTENING | THINKING | SPEAKING
  const [phase, setPhase] = useState('LOADING');
  const [messages, setMessages] = useState([]);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const [inputText, setInputText] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);

  // ---- 1. Silent scan on mount ----
  useEffect(() => { startScan(); }, [startScan]);

  // ---- 2. Scan complete -> IDLE ----
  useEffect(() => {
    if (briefText && phase === 'LOADING') {
      setPhase('IDLE');
    }
  }, [briefText, phase]);

  // ---- 3. Wake word detection (active only in IDLE) ----
  const handleWakeWord = useCallback(() => {
    if (phaseRef.current === 'IDLE') {
      setPhase('LISTENING');
    }
  }, []);

  const { micActive, micError, requestMic } = useWakeWord({
    enabled: phase === 'IDLE',
    onDetected: handleWakeWord,
  });

  // ---- 4. Orb click ----
  const handleOrbClick = useCallback(() => {
    if (phase === 'IDLE') {
      if (micError || !micActive) {
        // First click: authorize mic, then wake word listener starts
        requestMic();
      } else {
        // Mic already active — skip to listening
        setPhase('LISTENING');
      }
    }
  }, [phase, micError, micActive, requestMic]);

  // ---- 5. Speech recognition (active in LISTENING) ----
  const handleUserSaid = useCallback(async (text) => {
    if (!text.trim()) return;

    const bye = text.toLowerCase();
    if (bye.includes('merci') || bye.includes("c'est bon") || bye.includes('a plus') || bye.includes('au revoir')) {
      setMessages(prev => [...prev, { role: 'user', text }]);
      const farewell = "Ok, je reste la si tu as besoin. Dis 'Jarvis' quand tu veux.";
      setMessages(prev => [...prev, { role: 'assistant', text: farewell }]);
      setPhase('SPEAKING');
      await speak(farewell);
      setPhase('IDLE');
      return;
    }

    setMessages(prev => [...prev, { role: 'user', text }]);
    setPhase('SPEAKING');
    // Say a short acknowledgment while fetching the real answer
    const acks = [
      "D'accord, donne-moi un petit instant.",
      "Je regarde ca tout de suite.",
      "Laisse-moi verifier.",
      "Une seconde, je cherche.",
    ];
    const ack = acks[Math.floor(Math.random() * acks.length)];
    const ackDone = speak(ack);
    // Start fetching the answer in parallel
    const replyPromise = sendChat(text);
    await ackDone;
    setPhase('THINKING');

    try {
      const reply = await replyPromise;
      if (reply) {
        setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
        setPhase('SPEAKING');
        await speak(reply);
        if (phaseRef.current === 'SPEAKING') {
          setPhase('LISTENING');
        }
      } else {
        setPhase('LISTENING');
      }
    } catch (err) {
      console.error('Chat error:', err);
      setPhase('LISTENING');
    }
  }, [sendChat, speak]);

  const handleTimeout = useCallback(() => {
    if (phaseRef.current === 'LISTENING') {
      setPhase('IDLE');
    }
  }, []);

  const { transcript } = useSpeechRecognition({
    enabled: phase === 'LISTENING',
    onResult: handleUserSaid,
    onTimeout: handleTimeout,
    timeoutMs: 20000,
  });

  // ---- 6. Text input submit ----
  const handleSubmit = (e) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || phase === 'THINKING' || phase === 'SPEAKING') return;
    setInputText('');
    handleUserSaid(text);
  };

  // ---- Phase label ----
  let label = '';
  if (phase === 'LOADING') label = 'Initialisation...';
  else if (phase === 'IDLE') {
    if (micError) label = "Clique sur l'orbe pour autoriser le micro";
    else if (!micActive) label = "Clique sur l'orbe pour activer le micro";
    else label = "Micro actif — dis 'Jarvis' pour commencer";
  }
  else if (phase === 'LISTENING') label = transcript || "Je t'ecoute...";
  else if (phase === 'THINKING') label = 'Operator reflechit...';
  else if (phase === 'SPEAKING') label = '';

  // Mic status indicator
  const micDot = phase === 'IDLE' && micActive ? '#00FF88' : phase === 'IDLE' && micError ? '#FF4444' : null;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px 100px',
      position: 'relative',
    }}>
      {/* Logo */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        padding: '16px 24px',
        zIndex: 10,
      }}>
        <h1 style={{
          fontSize: '14px',
          color: 'var(--green)',
          letterSpacing: '4px',
          opacity: 0.6,
          margin: 0,
        }}>
          OPERATOR
        </h1>
      </div>

      {/* Orb */}
      <JarvisOrb phase={phase} onClick={handleOrbClick} isLoading={isScanning} />

      {/* Mic status dot */}
      {micDot && (
        <div style={{
          marginTop: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: micDot,
            animation: micActive ? 'pulse 2s infinite' : 'none',
          }} />
          <span style={{ fontSize: '10px', color: micDot, letterSpacing: '1px' }}>
            {micActive ? 'MICRO ACTIF' : 'MICRO BLOQUE'}
          </span>
        </div>
      )}

      {/* Phase label */}
      <div style={{
        marginTop: micDot ? '8px' : '24px',
        fontSize: '13px',
        color: phase === 'LISTENING' && transcript ? 'var(--green)' : 'var(--text-dim)',
        letterSpacing: '1px',
        textAlign: 'center',
        minHeight: '20px',
        animation: phase === 'THINKING' ? 'pulse 1.5s infinite' : 'none',
        fontStyle: phase === 'LISTENING' && transcript ? 'normal' : 'italic',
      }}>
        {label}
      </div>

      {/* Live feed during scan */}
      {phase === 'LOADING' && feedLines.length > 0 && (
        <div style={{
          marginTop: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          maxWidth: '400px',
        }}>
          {feedLines.map((line) => (
            <div key={line.id} style={{
              fontSize: '11px',
              color: line.color,
              letterSpacing: '0.5px',
              animation: 'fadeInUp 0.3s ease-out',
              whiteSpace: 'nowrap',
            }}>
              {line.text}
            </div>
          ))}
        </div>
      )}

      {/* Transcript toggle + conversation */}
      {messages.length > 0 && (
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            style={{
              background: 'none',
              border: '1px solid #333',
              color: 'var(--text-dim)',
              padding: '4px 14px',
              borderRadius: '12px',
              fontFamily: 'inherit',
              fontSize: '10px',
              letterSpacing: '1px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {showTranscript ? 'MASQUER LA TRANSCRIPTION' : 'AFFICHER LA TRANSCRIPTION'}
          </button>
        </div>
      )}
      {showTranscript && (
        <div style={{ marginTop: '12px', width: '100%', maxWidth: '600px' }}>
          <ConversationOverlay messages={messages} isThinking={phase === 'THINKING'} />
        </div>
      )}

      {/* Text input */}
      <form
        onSubmit={handleSubmit}
        style={{
          position: 'fixed',
          bottom: '50px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '500px',
          display: 'flex',
          gap: '8px',
          padding: '0 20px',
          zIndex: 15,
        }}
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={phase === 'LOADING'}
          placeholder={phase === 'LOADING' ? 'Chargement...' : 'Ou ecris ta question ici...'}
          style={{
            flex: 1,
            background: '#111',
            border: '1px solid #333',
            borderRadius: '24px',
            padding: '12px 20px',
            color: '#e0e0e0',
            fontFamily: 'inherit',
            fontSize: '13px',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={!inputText.trim() || phase === 'THINKING' || phase === 'LOADING'}
          style={{
            background: inputText.trim() ? 'var(--green)' : '#333',
            color: '#0a0a0a',
            border: 'none',
            borderRadius: '24px',
            padding: '12px 20px',
            fontFamily: 'inherit',
            fontSize: '12px',
            fontWeight: 700,
            cursor: !inputText.trim() ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          ENVOYER
        </button>
      </form>

      {/* Project cards drawer */}
      <ProjectCardsDrawer projects={PROJECTS} statuses={projectStatuses} />
    </div>
  );
}
