import { useEffect } from 'react';
import Header from './components/Header';
import ProjectCard from './components/ProjectCard';
import ToolFeed from './components/ToolFeed';
import BriefPanel from './components/BriefPanel';
import useOperatorSSE from './hooks/useOperatorSSE';

const PROJECTS = [
  { id: 'school', name: 'Master IA \u2014 Sorbonne', contact: 'prof.martinez@sorbonne.fr', color: '#00FF88' },
  { id: 'company', name: 'Alternance \u2014 BNP Paribas', contact: 'sophie.renard@bnpparibas.com', color: '#FF4444' },
  { id: 'startup', name: 'Side Project \u2014 NoctaAI', contact: 'yassine@noctaai.com', color: '#FF8800' },
];

export default function App() {
  const { toolCalls, projectStatuses, briefText, isScanning, startScan } = useOperatorSSE();

  // Auto-scan in demo mode (?demo=true)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') === 'true') {
      const timer = setTimeout(() => startScan(), 2000);
      return () => clearTimeout(timer);
    }
  }, [startScan]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <Header onScan={startScan} isScanning={isScanning} />

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
        <ToolFeed toolCalls={toolCalls} />
        <BriefPanel briefText={briefText} />
      </div>
    </div>
  );
}
