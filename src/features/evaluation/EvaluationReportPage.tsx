import { useState, useEffect, useMemo, type JSX } from 'react';
import { useParams } from 'react-router-dom';
// import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
// import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { apiClient } from '../../services/apiClient';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ResponsiveContainer, Tooltip,
} from 'recharts';
import './EvaluationReportPage.css';



const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');

  .report-root * { font-family: 'Sora', sans-serif; }
  .report-root .mono { font-family: 'JetBrains Mono', monospace; }

  @keyframes fade-rise {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .fade-rise { animation: fade-rise .5s cubic-bezier(.16,1,.3,1) both; }
  .delay-1 { animation-delay: .07s; }
  .delay-2 { animation-delay: .14s; }
  .delay-3 { animation-delay: .21s; }
  .delay-4 { animation-delay: .28s; }
  .delay-5 { animation-delay: .35s; }

  @keyframes fill-bar {
    from { width: 0; }
  }
  .fill-bar { animation: fill-bar .9s cubic-bezier(.16,1,.3,1) .2s both; }

  @keyframes score-ring {
    from { stroke-dasharray: 0 327; }
  }
  .score-ring { animation: score-ring 1.2s cubic-bezier(.16,1,.3,1) .3s both; }

  .skill-row { transition: background .15s ease, box-shadow .15s ease; }
  .skill-row:hover { background: #f8fafc !important; box-shadow: 0 2px 8px rgba(37,99,235,.07); }

  .section-card { transition: box-shadow .2s ease; }
  .section-card:hover { box-shadow: 0 2px 8px rgba(15,23,42,.05), 0 8px 28px rgba(15,23,42,.07); }

  .tx-scroll::-webkit-scrollbar { width: 4px; }
  .tx-scroll::-webkit-scrollbar-track { background: transparent; }
  .tx-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 99px; }

  @media print {
    .no-print { display: none !important; }
    .report-root { background: white !important; }
  }
`;

/* ── Inline SVG icons (replaces material-symbols dependency) ─────────────── */
const Icon = {
  download: (cls = '') => (
    <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3v10M6 9l4 4 4-4M3 15v1a2 2 0 002 2h10a2 2 0 002-2v-1" />
    </svg>
  ),
  mail: (cls = '') => (
    <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="16" height="12" rx="2" />
      <path d="M2 7l8 5 8-5" />
    </svg>
  ),
  link: (cls = '') => (
    <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 12a4 4 0 005.66 0l2-2a4 4 0 00-5.66-5.66l-1 1" />
      <path d="M12 8a4 4 0 00-5.66 0l-2 2a4 4 0 005.66 5.66l1-1" />
    </svg>
  ),
  chevronDown: (cls = '') => (
    <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 7.5l5 5 5-5" />
    </svg>
  ),
  verified: (cls = '') => (
    <svg className={cls} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  ),
  thumbUp: (cls = '') => (
    <svg className={cls} viewBox="0 0 20 20" fill="currentColor">
      <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
    </svg>
  ),
  ban: (cls = '') => (
    <svg className={cls} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
    </svg>
  ),
  xCircle: (cls = '') => (
    <svg className={cls} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
  ),
  help: (cls = '') => (
    <svg className={cls} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
  ),
  openInNew: (cls = '') => (
    <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 3h6m0 0v6m0-6L9 11M5 5H4a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1v-1" />
    </svg>
  ),
  barChart: (cls = '') => (
    <svg className={cls} viewBox="0 0 20 20" fill="currentColor">
      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
    </svg>
  ),
  fileText: (cls = '') => (
    <svg className={cls} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
    </svg>
  ),
  chat: (cls = '') => (
    <svg className={cls} viewBox="0 0 20 20" fill="currentColor">
      <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
      <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
    </svg>
  ),
  pencil: (cls = '') => (
    <svg className={cls} viewBox="0 0 20 20" fill="currentColor">
      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
    </svg>
  ),
  star: (cls = '') => (
    <svg className={cls} viewBox="0 0 20 20" fill="currentColor">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  ),
};

/* ── Recommendation config ───────────────────────────────────────────────── */
const REC_MAP: Record<string, { label: string; color: string; bg: string; border: string; icon: JSX.Element }> = {
  STRONG_HIRE: { label: 'Strong Hire', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', icon: Icon.verified('w-4 h-4') },
  HIRE: { label: 'Hire', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', icon: Icon.thumbUp('w-4 h-4') },
  REJECT: { label: 'Reject', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: Icon.xCircle('w-4 h-4') },
};
const getRec = (r: string) => REC_MAP[r?.toUpperCase()] ?? {
  label: r ?? 'Pending', color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', icon: Icon.help('w-4 h-4'),
};

function getInitials(name: string) {
  return name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
}
function scoreColor(n: number) {
  if (n >= 75) return '#059669';
  if (n >= 50) return '#2563eb';
  if (n >= 30) return '#d97706';
  return '#dc2626';
}
function isNumeric(v: any): boolean {
  if (v === null || v === undefined || v === '') return false;
  return !isNaN(Number(v)) && String(v).trim() !== '';
}

/* ── Flatten breakdown into numeric vs text buckets ─────────────────────── */
function flattenBreakdown(obj: any): {
  numeric: { skill: string; score: number }[];
  notes: { skill: string; value: string }[];
} {
  const numeric: { skill: string; score: number }[] = [];
  const notes: { skill: string; value: string }[] = [];

  const process = (o: any, prefix: string) => {
    Object.entries(o).forEach(([k, v]) => {
      const label = prefix ? `${prefix} › ${k}` : k;
      if (typeof v === 'object' && v !== null) {
        process(v, label);
      } else if (isNumeric(v)) {
        numeric.push({ skill: label, score: Number(v) });
      } else {
        // Only add if there's actual text content worth showing
        const str = String(v ?? '').trim();
        if (str && str !== 'null' && str !== 'undefined') {
          notes.push({ skill: label, value: str });
        }
      }
    });
  };
  process(obj, '');
  return { numeric, notes };
}

/* ── Score gauge ─────────────────────────────────────────────────────────── */
function ScoreGauge({ score }: { score: number }) {
  const r = 52; const C = 2 * Math.PI * r;
  const clr = scoreColor(score);
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="128" height="128" viewBox="0 0 128 128" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="64" cy="64" r={r} fill="none" stroke="#f1f5f9" strokeWidth="9" />
        <circle cx="64" cy="64" r={r} fill="none" stroke={clr} strokeWidth="9"
          strokeDasharray={`${(score / 100) * C} ${C}`} strokeLinecap="round"
          className="score-ring" />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="mono text-3xl font-bold leading-none" style={{ color: clr }}>{score ?? '—'}</span>
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">/ 100</span>
      </div>
    </div>
  );
}

/* ── Score bar row ───────────────────────────────────────────────────────── */
function ScoreBar({ label, score, onClick }: { label: string; score: number | null; onClick?: () => void }) {
  const clr = scoreColor(score ?? 0);
  const pct = Math.min(100, Math.max(0, score ?? 0));
  return (
    <div
      onClick={onClick}
      className={`flex flex-col gap-1.5 p-3 rounded-xl border transition-all ${onClick ? 'cursor-pointer' : ''}`}
      style={onClick
        ? { borderColor: '#bfdbfe', background: '#eff6ff33' }
        : { borderColor: '#f1f5f9', background: '#fafafa' }}
      onMouseEnter={onClick ? e => { (e.currentTarget as HTMLDivElement).style.background = '#eff6ff66'; } : undefined}
      onMouseLeave={onClick ? e => { (e.currentTarget as HTMLDivElement).style.background = '#eff6ff33'; } : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${onClick ? 'text-blue-600' : 'text-slate-500'}`}>
          {label}
          {onClick && <span className="inline-flex">{Icon.openInNew('w-3 h-3')}</span>}
        </span>
        <span className="mono text-sm font-bold" style={{ color: clr }}>{score ?? '—'}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
        <div className="h-full rounded-full fill-bar" style={{ width: `${pct}%`, background: clr }} />
      </div>
    </div>
  );
}

