import React from 'react';
import type { MsgProps } from '../types';

export const Msg: React.FC<MsgProps> = ({ side, text, isTyping }) => {
  const isAI = side === 'ai';
  
  return (
    <div className={`msg-in flex items-end gap-2 ${isAI ? '' : 'flex-row-reverse'}`}>
      <span className="mono text-[9px] font-medium shrink-0 mb-1 px-2 py-[3px] rounded-md border"
        style={isAI
          ? { color: 'var(--violet)', background: 'var(--violet-l)', borderColor: '#d4cafd' }
          : { color: 'var(--teal)', background: 'var(--teal-l)', borderColor: '#9de8e5' }}>
        {isAI ? 'AI' : 'YOU'}
      </span>

      <div className="max-w-[84%] px-4 py-3 rounded-2xl text-[13px] leading-relaxed shadow-sm"
        style={isAI
          ? { background: 'var(--paper)', border: '1px solid var(--border)', color: 'var(--ink-2)', borderRadius: '18px 18px 18px 4px' }
          : { background: 'var(--violet)', color: '#fff', borderRadius: '18px 18px 4px 18px' }}>
        {isTyping
          ? <span className="flex items-center gap-1.5 h-4">
            {[0, .18, .36].map((d, i) => (
              <span key={i} className="size-1.5 rounded-full blink"
                style={{ background: isAI ? 'var(--ink-4)' : 'rgba(255,255,255,.5)', animationDelay: `${d}s` }} />
            ))}
          </span>
          : text}
      </div>
    </div>
  );
};