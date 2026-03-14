import { useState, useCallback, useRef } from 'react';
import JarvisOrb from './components/JarvisOrb';
import ConversationOverlay from './components/ConversationOverlay';
import ProjectCardsDrawer from './components/ProjectCardsDrawer';
import useOperatorSSE from './hooks/useOperatorSSE';
import useWakeWord from './hooks/useWakeWord';
import useSpeechRecognition from './hooks/useSpeechRecognition';
import useTTS from './hooks/useTTS';

const PROJECTS = [
  { id: 'school', name: 'Master IA \u2014 Sorbonne', contact: 'prof.martinez@sorbonne.fr', color: '#4285f4' },
  { id: 'company', name: 'Alternance \u2014 BNP Paribas', contact: 'sophie.renard@bnpparibas.com', color: '#ea4335' },
  { id: 'startup', name: 'Side Project \u2014 NoctaAI', contact: 'yassine@noctaai.com', color: '#fbbc04' },
];

export default function App() {
  const { sendChat } = useOperatorSSE();
  const { speak } = useTTS();

  // Start directly in IDLE — no scan needed
  const [phase, setPhase] = useState('IDLE');
  const [messages, setMessages] = useState([]);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const [inputText, setInputText] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);

  const handleWakeWord = useCallback(() => {
    if (phaseRef.current === 'IDLE') setPhase('LISTENING');
  }, []);

  const { micActive, micError, requestMic } = useWakeWord({
    enabled: phase === 'IDLE',
    onDetected: handleWakeWord,
  });

  const handleOrbClick = useCallback(() => {
    if (phase === 'IDLE') {
      if (micError || !micActive) {
        // First click: authorize mic — wake word listener starts
        requestMic();
      } else {
        // Mic already active — go to listening
        setPhase('LISTENING');
      }
    }
  }, [phase, micError, micActive, requestMic]);

  const handleUserSaid = useCallback(async (text) => {
    if (!text.trim()) return;

    const bye = text.toLowerCase().trim();
    const byePhrases = [
      // French
      'merci', "c'est bon", 'a plus', 'au revoir', 'non', 'non merci', 'ca ira', 'ça ira',
      'pas pour le moment', 'rien', "c'est tout", 'stop', "arrete d'ecouter", "arrête d'écouter",
      'arrete', 'arrête', 'tais-toi', 'tais toi', 'silence', 'pause', 'en veille', 'mets-toi en veille',
      // English
      'thank you', 'thanks', 'no', 'no thanks', 'goodbye', 'bye', "that's all", "i'm good",
      'stop listening', 'shut up', 'go to sleep', 'stand by',
    ];
    if (byePhrases.some(p => bye.includes(p))) {
      setMessages(prev => [...prev, { role: 'user', text }]);
      const farewells = [
        "Ok, je reste la si tu as besoin. Dis 'Oppy' quand tu veux.",
        "Pas de souci. Dis 'Oppy' pour me rappeler.",
        "D'accord, je me mets en veille. Dis 'Oppy' quand tu as besoin de moi.",
      ];
      const farewell = farewells[Math.floor(Math.random() * farewells.length)];
      setMessages(prev => [...prev, { role: 'assistant', text: farewell }]);
      setPhase('SPEAKING');
      await speak(farewell);
      setPhase('IDLE');
      return;
    }

    setMessages(prev => [...prev, { role: 'user', text }]);
    setPhase('SPEAKING');
    const acks = [
      "D'accord, donne-moi un petit instant.",
      "Je regarde ca tout de suite.",
      "Laisse-moi verifier.",
      "Une seconde, je cherche.",
    ];
    const ack = acks[Math.floor(Math.random() * acks.length)];
    const ackDone = speak(ack);
    const replyPromise = sendChat(text);
    await ackDone;
    setPhase('THINKING');

    try {
      const reply = await replyPromise;
      if (reply) {
        setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
        setPhase('SPEAKING');
        await speak(reply);
        if (phaseRef.current === 'SPEAKING') setPhase('LISTENING');
      } else {
        setPhase('LISTENING');
      }
    } catch (err) {
      console.error('Chat error:', err);
      setPhase('LISTENING');
    }
  }, [sendChat, speak]);

  const handleTimeout = useCallback(() => {
    if (phaseRef.current === 'LISTENING') setPhase('IDLE');
  }, []);

  const { transcript } = useSpeechRecognition({
    enabled: phase === 'LISTENING',
    onResult: handleUserSaid,
    onTimeout: handleTimeout,
    timeoutMs: 20000,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || phase === 'THINKING' || phase === 'SPEAKING') return;
    setInputText('');
    handleUserSaid(text);
  };

  let label = '';
  if (phase === 'IDLE') {
    if (micError) label = "Clique sur l'orbe pour autoriser le micro";
    else if (!micActive) label = "Clique sur l'orbe pour activer le micro";
    else label = "Micro actif — dis 'Oppy' pour commencer";
  }
  else if (phase === 'LISTENING') label = transcript || "Je t'ecoute...";
  else if (phase === 'THINKING') label = 'Oppy reflechit...';
  else if (phase === 'SPEAKING') label = '';

  const micDotColor = phase === 'IDLE' && micActive ? '#34a853' : phase === 'IDLE' && micError ? '#ea4335' : null;

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
        padding: '20px 24px',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <span style={{
          fontSize: '20px',
          background: 'linear-gradient(135deg, #4285f4, #a142f4, #f439a0)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          &#10022;
        </span>
        <h1 style={{
          fontSize: '16px',
          fontWeight: 500,
          color: '#1f1f1f',
          margin: 0,
          letterSpacing: '0.5px',
        }}>
          Oppy
        </h1>
      </div>

      {/* Orb */}
      <JarvisOrb phase={phase} onClick={handleOrbClick} isLoading={false} />

      {/* Mic status dot */}
      {micDotColor && (
        <div style={{
          marginTop: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: micDotColor,
            animation: micActive ? 'pulse 2s infinite' : 'none',
          }} />
          <span style={{ fontSize: '11px', color: micDotColor, letterSpacing: '0.5px' }}>
            {micActive ? 'Micro actif' : 'Micro bloque'}
          </span>
        </div>
      )}

      {/* Phase label */}
      <div style={{
        marginTop: micDotColor ? '8px' : '24px',
        fontSize: '14px',
        color: phase === 'LISTENING' && transcript ? '#4285f4' : '#5f6368',
        textAlign: 'center',
        minHeight: '20px',
        animation: phase === 'THINKING' ? 'pulse 1.5s infinite' : 'none',
        fontWeight: phase === 'LISTENING' && transcript ? 500 : 400,
      }}>
        {label}
      </div>

      {/* Transcript toggle */}
      {messages.length > 0 && (
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            style={{
              background: showTranscript ? '#f1f3f4' : 'transparent',
              border: '1px solid #e0e0e0',
              color: '#5f6368',
              padding: '6px 16px',
              borderRadius: '16px',
              fontFamily: 'inherit',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {showTranscript ? 'Masquer la transcription' : 'Afficher la transcription'}
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
          placeholder="Ecris ta question ici..."
          style={{
            flex: 1,
            background: '#f8f9fa',
            border: '1px solid #e0e0e0',
            borderRadius: '24px',
            padding: '12px 20px',
            color: '#1f1f1f',
            fontFamily: 'inherit',
            fontSize: '14px',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={!inputText.trim() || phase === 'THINKING'}
          style={{
            background: inputText.trim() ? '#4285f4' : '#f1f3f4',
            color: inputText.trim() ? '#fff' : '#9aa0a6',
            border: 'none',
            borderRadius: '24px',
            padding: '12px 20px',
            fontFamily: 'inherit',
            fontSize: '13px',
            fontWeight: 500,
            cursor: !inputText.trim() ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          Envoyer
        </button>
      </form>

      {/* Project cards drawer */}
      <ProjectCardsDrawer projects={PROJECTS} statuses={{}} />
    </div>
  );
}