/* ── Skill Breakdown Modal ───────────────────────────────────────────────── */
function SkillBreakdownModal({ isOpen, onClose, breakdown }: {
  isOpen: boolean; onClose: () => void; breakdown: any;
}) {
  const [tab, setTab] = useState<'scores' | 'notes'>('scores');
  const { numeric, notes } = useMemo(() => breakdown ? flattenBreakdown(breakdown) : { numeric: [], notes: [] }, [breakdown]);

  const tabs = [
    { id: 'scores' as const, label: 'Numeric Scores', count: numeric.length, icon: Icon.barChart('w-3.5 h-3.5') },
    { id: 'notes' as const, label: 'Text Notes', count: notes.length, icon: Icon.fileText('w-3.5 h-3.5') },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Technical Skill Breakdown" size="lg"
      footer={<Button variant="outline" onClick={onClose}>Close</Button>}>
      <div className="space-y-4">

        {/* Tab bar */}
        <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all"
              style={tab === t.id
                ? { background: '#fff', color: '#0f172a', boxShadow: '0 1px 4px rgba(0,0,0,.08)' }
                : { color: '#94a3b8' }}>
              {t.icon}
              {t.label}
              <span className="mono px-1.5 py-0.5 rounded-md text-[9px] font-black"
                style={{ background: tab === t.id ? '#f1f5f9' : 'rgba(0,0,0,.06)', color: tab === t.id ? '#475569' : '#94a3b8' }}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Scores tab */}
        {tab === 'scores' && (
          <div className="tx-scroll overflow-y-auto space-y-2 pr-1" style={{ maxHeight: '400px' }}>
            {numeric.length === 0
              ? <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                {Icon.barChart('w-8 h-8 opacity-30')}
                <p className="text-sm font-semibold">No numeric scores found</p>
              </div>
              : numeric.map((s, i) => {
                const pct = Math.min(100, Math.max(0, s.score));
                const clr = scoreColor(pct);
                const grade = pct >= 80 ? 'A' : pct >= 65 ? 'B' : pct >= 50 ? 'C' : pct >= 35 ? 'D' : 'F';
                return (
                  <div key={i} className="skill-row flex items-center gap-4 px-4 py-3 rounded-xl border border-slate-100 bg-white">
                    <div className="flex-1 min-w-0">
                      {/* Breadcrumb-style label */}
                      <p className="text-[11px] font-semibold text-slate-600 truncate leading-tight">{s.skill}</p>
                      <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full fill-bar" style={{ width: `${pct}%`, background: clr }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="mono text-sm font-bold" style={{ color: clr }}>{s.score}</span>
                      <span className="mono text-[10px] font-black px-2 py-0.5 rounded-lg"
                        style={{ color: clr, background: `${clr}18` }}>{grade}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* Notes tab */}
        {tab === 'notes' && (
          <div className="tx-scroll overflow-y-auto space-y-2 pr-1" style={{ maxHeight: '400px' }}>
            {notes.length === 0
              ? <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                {Icon.fileText('w-8 h-8 opacity-30')}
                <p className="text-sm font-semibold">No text notes found</p>
              </div>
              : notes.map((n, i) => {
                // Detect status-like values for special styling
                const lower = n.value.toLowerCase();
                const isNotEval = lower.includes('not_evaluated') || lower.includes('not evaluated');
                const isPositive = lower.includes('strong') || lower.includes('good') || lower.includes('excellent');
                const bgColor = isNotEval ? '#fef9c3' : isPositive ? '#f0fdf4' : '#f8fafc';
                const borderColor = isNotEval ? '#fde68a' : isPositive ? '#bbf7d0' : '#e2e8f0';
                const labelColor = isNotEval ? '#92400e' : isPositive ? '#166534' : '#475569';

                return (
                  <div key={i} className="rounded-xl border p-4 space-y-1.5 transition-all"
                    style={{ background: bgColor, borderColor }}>
                    {/* Skill path as breadcrumb chips */}
                    <div className="flex flex-wrap gap-1 items-center">
                      {n.skill.split(' › ').map((part, pi, arr) => (
                        <span key={pi} className="flex items-center gap-1">
                          <span className="mono text-[9px] font-bold px-2 py-0.5 rounded-md bg-white/70 border border-white/50 text-slate-500">
                            {part}
                          </span>
                          {pi < arr.length - 1 && (
                            <span className="text-slate-300 text-[10px]">›</span>
                          )}
                        </span>
                      ))}
                    </div>
                    <p className="text-[13px] font-semibold leading-snug" style={{ color: labelColor }}>
                      {n.value}
                    </p>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ── Collapsible section wrapper ─────────────────────────────────────────── */
function Section({ title, subtitle, icon, defaultOpen = true, badge, children }: {
  title: string; subtitle?: string; icon: JSX.Element;
  defaultOpen?: boolean; badge?: React.ReactNode; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl overflow-hidden section-card" style={{ background: '#fff', border: '1px solid #e8ecf0' }}>
      <button className="w-full flex items-center justify-between gap-4 p-6 text-left"
        onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: '#f1f5f9', color: '#475569' }}>
            {icon}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400 mb-0.5">{subtitle}</p>
            <p className="text-[15px] font-black text-slate-800 leading-tight">{title}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 no-print shrink-0">
          {badge}
          <span className="size-7 rounded-lg flex items-center justify-center transition-all"
            style={{ background: open ? '#eff6ff' : '#f1f5f9', color: open ? '#2563eb' : '#94a3b8' }}>
            <span style={{ display: 'inline-flex', transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              {Icon.chevronDown('w-4 h-4')}
            </span>
          </span>
        </div>
      </button>
      {open && <div className="border-t border-slate-100">{children}</div>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function EvaluationReportPage() {
  const { sessionId } = useParams();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  //   const [showTranscript, setShowTranscript]     = useState(false);
  //   const [showSummary, setShowSummary]           = useState(true);
  //   const [adminOverride,setAdminOverride]       = useState(false);
  const [overrideRec, setOverrideRec] = useState('');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [updatingOverride, setUpdatingOverride] = useState(false);
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);

  /* ── Tab title ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    document.title = report?.candidate?.name
      ? `${report.candidate.name} — Evaluation Report`
      : 'Evaluation Report';
    return () => { document.title = 'Evaluation Report'; };
  }, [report?.candidate?.name]);

  /* ── Fetch ──────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!sessionId) return;
    apiClient.get(`/evaluation/report/${sessionId}`)
      .then((r: { data: any }) => {
        setReport(r.data);
        if (r.data.evaluation) {
          setOverrideRec(r.data.evaluation.admin_recommendation || r.data.evaluation.hiring_recommendation);
          setOverrideNotes(r.data.evaluation.admin_notes || '');
        }
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [sessionId]);

  const handleSaveOverride = async () => {
    if (!sessionId) return;
    setUpdatingOverride(true);
    try {
      const updated = await apiClient.patch(`/evaluation/report/${sessionId}`, {
        admin_recommendation: overrideRec || null, admin_notes: overrideNotes || null,
      });
      setReport((prev: any) => ({
        ...prev,
        evaluation: { ...prev.evaluation, admin_recommendation: updated.data.admin_recommendation, admin_notes: updated.data.admin_notes },
      }));
      //   setAdminOverride(false);
      alert('Override saved successfully.');
    } catch { alert('Failed to save override.'); }
    finally { setUpdatingOverride(false); }
  };

  /* ── Loading skeleton ───────────────────────────────────────────────────── */
  if (loading) return (
    <div className="report-root min-h-screen flex items-center justify-center p-8" style={{ background: '#f8fafc' }}>
      <style>{STYLES}</style>
      <div className="w-full max-w-4xl space-y-5 animate-pulse">
        <div className="h-9 bg-slate-200 rounded-2xl w-48" />
        <div className="h-28 bg-slate-200 rounded-2xl" />
        <div className="grid grid-cols-5 gap-5">
          <div className="col-span-2 h-64 bg-slate-200 rounded-2xl" />
          <div className="col-span-3 h-64 bg-slate-200 rounded-2xl" />
        </div>
        <div className="h-40 bg-slate-200 rounded-2xl" />
      </div>
    </div>
  );

  /* ── No data ────────────────────────────────────────────────────────────── */
  if (!report) return (
    <div className="report-root min-h-screen flex items-center justify-center p-8" style={{ background: '#f8fafc' }}>
      <style>{STYLES}</style>
      <div className="text-center space-y-4">
        <div className="size-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mx-auto text-slate-300">
          {Icon.fileText('w-8 h-8')}
        </div>
        <h3 className="text-lg font-black text-slate-800">No report found</h3>
        <p className="text-sm text-slate-400 font-medium">This evaluation hasn't been generated yet.</p>
      </div>
    </div>
  );

  const ev = report.evaluation;
  const transcript = report.transcript;
  const displayRec = getRec(ev.admin_recommendation || ev.hiring_recommendation);

  const radarData = [
    { subject: 'Technical', score: ev.technical_score || 0, fullMark: 100 },
    { subject: 'Communication', score: ev.communication_score || 0, fullMark: 100 },
    { subject: 'Confidence', score: ev.confidence_score || 0, fullMark: 100 },
    { subject: 'Cultural Fit', score: ev.cultural_alignment_score || 0, fullMark: 100 },
  ];

  return (
    <div className="report-root min-h-screen" style={{ background: '#f8fafc' }}>
      <style>{STYLES}</style>

      {/* Accent top bar */}
      <div className="h-[3px]" style={{ background: 'linear-gradient(90deg, #2563eb 0%, #7c3aed 50%, #0ea5e9 100%)' }} />

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-5" id="report-printable-area">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="fade-rise flex items-start justify-between gap-4 no-print">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] mb-1" style={{ color: '#2563eb' }}>AI Evaluation</p>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Interview Report</h1>
            <p className="mono text-[11px] text-slate-400 mt-1">Session {sessionId?.slice(0, 8)}…</p>
          </div>
          <button onClick={() => window.print()}
            className="no-print flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-[.97]">
            {Icon.download('w-4 h-4')}
            Download PDF
          </button>
        </div>

        {/* ── Candidate hero ───────────────────────────────────────────────── */}
        <div className="fade-rise delay-1 rounded-2xl overflow-hidden section-card" style={{ background: '#fff', border: '1px solid #e8ecf0' }}>
          {/* Colored accent line */}
          <div className="h-[3px]" style={{ background: displayRec.color, opacity: 0.7 }} />

          <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-5">
              {/* Avatar */}
              <div className="size-16 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg shrink-0"
                style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>
                {report?.candidate?.name ? getInitials(report.candidate.name) : 'CA'}
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  {report?.candidate?.name || 'Candidate'}
                </h2>
                <p className="text-sm text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
                  <span className="inline-flex text-slate-400">{Icon.mail('w-3.5 h-3.5')}</span>
                  {report?.candidate?.email || 'Email unavailable'}
                </p>
                {report?.candidate?.resume_url && (
                  <a href={report.candidate.resume_url} target="_blank" rel="noreferrer"
                    className="text-xs font-bold flex items-center gap-1 mt-1 hover:underline"
                    style={{ color: '#2563eb' }}>
                    <span className="inline-flex">{Icon.link('w-3.5 h-3.5')}</span>
                    View Resume
                  </a>
                )}
              </div>
            </div>

            {/* Rec badge */}
            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="flex items-center gap-2 px-5 py-2.5 rounded-2xl border-2 font-black text-sm"
                style={{ color: displayRec.color, background: displayRec.bg, borderColor: displayRec.border }}>
                {displayRec.icon}
                {displayRec.label}
              </div>
              {ev.admin_recommendation && (
                <span className="mono text-[9px] font-bold uppercase tracking-widest text-slate-400 px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 flex items-center gap-1">
                  {Icon.pencil('w-3 h-3')}
                  Admin Override
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Score + Radar ────────────────────────────────────────────────── */}
        <div className="fade-rise delay-2 grid lg:grid-cols-5 gap-5">

          {/* Score card */}
          <div className="lg:col-span-2 rounded-2xl p-6 flex flex-col gap-5 section-card"
            style={{ background: '#fff', border: '1px solid #e8ecf0' }}>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400 mb-4">Overall Score</p>
              <div className="flex justify-center">
                <ScoreGauge score={ev.total_score ?? 0} />
              </div>
            </div>
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <ScoreBar label="Technical" score={ev.technical_score} onClick={() => setShowBreakdownModal(true)} />
              <ScoreBar label="Communication" score={ev.communication_score} />
              <ScoreBar label="Confidence" score={ev.confidence_score} />
              <ScoreBar label="Cultural Fit" score={ev.cultural_alignment_score} />
            </div>
          </div>

          {/* Radar */}
          <div className="lg:col-span-3 rounded-2xl p-6 section-card"
            style={{ background: '#fff', border: '1px solid #e8ecf0' }}>
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400 mb-0.5">Skills Overview</p>
            <p className="text-[15px] font-black text-slate-800 mb-4">Competency Radar</p>
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#f1f5f9" />
                  <PolarAngleAxis dataKey="subject"
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700, fontFamily: 'Sora, sans-serif' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Score" dataKey="score" stroke="#2563eb" fill="#2563eb" fillOpacity={0.12} strokeWidth={2.5} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,.1)', fontFamily: 'Sora, sans-serif', fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── AI Analysis ──────────────────────────────────────────────────── */}
        <div className="fade-rise delay-3">
          <Section title="AI Analysis & Explanation" subtitle="Generated Insights" defaultOpen={true}
            icon={Icon.star('w-4 h-4')}>
            <div className="p-6 space-y-4">
              <div className="rounded-xl p-5 space-y-2" style={{ background: '#f8fafc', border: '1px solid #e8ecf0' }}>
                <p className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400">Summary</p>
                <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-line">
                  {ev.ai_summary || 'Analysis is still processing for this session.'}
                </p>
              </div>
              {ev.ai_explanation && (
                <div className="rounded-xl p-5 space-y-2" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                  <p className="text-[10px] font-black uppercase tracking-[.14em]" style={{ color: '#93c5fd' }}>Detailed Explanation</p>
                  <p className="text-sm font-medium leading-relaxed whitespace-pre-line" style={{ color: '#1e3a8a' }}>
                    {ev.ai_explanation}
                  </p>
                </div>
              )}
            </div>
          </Section>
        </div>

        {/* ── Admin Override ───────────────────────────────────────────────── */}
        <div className="fade-rise delay-4 no-print">
          <Section title="Override & Internal Notes" subtitle="Admin Controls" defaultOpen={false}
            icon={Icon.pencil('w-4 h-4')}>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400 block">
                    Recommendation Override
                  </label>
                  <select value={overrideRec} onChange={e => setOverrideRec(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-all"
                    style={{ '--tw-ring-color': '#bfdbfe' } as any}
                    onFocus={e => { e.currentTarget.style.borderColor = '#93c5fd'; e.currentTarget.style.boxShadow = '0 0 0 3px #bfdbfe80'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}>
                    <option value="strong_hire">Strong Hire</option>
                    <option value="hire">Hire</option>
                    {/* <option value="NO_HIRE">No Hire</option> */}
                    <option value="reject">Reject</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400 block">
                  Internal Admin Notes
                </label>
                <textarea rows={4} value={overrideNotes} onChange={e => setOverrideNotes(e.target.value)}
                  placeholder="Add private notes about this candidate…"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 resize-none outline-none transition-all placeholder:text-slate-300"
                  onFocus={e => { e.currentTarget.style.borderColor = '#93c5fd'; e.currentTarget.style.boxShadow = '0 0 0 3px #bfdbfe80'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }} />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-all">
                  Cancel
                </button>
                <Button variant="primary" onClick={handleSaveOverride} loading={updatingOverride}>
                  Save Changes
                </Button>
              </div>
            </div>
          </Section>
        </div>

        {/* ── Transcript ───────────────────────────────────────────────────── */}
        <div className="fade-rise delay-5 print:break-inside-avoid">
          <Section title="Session Transcript" subtitle="Full Conversation" defaultOpen={false}
            icon={Icon.chat('w-4 h-4')}
            badge={transcript?.full_transcript?.length > 0 && (
              <span className="mono text-[10px] font-bold text-slate-400 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50">
                {transcript.full_transcript.length} turns
              </span>
            )}>
            <div className="p-6">
              {transcript?.full_transcript?.length > 0 ? (
                <div className="tx-scroll overflow-y-auto space-y-4 pr-2 print:max-h-none" style={{ maxHeight: 440 }}>
                  {transcript.full_transcript.map((turn: any, i: number) => {
                    const isAI = turn.role?.toLowerCase() === 'interviewer';
                    return (
                      <div key={i} className={`flex ${isAI ? 'justify-start' : 'justify-end'}`}>
                        <div className="max-w-[82%] space-y-1">
                          <p className={`text-[9px] font-black uppercase tracking-[.14em] px-1 ${isAI ? '' : 'text-right'}`}
                            style={{ color: isAI ? '#2563eb' : '#94a3b8' }}>
                            {isAI ? 'AI Interviewer' : 'Candidate'}
                          </p>
                          <div className="px-5 py-3.5 text-sm font-medium leading-relaxed shadow-sm"
                            style={isAI
                              ? { background: '#f8fafc', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: '18px 18px 18px 4px' }
                              : { background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', borderRadius: '18px 18px 4px 18px' }}>
                            {turn.content || turn.text}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-slate-400">
                  {Icon.chat('w-8 h-8 opacity-30')}
                  <p className="text-sm font-bold uppercase tracking-wider">Transcript unavailable</p>
                </div>
              )}
            </div>
          </Section>
        </div>

        {/* Print-only skill breakdown */}
        <div className="hidden print:block rounded-2xl p-6" style={{ background: '#fff', border: '1px solid #e8ecf0' }}>
          <p className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400 mb-4">Internal Skill Mapping</p>
          {ev.score_breakdown && Object.keys(ev.score_breakdown).length > 0 && (() => {
            const { numeric, notes } = flattenBreakdown(ev.score_breakdown);
            return (
              <div className="space-y-2">
                {numeric.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-sm font-semibold text-slate-700">{s.skill}</span>
                    <span className="mono text-sm font-bold text-slate-900">{s.score}/100</span>
                  </div>
                ))}
                {notes.map((n, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-sm font-semibold text-slate-700">{n.skill}</span>
                    <span className="text-sm font-medium text-slate-500 italic">{n.value}</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Skill breakdown modal */}
      <SkillBreakdownModal
        isOpen={showBreakdownModal}
        onClose={() => setShowBreakdownModal(false)}
        breakdown={ev.score_breakdown}
      />
    </div>
  );
}