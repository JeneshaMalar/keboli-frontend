import React, { useState, useEffect } from 'react';
import type { TimerProps } from '../types';

const fmt = (s: number) =>
  `${Math.floor((s % 3600) / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

export const Timer: React.FC<TimerProps> = ({ durationMinutes, onTimeUp, syncedSecs }) => {
  const [secs, setSecs] = useState(durationMinutes * 60);

  useEffect(() => {
    if (syncedSecs !== undefined) {
      setSecs(syncedSecs);
    }
  }, [syncedSecs]);

  useEffect(() => {
    if (secs <= 0) { onTimeUp(); return; }
    const t = setInterval(() => setSecs(p => p - 1), 1000);
    return () => clearInterval(t);
  }, [secs, onTimeUp]);

  const pct = Math.max(0, secs / (durationMinutes * 60)) * 100;
  const isLow = secs > 0 && secs < 300;
  const done = secs <= 0;
  const clr = done ? 'var(--rose)' : isLow ? 'var(--amber)' : 'var(--violet)';
  const C = 2 * Math.PI * 16;

  return (
    <div className="flex items-center gap-3">
      <div className="relative size-10 shrink-0">
        <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90">
          <circle cx="20" cy="20" r="16" fill="none" stroke="var(--border)" strokeWidth="3" />
          <circle cx="20" cy="20" r="16" fill="none" stroke={clr} strokeWidth="3"
            strokeDasharray={`${(pct / 100) * C} ${C}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s linear, stroke .4s ease' }} />
        </svg>
        <span className="material-symbols-outlined absolute inset-0 flex items-center justify-center text-[12px]"
          style={{ color: clr }}>schedule</span>
      </div>
      <div className="leading-none">
        <p className="text-[9px] font-black uppercase tracking-[.15em] mb-1" style={{ color: 'var(--ink-3)' }}>Remaining</p>
        <p className="mono text-[15px] font-medium" style={{ color: done ? 'var(--rose)' : isLow ? 'var(--amber)' : 'var(--ink)' }}>
          {done ? '00:00' : fmt(secs)}
        </p>
      </div>
    </div>
  );
};