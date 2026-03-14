import { useState } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const STATUS_CONFIG = {
  STANDBY: { label: 'STANDBY', bg: '#f1f3f4', color: '#5f6368' },
  READY: { label: 'READY', bg: 'rgba(52,168,83,0.1)', color: '#1e8e3e' },
  URGENT: { label: 'URGENT', bg: 'rgba(234,67,53,0.1)', color: '#d93025' },
  SIGNAL: { label: 'SIGNAL', bg: 'rgba(251,188,4,0.1)', color: '#e37400' },
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
    if (expanded) { setExpanded(false); return; }
    if (!sources) {
      setLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/project/${project.id}/sources`);
        setSources(await res.json());
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    setExpanded(true);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        background: '#ffffff',
        border: '1px solid #e0e0e0',
        borderLeft: `4px solid ${project.color}`,
        borderRadius: '12px',
        padding: '16px 20px',
        flex: '1 1 280px',
        minWidth: '0',
        maxWidth: '100%',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s',
        overflow: 'hidden',
        wordBreak: 'break-word',
      }}
      onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'}
      onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ fontSize: '11px', color: '#5f6368', letterSpacing: '1px', fontWeight: 500 }}>
          PROJET
        </span>
        <span style={{
          fontSize: '11px', fontWeight: 600, padding: '3px 10px',
          background: st.bg, color: st.color, borderRadius: '10px',
          animation: status === 'URGENT' ? 'pulse 1.5s infinite' : 'none',
        }}>
          {st.label}
        </span>
      </div>

      <h3 style={{ fontSize: '15px', color: '#1f1f1f', marginBottom: '6px', fontWeight: 600 }}>
        {project.name}
      </h3>

      {project.contact && (
        <p style={{ fontSize: '12px', color: '#5f6368', marginBottom: '10px' }}>{project.contact}</p>
      )}

      {alerts && alerts.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {alerts.map((alert, i) => (
            <li key={i} style={{
              fontSize: '12px', color: st.color, padding: '5px 0',
              borderTop: '1px solid #f1f3f4',
            }}>
              {alert}
            </li>
          ))}
        </ul>
      )}

      {!expanded && (
        <div style={{ fontSize: '11px', color: '#9aa0a6', marginTop: '8px', textAlign: 'center' }}>
          Cliquer pour voir les sources
        </div>
      )}

      {loading && (
        <div style={{ fontSize: '12px', color: '#5f6368', marginTop: '10px', fontStyle: 'italic' }}>
          Chargement...
        </div>
      )}

      {expanded && sources && (
        <div onClick={(e) => e.stopPropagation()} style={{
          marginTop: '14px', borderTop: '1px solid #e0e0e0', paddingTop: '14px',
          animation: 'fadeIn 0.3s ease-out',
        }}>
          {/* Emails */}
          {sources.emails && sources.emails.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: project.color, letterSpacing: '1px', marginBottom: '8px', fontWeight: 600 }}>
                EMAILS
              </div>
              {sources.emails.map((email, i) => (
                <div key={i} style={{
                  padding: '10px 12px', background: '#f8f9fa', borderRadius: '8px',
                  marginBottom: '6px', fontSize: '13px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ color: '#1f1f1f', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{email.subject}</span>
                    <span style={{
                      fontSize: '11px',
                      color: email.days_since_reply >= 5 ? '#d93025' : '#5f6368',
                      fontWeight: email.days_since_reply >= 5 ? 600 : 400,
                    }}>
                      {email.days_since_reply != null ? `${email.days_since_reply}j` : ''}
                    </span>
                  </div>
                  <div style={{ color: '#5f6368', fontSize: '12px', marginBottom: '6px' }}>
                    De : {email.from} &middot; {formatDate(email.date)}
                  </div>
                  <div style={{ color: '#3c4043', fontSize: '12px', lineHeight: '1.5', marginBottom: '8px' }}>
                    {email.body}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <a
                      href={`mailto:${email.from}?subject=Re: ${email.subject}`}
                      style={{
                        fontSize: '11px', color: '#4285f4', textDecoration: 'none',
                        padding: '4px 10px', border: '1px solid #4285f4',
                        borderRadius: '14px', fontWeight: 500,
                      }}
                    >
                      Repondre
                    </a>
                    <a
                      href={`https://mail.google.com/mail/u/0/#search/from:${email.from}+subject:${encodeURIComponent(email.subject)}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{
                        fontSize: '11px', color: '#5f6368', textDecoration: 'none',
                        padding: '4px 10px', border: '1px solid #e0e0e0',
                        borderRadius: '14px',
                      }}
                    >
                      Ouvrir dans Gmail
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Events */}
          {sources.events && sources.events.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: project.color, letterSpacing: '1px', marginBottom: '8px', fontWeight: 600 }}>
                CALENDRIER
              </div>
              {sources.events.map((event, i) => (
                <div key={i} style={{
                  padding: '10px 12px', background: '#f8f9fa', borderRadius: '8px',
                  marginBottom: '6px', fontSize: '13px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ color: '#1f1f1f', fontWeight: 600 }}>{event.title}</div>
                    <div style={{ color: '#5f6368', fontSize: '12px', marginTop: '2px' }}>
                      {formatTime(event.time)}
                      {event.prep_block
                        ? <span style={{ color: '#1e8e3e', marginLeft: '8px', fontWeight: 500 }}>Prep OK</span>
                        : <span style={{ color: '#d93025', marginLeft: '8px', fontWeight: 500 }}>Pas de prep</span>
                      }
                    </div>
                  </div>
                  <a
                    href={`https://calendar.google.com/calendar/r/search?q=${encodeURIComponent(event.title)}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{
                      fontSize: '11px', color: '#4285f4', textDecoration: 'none',
                      padding: '4px 10px', border: '1px solid #4285f4',
                      borderRadius: '14px', fontWeight: 500, flexShrink: 0,
                    }}
                  >
                    Ouvrir l'agenda
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* Web signal */}
          {sources.search && (
            <div>
              <div style={{ fontSize: '11px', color: project.color, letterSpacing: '1px', marginBottom: '8px', fontWeight: 600 }}>
                SIGNAL EXTERNE
              </div>
              <div style={{
                padding: '10px 12px', background: '#f8f9fa', borderRadius: '8px',
                fontSize: '12px', color: '#3c4043', lineHeight: '1.5',
              }}>
                {sources.search}
              </div>
            </div>
          )}

          <div style={{ fontSize: '11px', color: '#9aa0a6', marginTop: '12px', textAlign: 'center' }}>
            Cliquer pour fermer
          </div>
        </div>
      )}
    </div>
  );
}
