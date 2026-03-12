import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  LiveKitRoom, useVoiceAssistant, BarVisualizer, RoomAudioRenderer,
  useRoomContext, VideoTrack, useTracks, useTranscriptions,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track, RoomEvent } from 'livekit-client';
import api from '../../../lib/axios';
import Modal from '../../../components/ui/Modal';
import type { Invitation } from '../../candidate/services/invitationService';



const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,900;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');

  :root {
    --ink:     #0e0e11;
    --ink-2:   #3d3d46;
    --ink-3:   #8b8b99;
    --ink-4:   #c4c4cc;
    --canvas:  #f7f6f2;
    --paper:   #ffffff;
    --violet:  #5b3cf5;
    --violet-l:#ede9fe;
    --violet-m:#7c5cfc;
    --teal:    #0ea8a0;
    --teal-l:  #ccf5f3;
    --amber:   #e8770d;
    --rose:    #e8364a;
    --border:  #e8e7e3;
    --shadow:  0 1px 3px rgba(14,14,17,.06), 0 4px 16px rgba(14,14,17,.06);
    --shadow-lg: 0 2px 8px rgba(14,14,17,.08), 0 12px 40px rgba(14,14,17,.10);
  }

  * { font-family: 'DM Sans', sans-serif; }
  .mono { font-family: 'DM Mono', monospace; }

  .mirror { transform: scaleX(-1); }

  /* Page fade-in */
  @keyframes fade-up {
    from { opacity:0; transform:translateY(14px); }
    to   { opacity:1; transform:translateY(0); }
  }
  .fade-up { animation: fade-up .5s cubic-bezier(.16,1,.3,1) both; }
  .delay-1 { animation-delay:.08s; }
  .delay-2 { animation-delay:.16s; }
  .delay-3 { animation-delay:.24s; }

  /* Active speaking ring — violet */
  @keyframes ring-v {
    0%   { box-shadow: 0 0 0 0px rgba(91,60,245,.5); }
    70%  { box-shadow: 0 0 0 10px rgba(91,60,245,0); }
    100% { box-shadow: 0 0 0 0px rgba(91,60,245,0); }
  }
  .ring-violet { animation: ring-v 1.8s ease-out infinite; }

  /* Active listening ring — teal */
  @keyframes ring-t {
    0%   { box-shadow: 0 0 0 0px rgba(14,168,160,.5); }
    70%  { box-shadow: 0 0 0 10px rgba(14,168,160,0); }
    100% { box-shadow: 0 0 0 0px rgba(14,168,160,0); }
  }
  .ring-teal { animation: ring-t 1.6s ease-out infinite; }

  /* Dot blink */
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.2} }
  .blink { animation: blink 1.2s ease-in-out infinite; }

  /* Wave bars */
  @keyframes wave-a { 0%,100%{transform:scaleY(.25)} 50%{transform:scaleY(1)} }
  @keyframes wave-b { 0%,100%{transform:scaleY(.55)} 50%{transform:scaleY(.3)} }
  @keyframes wave-c { 0%,100%{transform:scaleY(.35)} 50%{transform:scaleY(.9)} }

  /* Transcript message appear */
  @keyframes msg-in {
    from { opacity:0; transform:translateY(6px) scale(.98); }
    to   { opacity:1; transform:translateY(0) scale(1); }
  }
  .msg-in { animation: msg-in .3s cubic-bezier(.16,1,.3,1) both; }

  /* Thin scroll */
  .thin-scroll::-webkit-scrollbar { width:3px; }
  .thin-scroll::-webkit-scrollbar-track { background:transparent; }
  .thin-scroll::-webkit-scrollbar-thumb { background:var(--border); border-radius:99px; }

  /* Subtle page texture */
  .canvas-bg {
    background-color: var(--canvas);
    background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.018'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  }

  /* Card elevation on hover */
  .card-hover { transition: box-shadow .25s ease, transform .25s ease; }
  .card-hover:hover { box-shadow: var(--shadow-lg); }

  /* Gradient divider */
  .grad-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--border) 30%, var(--border) 70%, transparent);
  }
