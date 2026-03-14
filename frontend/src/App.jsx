import { useEffect } from 'react';
import Header from './components/Header';
import ProjectCard from './components/ProjectCard';

import BriefPanel from './components/BriefPanel';
import VoiceControl from './components/VoiceControl';
import useOperatorSSE from './hooks/useOperatorSSE';

const PROJECTS = [
  { id: 'school', name: 'Master IA \u2014 Sorbonne', contact: 'prof.martinez@sorbonne.fr', color: '#00FF88' },
  { id: 'company', name: 'Alternance \u2014 BNP Paribas', contact: 'sophie.renard@bnpparibas.com', color: '#FF4444' },
  { id: 'startup', name: 'Side Project \u2014 NoctaAI', contact: 'yassine@noctaai.com', color: '#FF8800' },
];

export default function App() {
  const {
    toolCalls,
    projectStatuses,
    briefText,
    isScanning,
    startScan,
    chatMessages,
    addChatMessage,
    scanProgress,
    scanPhase,
  } = useOperatorSSE();

  // Auto-scan on page load
  useEffect(() => {
    startScan();
  }, [startScan]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <Header scanProgress={scanProgress} scanPhase={scanPhase} />

      <div style={{
        display: 'flex',
        gap: '16px',
        padding: '24px 32px',
      }}>
        {PROJECTS.map(project => {
          const ps = projectStatuses[project.id];
          return (
            <ProjectCard
              key={project.id}
              project={project}
              status={ps?.status || 'STANDBY'}
              alerts={ps?.alerts || []}
            />
          );
        })}
      </div>

      <div style={{ padding: '0 32px 32px' }}>
        <BriefPanel briefText={briefText} />
        <VoiceControl onReply={addChatMessage} chatMessages={chatMessages} visible={!!briefText} />
      </div>
    </div>
  );
}
