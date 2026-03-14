import { useState } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const STATUS_CONFIG = {
  STANDBY: { label: 'STANDBY', bg: '#222', color: '#666' },
  READY: { label: 'READY', bg: '#00FF8822', color: '#00FF88' },
  URGENT: { label: 'URGENT', bg: '#FF444433', color: '#FF4444' },
  SIGNAL: { label: 'SIGNAL', bg: '#FF880033', color: '#FF8800' },
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const d = new Date(timeStr);
  return d.toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function ProjectCard({ project, status, alerts }) {
  const st = STATUS_CONFIG[status] || STATUS_CONFIG.STANDBY;
  const [expanded, setExpanded] = useState(false);
  const [sources, setSources] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    if (!sources) {
      setLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/project/${project.id}/sources`);
        const data = await res.json();
        setSources(data);
      } catch (err) {
        console.error('Failed to load sources:', err);
      } finally {
        setLoading(false);
      }
    }
    setExpanded(true);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        background: 'var(--card-bg)',
        borderLeft: `4px solid ${project.color}`,
        padding: '20px',
        flex: 1,
        minWidth: '250px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        animation: status !== 'STANDBY' ? 'fadeIn 0.5s ease-out' : 'none',
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
      }}>
        <span style={{ fontSize: '11px', color: 'var(--text-dim)', letterSpacing: '2px' }}>
          PROJECT
        </span>
        <span style={{
          fontSize: '11px',
          fontWeight: 700,
          padding: '4px 10px',
          background: st.bg,
          color: st.color,
          letterSpacing: '1px',
          animation: status === 'URGENT' ? 'pulse 1.5s infinite' : 'none',
        }}>
          {st.label}
        </span>
      </div>

      <h3 style={{ fontSize: '16px', color: '#fff', marginBottom: '8px' }}>
        {project.name}
      </h3>

      {project.contact && (
        <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '12px' }}>
          {project.contact}
        </p>
      )}

      {alerts && alerts.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {alerts.map((alert, i) => (
            <li key={i} style={{
              fontSize: '12px',
              color: st.color,
              padding: '6px 0',
              borderTop: '1px solid var(--border)',
              animation: 'slideIn 0.3s ease-out',
              animationDelay: `${i * 0.15}s`,
              animationFillMode: 'both',
            }}>
              {alert}
            </li>
          ))}
        </ul>
      )}

      {/* Expand hint */}
      {!expanded && status !== 'STANDBY' && (
        <div style={{
          fontSize: '10px',
          color: '#555',
          marginTop: '8px',
          letterSpacing: '1px',
          textAlign: 'center',
        }}>
          CLIQUER POUR VOIR LES SOURCES
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{
          fontSize: '11px',
          color: 'var(--text-dim)',
          marginTop: '12px',
          fontStyle: 'italic',
        }}>
          Chargement...
        </div>
      )}

      {/* Sources panel */}
      {expanded && sources && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            marginTop: '14px',
            borderTop: `1px solid ${project.color}33`,
            paddingTop: '14px',
            animation: 'fadeIn 0.3s ease-out',
          }}
        >
          {/* Emails */}
          {sources.emails && sources.emails.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{
                fontSize: '10px',
                color: project.color,
                letterSpacing: '2px',
                marginBottom: '8px',
                fontWeight: 700,
              }}>
                EMAILS
              </div>
              {sources.emails.map((email, i) => (
                <div key={i} style={{
                  padding: '8px 10px',
                  background: '#0d0d0d',
                  borderRadius: '4px',
                  marginBottom: '6px',
                  fontSize: '12px',
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '4px',
                  }}>
                    <span style={{ color: '#e0e0e0', fontWeight: 600 }}>
                      {email.subject}
                    </span>
                    <span style={{
                      fontSize: '10px',
                      color: email.days_since_reply >= 5 ? 'var(--red)' : 'var(--text-dim)',
                    }}>
                      {email.days_since_reply != null ? `${email.days_since_reply}j` : ''}
                    </span>
                  </div>
                  <div style={{ color: '#888', fontSize: '11px', marginBottom: '6px' }}>
                    De : {email.from} &middot; {formatDate(email.date)}
                  </div>
                  <div style={{ color: '#aaa', fontSize: '11px', lineHeight: '1.4', marginBottom: '8px' }}>
                    {email.body}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <a
                      href={`mailto:${email.from}?subject=Re: ${email.subject}`}
                      style={{
                        fontSize: '10px',
                        color: project.color,
                        textDecoration: 'none',
                        padding: '3px 8px',
                        border: `1px solid ${project.color}44`,
                        borderRadius: '3px',
                        letterSpacing: '0.5px',
                      }}
                    >
                      REPONDRE
                    </a>
                    <a
                      href={`https://mail.google.com/mail/u/0/#search/from:${email.from}+subject:${encodeURIComponent(email.subject)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '10px',
                        color: '#888',
                        textDecoration: 'none',
                        padding: '3px 8px',
                        border: '1px solid #333',
                        borderRadius: '3px',
                        letterSpacing: '0.5px',
                      }}
                    >
                      OUVRIR DANS GMAIL
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Events */}
          {sources.events && sources.events.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{
                fontSize: '10px',
                color: project.color,
                letterSpacing: '2px',
                marginBottom: '8px',
                fontWeight: 700,
              }}>
                CALENDRIER
              </div>
              {sources.events.map((event, i) => (
                <div key={i} style={{
                  padding: '8px 10px',
                  background: '#0d0d0d',
                  borderRadius: '4px',
                  marginBottom: '6px',
                  fontSize: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <div style={{ color: '#e0e0e0', fontWeight: 600 }}>
                      {event.title}
                    </div>
                    <div style={{ color: '#888', fontSize: '11px', marginTop: '2px' }}>
                      {formatTime(event.time)}
                      {event.prep_block
                        ? <span style={{ color: 'var(--green)', marginLeft: '8px' }}>Prep OK</span>
                        : <span style={{ color: 'var(--red)', marginLeft: '8px' }}>Pas de prep</span>
                      }
                    </div>
                  </div>
                  <a
                    href={`https://calendar.google.com/calendar/r/search?q=${encodeURIComponent(event.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '10px',
                      color: '#888',
                      textDecoration: 'none',
                      padding: '3px 8px',
                      border: '1px solid #333',
                      borderRadius: '3px',
                      letterSpacing: '0.5px',
                      flexShrink: 0,
                    }}
                  >
                    AGENDA
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* Web signal */}
          {sources.search && (
            <div>
              <div style={{
                fontSize: '10px',
                color: project.color,
                letterSpacing: '2px',
                marginBottom: '8px',
                fontWeight: 700,
              }}>
                SIGNAL EXTERNE
              </div>
              <div style={{
                padding: '8px 10px',
                background: '#0d0d0d',
                borderRadius: '4px',
                fontSize: '12px',
                color: '#aaa',
                lineHeight: '1.4',
              }}>
                {sources.search}
              </div>
            </div>
          )}

          {/* Collapse hint */}
          <div style={{
            fontSize: '10px',
            color: '#444',
            marginTop: '10px',
            letterSpacing: '1px',
            textAlign: 'center',
          }}>
            CLIQUER POUR FERMER
          </div>
        </div>
      )}
    </div>
  );
}
