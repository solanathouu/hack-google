import { useState, useEffect, useRef, useCallback } from 'react';

// 4-pointed star path centered at (0,0), size ~1 unit
const STAR_PATH = 'M 0 -1 C 0.12 -0.12, 0.12 -0.12, 1 0 C 0.12 0.12, 0.12 0.12, 0 1 C -0.12 0.12, -0.12 0.12, -1 0 C -0.12 -0.12, -0.12 -0.12, 0 -1 Z';

// Smile mouth: a crescent arc
const SMILE_PATH = 'M -12 0 C -8 10, 8 10, 12 0 C 8 4, -8 4, -12 0 Z';

// Open mouth: rounder, taller
const OPEN_PATH = 'M -10 -4 C -8 12, 8 12, 10 -4 C 6 6, -6 6, -10 -4 Z';

export default function OppyFace({ phase, size = 180 }) {
  const svgRef = useRef(null);

  // --- Eye tracking ---
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const max = 5;
    const factor = Math.min(dist / 300, 1);
    setEyeOffset({
      x: (dx / (dist || 1)) * max * factor,
      y: (dy / (dist || 1)) * max * factor,
    });
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  // --- Blink ---
  const [blinkScale, setBlinkScale] = useState(1);

  useEffect(() => {
    if (phase !== 'IDLE' && phase !== 'LISTENING') return;
    let timer;
    const doBlink = () => {
      setBlinkScale(0.05);
      setTimeout(() => setBlinkScale(1), 120);
      timer = setTimeout(doBlink, 2500 + Math.random() * 4000);
    };
    timer = setTimeout(doBlink, 2000 + Math.random() * 3000);
    return () => clearTimeout(timer);
  }, [phase]);

  // --- Speaking mouth toggle ---
  const [mouthOpen, setMouthOpen] = useState(false);

  useEffect(() => {
    if (phase !== 'SPEAKING') {
      setMouthOpen(false);
      return;
    }
    const interval = setInterval(() => {
      setMouthOpen(prev => !prev);
    }, 200 + Math.random() * 150);
    return () => clearInterval(interval);
  }, [phase]);

  // --- Thinking: eyes spin ---
  const thinkRotate = phase === 'THINKING';

  const mouthPath = mouthOpen ? OPEN_PATH : SMILE_PATH;

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 100 100"
      width={size}
      height={size}
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* Gemini star gradient */}
        <radialGradient id="starGrad" cx="50%" cy="50%" r="60%" fx="35%" fy="30%">
          <stop offset="0%" stopColor="#4285f4" />
          <stop offset="30%" stopColor="#4285f4" />
          <stop offset="50%" stopColor="#34a853" />
          <stop offset="70%" stopColor="#fbbc04" />
          <stop offset="90%" stopColor="#ea4335" />
        </radialGradient>

        {/* Mouth gradient */}
        <linearGradient id="mouthGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbc04" />
          <stop offset="50%" stopColor="#34a853" />
          <stop offset="100%" stopColor="#4285f4" />
        </linearGradient>
      </defs>

      {/* Left eye (star) */}
      <g
        transform={`translate(${34 + eyeOffset.x}, ${38 + eyeOffset.y})`}
        style={{
          transition: 'transform 0.12s ease-out',
        }}
      >
        <g
          transform={`scale(14, ${14 * blinkScale})`}
          style={{
            transition: 'transform 0.08s ease-in-out',
            transformOrigin: '0 0',
          }}
        >
          <g style={{
            animation: thinkRotate ? 'eyeSpin 1.5s linear infinite' : 'none',
            transformOrigin: '0 0',
          }}>
            <path d={STAR_PATH} fill="url(#starGrad)" />
          </g>
        </g>
      </g>

      {/* Right eye (star) */}
      <g
        transform={`translate(${66 + eyeOffset.x}, ${38 + eyeOffset.y})`}
        style={{
          transition: 'transform 0.12s ease-out',
        }}
      >
        <g
          transform={`scale(14, ${14 * blinkScale})`}
          style={{
            transition: 'transform 0.08s ease-in-out',
            transformOrigin: '0 0',
          }}
        >
          <g style={{
            animation: thinkRotate ? 'eyeSpin 1.5s linear infinite reverse' : 'none',
            transformOrigin: '0 0',
          }}>
            <path d={STAR_PATH} fill="url(#starGrad)" />
          </g>
        </g>
      </g>

      {/* Mouth */}
      <g
        transform="translate(50, 65)"
        style={{
          transition: 'transform 0.15s ease-in-out',
        }}
      >
        <path
          d={mouthPath}
          fill="url(#mouthGrad)"
          style={{
            transition: 'd 0.12s ease-in-out',
          }}
        />
      </g>
    </svg>
  );
}
