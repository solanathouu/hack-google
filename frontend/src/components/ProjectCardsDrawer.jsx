import { useState } from 'react';
import ProjectCard from './ProjectCard';

export default function ProjectCardsDrawer({ projects, statuses }) {
  const [open, setOpen] = useState(false);

  const statusDots = projects.map(p => {
    const s = statuses[p.id]?.status || 'STANDBY';
    const colors = { STANDBY: '#444', READY: '#00FF88', URGENT: '#FF4444', SIGNAL: '#FF8800' };
    return { id: p.id, color: colors[s] || '#444' };
  });

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 20,
    }}>
      {/* Handle bar */}
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          padding: '10px',
          background: '#111',
          borderTop: '1px solid #222',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', gap: '6px' }}>
          {statusDots.map(d => (
            <div key={d.id} style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: d.color,
            }} />
          ))}
        </div>
        <span style={{
          fontSize: '11px',
          color: 'var(--text-dim)',
          letterSpacing: '1px',
        }}>
          {open ? 'FERMER' : '3 PROJETS'}
        </span>
        <span style={{ fontSize: '10px', color: '#555' }}>
          {open ? '\u25BC' : '\u25B2'}
        </span>
      </div>

      {/* Drawer content */}
      {open && (
        <div style={{
          background: '#0a0a0a',
          borderTop: '1px solid #222',
          padding: '16px 24px',
          display: 'flex',
          gap: '12px',
          maxHeight: '50vh',
          overflowY: 'auto',
          animation: 'fadeIn 0.2s ease-out',
        }}>
          {projects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              status={statuses[project.id]?.status || 'STANDBY'}
              alerts={statuses[project.id]?.alerts || []}
            />
          ))}
        </div>
      )}
    </div>
  );
}
