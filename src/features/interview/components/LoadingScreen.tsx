import React from 'react';
import { STYLES } from '../styles/styles';
import type { LoadingScreenProps } from '../types';

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  validating, error, alreadyCompleted, onRetry 
}) => (
  <div className="min-h-screen canvas-bg flex items-center justify-center p-6">
    <style>{STYLES}</style>

    <div className="fixed top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none -z-10"
      style={{ background: 'radial-gradient(circle, rgba(91,60,245,.05) 0%, transparent 70%)' }} />
    <div className="fixed bottom-0 left-0 w-[400px] h-[400px] rounded-full pointer-events-none -z-10"
      style={{ background: 'radial-gradient(circle, rgba(14,168,160,.05) 0%, transparent 70%)' }} />

    <div className="fade-up w-full max-w-[360px] text-center space-y-8">
      <div className="flex justify-center">
        <div className="relative size-20">
          <div className="absolute inset-0 rounded-2xl rotate-6 opacity-50" style={{ background: 'var(--violet-l)' }} />
          <div className="absolute inset-0 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--paper)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
            <span className="material-symbols-outlined text-4xl" style={{ color: 'var(--violet)' }}>smart_toy</span>
          </div>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-black tracking-tight mb-2" style={{ color: 'var(--ink)' }}>Interview Room</h1>
        <p className="text-[13px] font-medium" style={{ color: 'var(--ink-3)' }}>
          {validating ? 'Establishing your secure session…' : error ? 'Connection failed' : 'Preparing session…'}
        </p>
      </div>

      {validating && (
        <div className="flex flex-col items-center gap-3">
          <div className="relative size-10">
            <div className="absolute inset-0 rounded-full" style={{ border: '2px solid var(--border)' }} />
            <div className="absolute inset-0 rounded-full border-t-2 animate-spin" style={{ borderColor: 'var(--violet)' }} />
          </div>
          <p className="mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--ink-4)' }}>Connecting…</p>
        </div>
      )}

      {error && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-2xl text-left"
            style={{ background: '#fff1f2', border: '1px solid #fecdd3' }}>
            <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5" style={{ color: 'var(--rose)' }}>error_outline</span>
            <p className="text-[13px] font-medium leading-relaxed" style={{ color: '#9f1239' }}>{error}</p>
          </div>
          {!alreadyCompleted && (
            <button onClick={onRetry}
              className="w-full py-3.5 rounded-xl text-white text-sm font-black uppercase tracking-wider transition-all active:scale-[.98]"
              style={{ background: 'var(--ink)', boxShadow: '0 4px 20px rgba(14,14,17,.2)' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#1e1e24')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--ink)')}>
              Retry Connection
            </button>
          )}
        </div>
      )}

      {!validating && !error && (
        <div className="flex justify-center">
          <div className="size-10 rounded-full border-t-2 animate-spin" style={{ border: '2px solid var(--border)', borderTopColor: 'var(--violet)' }} />
        </div>
      )}
    </div>
  </div>
);