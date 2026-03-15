import React, { useRef, useEffect } from 'react';
import { Msg } from './Msg';
import type { TranscriptPanelProps } from '../types';

export const TranscriptPanel: React.FC<TranscriptPanelProps> = ({
  label, dotColor, messages, showTyping, typingRole, hint,
}) => {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length, showTyping]);

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden card-hover"
      style={{ background: 'var(--paper)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>

      <div className="flex items-center justify-between px-5 py-3.5 shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--canvas)' }}>
        <div className="flex items-center gap-2.5">
          <span className="size-2 rounded-full blink" style={{ background: dotColor }} />
          <span className="text-[10px] font-black uppercase tracking-[.14em]" style={{ color: 'var(--ink-3)' }}>{label}</span>
        </div>
        <span className="mono text-[10px]" style={{ color: 'var(--ink-4)' }}>{messages.length} lines</span>
      </div>

      <div className="thin-scroll overflow-y-auto px-5 py-4 space-y-3" style={{ height: '200px' }}>
        {messages.length === 0 && !showTyping
          ? <div className="h-full flex flex-col items-center justify-center gap-2 opacity-40">
            <span className="material-symbols-outlined text-3xl" style={{ color: 'var(--ink-4)' }}>chat_bubble_outline</span>
            <p className="text-[11px] text-center font-medium max-w-[170px]" style={{ color: 'var(--ink-3)' }}>{hint}</p>
          </div>
          : <>
            {messages.map(m => <Msg key={m.id} side={m.side} text={m.text} />)}
            {showTyping && <Msg side={typingRole} text="" isTyping />}
          </>
        }
        <div ref={endRef} />
      </div>
    </div>
  );
};