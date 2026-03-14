import { useState } from 'react';
import ProjectCard from './ProjectCard';

export default function ProjectCardsDrawer({ projects, statuses }) {
  const [open, setOpen] = useState(false);

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
          gap: '10px',
          padding: '10px',
          background: '#ffffff',
          borderTop: '1px solid #e0e0e0',
          cursor: 'pointer',
        }}
      >
        <span style={{
          fontSize: '13px',
          color: '#1f1f1f',
          fontWeight: 500,
        }}>
          {open ? 'Fermer les projets' : `${projects.length} projets`}
        </span>
        <span style={{ fontSize: '10px', color: '#5f6368' }}>
          {open ? '\u25BC' : '\u25B2'}
        </span>
      </div>

      {/* Drawer content */}
      {open && (
        <div style={{
          background: '#f8f9fa',
          borderTop: '1px solid #e0e0e0',
          padding: '16px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          maxHeight: '55vh',
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