`;

/* ── Utilities ────────────────────────────────────────────────────────────── */
const fmt = (s: number) =>
  `${Math.floor((s % 3600) / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

/* ── Wave bars ────────────────────────────────────────────────────────────── */
const WaveBars = ({ active, color }: { active: boolean; color: string }) => {
  const anims = ['wave-a', 'wave-c', 'wave-b', 'wave-a', 'wave-c'];
  const delays = [0, .1, .2, .1, 0];
  return (
    <div className={`flex items-center gap-[3px] h-5 transition-opacity duration-400 ${active ? 'opacity-100' : 'opacity-0'}`}>
      {anims.map((a, i) => (
        <span key={i} className="w-[3px] rounded-full origin-bottom block" style={{
          height: '18px', backgroundColor: color,
          animation: active ? `${a} .8s ease-in-out ${delays[i]}s infinite` : 'none',
        }} />
      ))}
    </div>
  );
};

/* ── Arc Timer ────────────────────────────────────────────────────────────── */
const Timer = ({ durationMinutes, onTimeUp }: { durationMinutes: number; onTimeUp: () => void }) => {
  const [secs, setSecs] = useState(durationMinutes * 60);
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

/* ── Chat Message ─────────────────────────────────────────────────────────── */
const Msg = ({ side, text, isTyping }: { side: 'ai' | 'you'; text: string; isTyping?: boolean }) => {
  const isAI = side === 'ai';
  return (
    <div className={`msg-in flex items-end gap-2 ${isAI ? '' : 'flex-row-reverse'}`}>
      {/* Label chip */}
      <span className="mono text-[9px] font-medium shrink-0 mb-1 px-2 py-[3px] rounded-md border"
        style={isAI
          ? { color: 'var(--violet)', background: 'var(--violet-l)', borderColor: '#d4cafd' }
          : { color: 'var(--teal)', background: 'var(--teal-l)', borderColor: '#9de8e5' }}>
        {isAI ? 'AI' : 'YOU'}
      </span>

      {/* Bubble */}
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

/* ── Transcript Panel ─────────────────────────────────────────────────────── */
const TranscriptPanel = ({
  label, dotColor, messages, showTyping, typingRole, hint,
}: {
  label: string; dotColor: string;
  messages: { id: string; side: 'ai' | 'you'; text: string }[];
  showTyping: boolean; typingRole: 'ai' | 'you'; hint: string;
}) => {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length, showTyping]);

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden card-hover"
      style={{ background: 'var(--paper)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--canvas)' }}>
        <div className="flex items-center gap-2.5">
          <span className="size-2 rounded-full blink" style={{ background: dotColor }} />
          <span className="text-[10px] font-black uppercase tracking-[.14em]" style={{ color: 'var(--ink-3)' }}>{label}</span>
        </div>
        <span className="mono text-[10px]" style={{ color: 'var(--ink-4)' }}>{messages.length} lines</span>
      </div>

      {/* Messages */}
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

/* ── Video Card ───────────────────────────────────────────────────────────── */
const VideoCard = ({
  children, isActive, activeColor, ringClass,
}: {
  children: React.ReactNode;
  isActive: boolean;
  activeColor: string;
  ringClass: string;
}) => (
  <div className={`relative rounded-3xl overflow-hidden bg-white card-hover ${isActive ? ringClass : ''}`}
    style={{
      aspectRatio: '4/3',
      border: `2px solid ${isActive ? activeColor : 'var(--border)'}`,
      boxShadow: isActive
        ? `0 0 0 4px ${activeColor}22, var(--shadow-lg)`
        : 'var(--shadow)',
      transition: 'border-color .4s ease, box-shadow .4s ease',
    }}>
    {children}
  </div>
);

/* ── Interview Stage ──────────────────────────────────────────────────────── */
const InterviewStage: React.FC<{
  onDisconnect: () => void;
  sessionId: string | null;
  invitation: Invitation | null;
}> = ({ onDisconnect, sessionId, invitation }) => {
  const room = useRoomContext();
  const va = useVoiceAssistant();
  const [confirm, setConfirm] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [buffer, setBuffer] = useState(120);
  const [dbTx, setDbTx] = useState<any[]>([]);

  const speaking = va.state === 'speaking';
  const listening = va.state === 'listening';
  const duration = invitation?.assessment?.duration_minutes ?? 20;
  const online = room.state === 'connected';

  useEffect(() => {
    if (!sessionId || !online) return;
    const run = async () => {
      try { const r = await api.get(`/evaluation/transcript/${sessionId}`); if (Array.isArray(r.data)) setDbTx(r.data); } catch { }
    };
    run(); const id = setInterval(run, 3000); return () => clearInterval(id);
  }, [sessionId, online]);

  useEffect(() => {
    if (!timeUp) return;
    if (!(speaking || listening) || buffer <= 0) { onDisconnect(); return; }
    const id = setInterval(() => setBuffer(p => p - 1), 1000);
    return () => clearInterval(id);
  }, [timeUp, speaking, listening, buffer, onDisconnect]);

  useEffect(() => {
    if (!sessionId || !online) return;
    const id = setInterval(async () => { try { await api.post(`/livekit/session/heartbeat/${sessionId}`); } catch { } }, 5000);
    return () => clearInterval(id);
  }, [sessionId, online]);

  // ── Listen for interview_ended data message from backend (Approach A) ──
  const interviewEndedRef = useRef(false);
  useEffect(() => {
    if (!room || !online) return;

    const handleDataReceived = (payload: Uint8Array, _participant: any, _kind: any, topic?: string) => {
      // Only process messages on the interview_control topic
      if (topic !== 'interview_control') return;
      if (interviewEndedRef.current) return; // Already handled

      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (data.type === 'interview_ended' && data.auto_submit) {
          interviewEndedRef.current = true;
          console.log(`[Interview] Received interview_ended signal (reason=${data.reason}). Auto-submitting in 3s...`);
          // Brief delay so candidate can see/hear the closing message
          setTimeout(() => {
            if (!interviewEndedRef.current) return; // Double check
            onDisconnect();
          }, 3000);
        }
      } catch (e) {
        console.warn('[Interview] Failed to parse data message:', e);
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);
    return () => { room.off(RoomEvent.DataReceived, handleDataReceived); };
  }, [room, online, onDisconnect]);

  // ── Fallback: poll session status in case LiveKit data message is missed ──
  useEffect(() => {
    if (!sessionId || !online) return;
    const id = setInterval(async () => {
      if (interviewEndedRef.current) return; // Already handled
      try {
        const res = await api.get(`/livekit/session/${sessionId}/status`);
        if (res.data?.is_completed) {
          interviewEndedRef.current = true;
          console.log('[Interview] Session status polling detected completion. Auto-submitting...');
          setTimeout(() => onDisconnect(), 2000);
        }
      } catch { }
    }, 5000);
    return () => clearInterval(id);
  }, [sessionId, online, onDisconnect]);

  const allTracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: false }], { onlySubscribed: true });
  const localTracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: false }], { onlySubscribed: false })
    .filter(t => t.participant.identity === room.localParticipant.identity);

  const agentTrack = allTracks.find(t => t.participant.identity !== room.localParticipant.identity) as any;
  const localTrack = localTracks[0] as any;
  const segs = (useTranscriptions() ?? []) as any[];

  // Build message arrays
  const aiMsgs: { id: string; side: 'ai'; text: string }[] = dbTx
    .filter(t => t.role?.toLowerCase() === 'interviewer')
    .map((t, i) => ({ id: `ai${i}`, side: 'ai', text: t.content || t.text || '' }));

  const youMsgs: { id: string; side: 'you'; text: string }[] = dbTx
    .filter(t => t.role?.toLowerCase() === 'candidate')
    .map((t, i) => ({ id: `me${i}`, side: 'you', text: t.content || t.text || '' }));

  if (!aiMsgs.length)
    segs.filter(s => { const p = (s as any).participant; const id = typeof p === 'string' ? p : p?.identity; return id && id !== room.localParticipant.identity; })
      .forEach((s, i) => aiMsgs.push({ id: `ls${i}`, side: 'ai', text: (s as any).text }));

  if (!youMsgs.length)
    segs.filter(s => { const p = (s as any).participant; const id = typeof p === 'string' ? p : p?.identity; return id === room.localParticipant.identity; })
      .forEach((s, i) => youMsgs.push({ id: `lm${i}`, side: 'you', text: (s as any).text }));

  return (
    <>
      <style>{STYLES}</style>

      {/* ── BACKGROUND ─────────────────────────────────────────────────────── */}
      <div className="fixed inset-0 canvas-bg -z-10" />

      {/* Decorative blobs — very subtle */}
      <div className="fixed top-[-20%] right-[-10%] w-[480px] h-[480px] rounded-full -z-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(91,60,245,.06) 0%, transparent 70%)' }} />
      <div className="fixed bottom-[-15%] left-[-8%] w-[400px] h-[400px] rounded-full -z-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(14,168,160,.05) 0%, transparent 70%)' }} />

      {/* ── TOPBAR ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 fade-up"
        style={{ background: 'rgba(247,246,242,.88)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto px-8 h-[64px] flex items-center justify-between gap-6">

          {/* Logo + title */}
          <div className="flex items-center gap-4 shrink-0">
            {/* Geometric mark */}
            <div className="relative size-9 shrink-0">
              <div className="absolute inset-0 rounded-xl rotate-6" style={{ background: 'var(--violet-l)' }} />
              <div className="absolute inset-0 rounded-xl flex items-center justify-center" style={{ background: 'var(--violet)' }}>
                <span className="material-symbols-outlined text-white text-[17px]">smart_toy</span>
              </div>
            </div>
            <div className="leading-none">
              <p className="text-[8px] font-black uppercase tracking-[.18em] mb-1" style={{ color: 'var(--ink-3)' }}>Interview Session</p>
              <p className="text-[14px] font-bold truncate max-w-[200px]" style={{ color: 'var(--ink)' }}>
                {invitation?.assessment?.title ?? 'Assessment'}
              </p>
            </div>
          </div>

          {/* Center strip */}
          <div className="flex items-center gap-5">
            <Timer durationMinutes={duration} onTimeUp={() => setTimeUp(true)} />

            {/* Vertical rule */}
            <div className="h-8 w-px" style={{ background: 'var(--border)' }} />

            {/* Live status badge */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold transition-all duration-300"
              style={speaking
                ? { background: 'var(--violet-l)', color: 'var(--violet)', border: '1px solid #c4b5fd' }
                : listening
                  ? { background: 'var(--teal-l)', color: 'var(--teal)', border: '1px solid #99e0dd' }
                  : { background: 'var(--canvas)', color: 'var(--ink-3)', border: '1px solid var(--border)' }}>
              <span className="size-1.5 rounded-full blink"
                style={{ background: speaking ? 'var(--violet)' : listening ? 'var(--teal)' : 'var(--ink-4)' }} />
              {speaking ? 'AI Speaking' : listening ? 'Listening…' : 'Standby'}
            </div>

            {/* REC chip */}
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
              style={{ background: '#fff1f2', color: 'var(--rose)', border: '1px solid #fecdd3' }}>
              <span className="size-1.5 rounded-full blink" style={{ background: 'var(--rose)' }} />
              REC
            </div>

            {/* Auto-submit */}
            {timeUp && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black"
                style={{ background: '#fff8ed', color: 'var(--amber)', border: '1px solid #fed7aa' }}>
                <span className="material-symbols-outlined text-[13px]">timer</span>
                Submitting {Math.floor(buffer / 60)}:{(buffer % 60).toString().padStart(2, '0')}
              </div>
            )}
          </div>

          {/* Right */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Session ID */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'var(--canvas)', border: '1px solid var(--border)' }}>
              <span className={`size-1.5 rounded-full ${online ? '' : ''}`}
                style={{ background: online ? 'var(--teal)' : 'var(--rose)' }} />
              <span className="mono text-[9px]" style={{ color: 'var(--ink-3)' }}>{sessionId?.slice(0, 12) ?? '—'}</span>
            </div>
            {/* Submit CTA */}
            <button onClick={() => setConfirm(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-wider transition-all active:scale-[.97]"
              style={{
                background: 'var(--ink)', color: '#fff',
                boxShadow: '0 1px 2px rgba(0,0,0,.12), 0 4px 16px rgba(14,14,17,.18)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#1e1e24')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--ink)')}>
              <span className="material-symbols-outlined text-[15px]">check_circle</span>
              Submit
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ───────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-8 pt-8 pb-12">

        {/* Section divider heading */}
        <div className="flex items-center gap-4 mb-7 fade-up delay-1">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] mb-0.5" style={{ color: 'var(--ink-3)' }}>Live Interview</p>
            <p className="text-lg font-black" style={{ color: 'var(--ink)' }}>Two-way session in progress</p>
          </div>
          <div className="flex-1 grad-divider ml-4" />
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
            style={{ background: 'var(--paper)', border: '1px solid var(--border)' }}>
            <span className="size-1.5 rounded-full" style={{ background: online ? 'var(--teal)' : 'var(--rose)' }} />
            <span className="text-[10px] font-bold" style={{ color: 'var(--ink-3)' }}>{online ? 'Connected' : 'Reconnecting…'}</span>
          </div>
        </div>

        {/* Two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 fade-up delay-2">

          {/* ════ INTERVIEWER COLUMN ════════════════════════════════════════ */}
          <div className="flex flex-col gap-5">

            {/* Column header */}
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--violet)', boxShadow: '0 3px 10px rgba(91,60,245,.3)' }}>
                <span className="material-symbols-outlined text-white text-[16px]">smart_toy</span>
              </div>
              <div className="leading-none">
                <p className="text-[13px] font-black" style={{ color: 'var(--ink)' }}>AI Interviewer</p>
                <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--ink-3)' }}>Automated assessment agent</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <WaveBars active={speaking} color="var(--violet)" />
                {speaking && (
                  <span className="text-[10px] font-bold animate-pulse" style={{ color: 'var(--violet)' }}>Speaking</span>
                )}
              </div>
            </div>

            {/* AI video card */}
            <VideoCard isActive={speaking} activeColor="var(--violet)" ringClass="ring-violet">
              {agentTrack
                ? <VideoTrack trackRef={agentTrack} className="absolute inset-0 w-full h-full object-cover" />
                : (
                  /* Refined placeholder */
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-7"
                    style={{
                      background: speaking
                        ? 'linear-gradient(135deg, #f0eeff 0%, #fafafe 60%, #f0f9ff 100%)'
                        : 'linear-gradient(160deg, var(--canvas) 0%, var(--paper) 100%)'
                    }}>

                    {/* Concentric rings */}
                    <div className="relative flex items-center justify-center">
                      {speaking && <>
                        <div className="absolute size-56 rounded-full opacity-20 animate-ping"
                          style={{ border: '1px solid var(--violet)', animationDuration: '2s' }} />
                        <div className="absolute size-44 rounded-full opacity-30"
                          style={{ border: '1px dashed var(--violet)' }} />
                      </>}
                      <div className="absolute size-36 rounded-full opacity-10"
                        style={{ border: '1px solid var(--violet)' }} />

                      {/* Avatar circle */}
                      <div className="relative size-[88px] rounded-full p-[2.5px] transition-all duration-700"
                        style={{
                          background: speaking
                            ? 'linear-gradient(135deg, var(--violet) 0%, #38bdf8 100%)'
                            : 'var(--border)',
                          boxShadow: speaking ? '0 8px 32px rgba(91,60,245,.35)' : '0 4px 16px rgba(0,0,0,.06)',
                        }}>
                        <div className="size-full rounded-full flex items-center justify-center"
                          style={{ background: 'var(--paper)' }}>
                          <span className="material-symbols-outlined text-[44px] transition-colors duration-500"
                            style={{ color: speaking ? 'var(--violet)' : 'var(--ink-4)' }}>smart_toy</span>
                        </div>
                      </div>
                    </div>

                    {/* BarVisualizer */}
                    <div className="w-36">
                      <BarVisualizer state={va.state} barCount={14} trackRef={va.audioTrack} className="h-7 w-full" />
                    </div>

                    {/* State chip */}
                    <div className="px-4 py-2 rounded-xl text-[11px] font-bold transition-all duration-400"
                      style={speaking
                        ? { background: 'var(--violet-l)', color: 'var(--violet)', border: '1px solid #c4b5fd' }
                        : { background: 'var(--canvas)', color: 'var(--ink-3)', border: '1px solid var(--border)' }}>
                      {speaking ? '● Speaking now…' : 'Ready for session'}
                    </div>
                  </div>
                )}

              {/* Card footer badge */}
              <div className="absolute bottom-4 left-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,.8)', boxShadow: '0 1px 6px rgba(0,0,0,.08)' }}>
                  <span className="size-1.5 rounded-full blink" style={{ background: speaking ? 'var(--violet)' : 'var(--ink-4)' }} />
                  <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: 'var(--ink-2)' }}>
                    {speaking ? 'Interviewing' : 'AI Interviewer'}
                  </span>
                </div>
              </div>
            </VideoCard>

            {/* AI Transcript */}
            <TranscriptPanel
              label="Interviewer Transcript"
              dotColor="var(--violet)"
              messages={aiMsgs}
              showTyping={speaking && aiMsgs.length === 0}
              typingRole="ai"
              hint="Questions and prompts appear here as the interview unfolds"
            />
          </div>

          {/* ════ CANDIDATE COLUMN ══════════════════════════════════════════ */}
          <div className="flex flex-col gap-5">

            {/* Column header */}
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--teal)', boxShadow: '0 3px 10px rgba(14,168,160,.3)' }}>
                <span className="material-symbols-outlined text-white text-[16px]">person</span>
              </div>
              <div className="leading-none">
                <p className="text-[13px] font-black" style={{ color: 'var(--ink)' }}>You</p>
                <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--ink-3)' }}>Candidate feed</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <WaveBars active={listening} color="var(--teal)" />
                {listening && (
                  <span className="text-[10px] font-bold animate-pulse" style={{ color: 'var(--teal)' }}>Responding</span>
                )}
              </div>
            </div>

            {/* Candidate video card */}
            <VideoCard isActive={listening} activeColor="var(--teal)" ringClass="ring-teal">
              {localTrack
                ? <VideoTrack trackRef={localTrack} className="absolute inset-0 w-full h-full object-cover mirror" />
                : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4"
                    style={{ background: 'linear-gradient(160deg, var(--canvas) 0%, var(--paper) 100%)' }}>
                    <div className="size-20 rounded-full flex items-center justify-center"
                      style={{ border: '2px dashed var(--border)' }}>
                      <span className="material-symbols-outlined text-4xl" style={{ color: 'var(--ink-4)' }}>videocam_off</span>
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--ink-4)' }}>Camera Inactive</p>
                  </div>
                )}

              {/* Mic badge — top right */}
              <div className="absolute top-4 right-4">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all duration-300"
                  style={listening
                    ? { background: 'var(--teal)', color: '#fff', boxShadow: '0 2px 10px rgba(14,168,160,.4)' }
                    : { background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(10px)', border: '1px solid var(--border)', color: 'var(--ink-3)' }}>
                  <span className={`material-symbols-outlined text-[14px] ${listening ? 'blink' : ''}`}>
                    {listening ? 'mic' : 'mic_none'}
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-wider">{listening ? 'Live' : 'Ready'}</span>
                </div>
              </div>

              {/* Card footer badge */}
              <div className="absolute bottom-4 left-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,.8)', boxShadow: '0 1px 6px rgba(0,0,0,.08)' }}>
                  <span className="size-1.5 rounded-full blink" style={{ background: listening ? 'var(--teal)' : 'var(--ink-4)' }} />
                  <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: 'var(--ink-2)' }}>
                    {listening ? 'Responding' : 'Candidate'}
                  </span>
                </div>
              </div>
            </VideoCard>

            {/* Candidate Transcript */}
            <TranscriptPanel
              label="Your Responses"
              dotColor="var(--teal)"
              messages={youMsgs}
              showTyping={listening && youMsgs.length === 0}
              typingRole="you"
              hint="Your spoken responses are transcribed here in real time"
            />
          </div>
        </div>

        {/* Footer tip */}
        <div className="mt-8 flex items-center justify-center gap-2 fade-up delay-3">
          <div className="h-px w-12" style={{ background: 'var(--border)' }} />
          <p className="text-[11px] font-medium" style={{ color: 'var(--ink-4)' }}>
            Speak naturally — transcripts refresh automatically
          </p>
          <div className="h-px w-12" style={{ background: 'var(--border)' }} />
        </div>
      </main>

      {/* ── MODAL ──────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={confirm}
        onClose={() => setConfirm(false)}
        title="Submit Interview?"
        footer={
          <div className="flex gap-3 w-full">
            <button onClick={() => setConfirm(false)}
              className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
              style={{ background: 'var(--canvas)', color: 'var(--ink-2)', border: '1px solid var(--border)' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#eeeee8')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--canvas)')}>
              Continue Interview
            </button>
            <button onClick={onDisconnect}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all"
              style={{ background: 'var(--ink)', boxShadow: '0 4px 14px rgba(14,14,17,.2)' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#1e1e24')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--ink)')}>
              Confirm & Submit
            </button>
          </div>
        }
      >
        <div className="space-y-3 py-1">
          <div className="flex items-start gap-3 p-4 rounded-xl"
            style={{ background: '#fff8ed', border: '1px solid #fed7aa' }}>
            <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5" style={{ color: 'var(--amber)' }}>warning</span>
            <p className="text-sm font-medium leading-relaxed" style={{ color: '#92400e' }}>
              This is <strong>permanent</strong>. Your responses will be submitted for AI evaluation — you cannot re-enter the session once closed.
            </p>
          </div>
          <p className="mono text-[10px] px-0.5" style={{ color: 'var(--ink-4)' }}>
            {sessionId?.slice(0, 24) ?? '—'}…
          </p>
        </div>
      </Modal>

      <RoomAudioRenderer />
    </>
  );
};

/* ── Loading / error screen ───────────────────────────────────────────────── */
const LoadingScreen = ({ validating, error, onRetry }: { validating: boolean; error: string | null; onRetry: () => void }) => (
  <div className="min-h-screen canvas-bg flex items-center justify-center p-6">
    <style>{STYLES}</style>

    {/* Blobs */}
    <div className="fixed top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none -z-10"
      style={{ background: 'radial-gradient(circle, rgba(91,60,245,.05) 0%, transparent 70%)' }} />
    <div className="fixed bottom-0 left-0 w-[400px] h-[400px] rounded-full pointer-events-none -z-10"
      style={{ background: 'radial-gradient(circle, rgba(14,168,160,.05) 0%, transparent 70%)' }} />

    <div className="fade-up w-full max-w-[360px] text-center space-y-8">
      {/* Mark */}
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
          <button onClick={onRetry}
            className="w-full py-3.5 rounded-xl text-white text-sm font-black uppercase tracking-wider transition-all active:scale-[.98]"
            style={{ background: 'var(--ink)', boxShadow: '0 4px 20px rgba(14,14,17,.2)' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#1e1e24')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--ink)')}>
            Retry Connection
          </button>
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

/* ── Root ─────────────────────────────────────────────────────────────────── */
const CandidateInterviewLive: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [lkToken, setLkToken] = useState<string | null>(null);
  const [lkUrl, setLkUrl] = useState('');
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<Invitation | null>(null);

  const connect = useCallback(async () => {
    if (!token) { setError('No invitation token found in URL.'); return; }
    setValidating(true); setError(null);
    try {
      const inv = await api.get(`/invitation/validate/${token}`);
      setInvitation(inv.data);
      const lk = await api.post(`/livekit/token`, null, { params: { invitation_token: token } });
      setLkToken(lk.data.token); setLkUrl(lk.data.url); setSessionId(lk.data.session_id); setConnected(true);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to start session. Please try again.');
    } finally { setValidating(false); }
  }, [token]);

  const disconnect = useCallback(async () => {
    if (sessionId) {
      try { await api.post(`/livekit/session/${sessionId}/complete`, null, { params: { auto_evaluate: true } }); } catch { }
    }
    setLkToken(null); setLkUrl(''); setSessionId(null); setConnected(false);
    navigate(`/candidate/completion?token=${token}`);
  }, [sessionId, navigate, token]);

  useEffect(() => {
    if (token && !connected && !validating) connect();
  }, [token, connected, validating, connect]);

  if (!connected || !lkToken)
    return <LoadingScreen validating={validating} error={error} onRetry={connect} />;

  return (
    <div className="min-h-screen canvas-bg">
      <style>{STYLES}</style>
      <LiveKitRoom serverUrl={lkUrl} token={lkToken} connect audio video onDisconnected={disconnect} className="w-full">
        <InterviewStage onDisconnect={disconnect} sessionId={sessionId} invitation={invitation} />
      </LiveKitRoom>
    </div>
  );
};

export default CandidateInterviewLive;