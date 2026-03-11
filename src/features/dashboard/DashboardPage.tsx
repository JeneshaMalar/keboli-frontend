import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../app/store';
import { fetchCandidates, fetchInvitations } from '../candidate/slices/candidateSlice';
import { fetchAssessments } from '../assessment/slices/assessmentSlice';
// import Badge from '../../components/ui/Badge';
import {
    AreaChart, Area, PieChart, Pie, Cell,
    ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid
} from 'recharts';

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
    completed: '#10b981',
    sent:      '#6366f1',
    clicked:   '#0ea5e9',
    expired:   '#f43f5e',
    neutral:   '#94a3b8',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 60)  return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

const STATUS_META: Record<string, { label: string; dot: string; text: string; bg: string; border: string }> = {
    COMPLETED: { label: 'Completed', dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200' },
    SENT:      { label: 'Sent',      dot: 'bg-indigo-500',  text: 'text-indigo-700',  bg: 'bg-indigo-50',   border: 'border-indigo-200'  },
    CLICKED:   { label: 'Clicked',   dot: 'bg-sky-500',     text: 'text-sky-700',     bg: 'bg-sky-50',      border: 'border-sky-200'     },
    EXPIRED:   { label: 'Expired',   dot: 'bg-rose-500',    text: 'text-rose-700',    bg: 'bg-rose-50',     border: 'border-rose-200'    },
};

function StatusPill({ status }: { status?: string }) {
    const m = STATUS_META[status?.toUpperCase() ?? ''] ?? { label: status ?? '—', dot: 'bg-slate-300', text: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200' };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider border ${m.bg} ${m.text} ${m.border}`}>
            <span className={`size-1.5 rounded-full shrink-0 ${m.dot}`} />
            {m.label}
        </span>
    );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon, accent, linkTo }: {
    label: string; value: string | number; sub?: string;
    icon: string; accent: string; linkTo?: string;
}) {
    const inner = (
        <div className={`group relative overflow-hidden bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 cursor-default ${linkTo ? 'hover:border-primary/30' : ''}`}>
            {/* Decorative blob */}
            <div className={`absolute -top-5 -right-5 w-24 h-24 rounded-full opacity-[0.08] group-hover:opacity-[0.13] transition-opacity duration-500 ${accent}`} />
            <div className="flex items-start justify-between mb-4">
                <div className={`size-10 rounded-xl flex items-center justify-center ${accent} bg-opacity-10  border-opacity-20 ${accent.replace('bg-', 'border-')}`}>
                    <span className={`material-symbols-outlined text-[20px] ${accent.replace('bg-', 'text-')}`}>{icon}</span>
                </div>
                {linkTo && (
                    <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors text-[18px]">arrow_outward</span>
                )}
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-3xl font-black text-slate-900 tracking-tight leading-none">{value}</p>
            {sub && <p className="text-[11px] font-semibold text-slate-400 mt-1.5">{sub}</p>}
        </div>
    );
    return linkTo ? <Link to={linkTo}>{inner}</Link> : inner;
}

// ─── Donut center label ───────────────────────────────────────────────────────
function DonutLabel({ viewBox, value, label }: any) {
    const { cx, cy } = viewBox ?? {};
    return (
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
            <tspan x={cx} dy="-0.5em" fontSize="22" fontWeight="900" fill="#0f172a">{value}</tspan>
            <tspan x={cx} dy="1.5em" fontSize="10" fontWeight="700" fill="#94a3b8" letterSpacing="1">{label?.toUpperCase()}</tspan>
        </text>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
    const dispatch = useDispatch<AppDispatch>();
    const { candidates, invitations} = useSelector((state: RootState) => state.candidate);
    const { assessments } = useSelector((state: RootState) => state.assessment);
    const [activityTab, setActivityTab] = useState<'all' | 'completed' | 'pending'>('all');

    useEffect(() => {
        dispatch(fetchCandidates());
        dispatch(fetchInvitations());
        dispatch(fetchAssessments());
    }, [dispatch]);

    // ── Core stats ────────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const total     = invitations.length;
        const completed = invitations.filter(i => i.status?.toUpperCase() === 'COMPLETED').length;
        const sent      = invitations.filter(i => i.status?.toUpperCase() === 'SENT').length;
        const clicked   = invitations.filter(i => i.status?.toUpperCase() === 'CLICKED').length;
        const expired   = invitations.filter(i => i.status?.toUpperCase() === 'EXPIRED').length;
        const activeJobs = assessments.filter(a => a.is_active).length;
        const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0.0';
        const pendingTotal   = sent + clicked;

        return { total, completed, sent, clicked, expired, activeJobs, completionRate, pendingTotal };
    }, [invitations, assessments]);

    // ── Donut data ────────────────────────────────────────────────────────────
    const donutData = useMemo(() => [
        { name: 'Completed', value: stats.completed, color: C.completed },
        { name: 'Sent',      value: stats.sent,      color: C.sent      },
        { name: 'Clicked',   value: stats.clicked,   color: C.clicked   },
        { name: 'Expired',   value: stats.expired,   color: C.expired   },
    ].filter(d => d.value > 0), [stats]);

    // ── Area chart — last 7 days activity ────────────────────────────────────
    const areaData = useMemo(() => {
        const days: Record<string, { date: string; sent: number; completed: number }> = {};
        for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            days[key] = { date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), sent: 0, completed: 0 };
        }
        invitations.forEach((inv: any) => {
            const key = new Date(inv.sent_at).toISOString().split('T')[0];
            if (days[key]) {
                days[key].sent++;
                if (inv.status?.toUpperCase() === 'COMPLETED') days[key].completed++;
            }
        });
        return Object.values(days);
    }, [invitations]);

    // ── Top assessments by completion ─────────────────────────────────────────
    const topAssessments = useMemo(() => {
        return assessments
            .map(a => {
                const aInvs = invitations.filter((i: any) => i.assessment_id === a.id);
                const done  = aInvs.filter((i: any) => i.status?.toUpperCase() === 'COMPLETED').length;
                const rate  = aInvs.length > 0 ? Math.round((done / aInvs.length) * 100) : 0;
                return { ...a, totalInvites: aInvs.length, completed: done, rate };
            })
            .filter(a => a.totalInvites > 0)
            .sort((a, b) => b.totalInvites - a.totalInvites)
            .slice(0, 5);
    }, [assessments, invitations]);

    // ── Recent activity ───────────────────────────────────────────────────────
    const recentActivity = useMemo(() => {
        const all = [...invitations]
            .sort((a: any, b: any) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())
            .slice(0, 12)
            .map((inv: any) => ({
                id: inv.id,
                candidateName: candidates.find((c: any) => c.id === inv.candidate_id)?.name ?? 'Unknown',
                assessmentTitle: assessments.find(a => a.id === inv.assessment_id)?.title ?? 'Unknown',
                status: inv.status,
                sentAt: inv.sent_at,
            }));

        if (activityTab === 'all') return all;
        if (activityTab === 'completed') return all.filter(a => a.status?.toUpperCase() === 'COMPLETED');
        return all.filter(a => ['SENT', 'CLICKED'].includes(a.status?.toUpperCase()));
    }, [invitations, candidates, assessments, activityTab]);

    // ── Candidates needing attention ──────────────────────────────────────────
    const needsAttention = useMemo(() => {
        return [...invitations]
            .filter((i: any) => i.status?.toUpperCase() === 'EXPIRED' || i.status?.toUpperCase() === 'COMPLETED')
            .slice(0, 4)
            .map((inv: any) => ({
                id: inv.id,
                name: candidates.find((c: any) => c.id === inv.candidate_id)?.name ?? 'Unknown',
                assessment: assessments.find(a => a.id === inv.assessment_id)?.title ?? '—',
                status: inv.status,
                sentAt: inv.sent_at,
            }));
    }, [invitations, candidates, assessments]);

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    return (
        <div className="space-y-7">
            {/* ── Header ───────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <p className="text-[11px] font-black text-primary uppercase tracking-widest mb-1">Admin Dashboard</p>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 leading-tight">
                        Recruitment Overview
                    </h1>
                    <p className="text-sm font-medium text-slate-500 mt-0.5">Real-time insights across your hiring pipeline.</p>
                </div>
                <div className="flex items-center gap-2.5 self-start sm:self-auto">
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 shadow-sm">
                        <span className="material-symbols-outlined text-slate-400 text-[16px]">calendar_today</span>
                        <span className="text-xs font-bold text-slate-600">{today}</span>
                    </div>
                    <Link to="/candidates"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.97]">
                        <span className="material-symbols-outlined text-[16px]">add_link</span>
                        New Invite
                    </Link>
                </div>
            </div>

            {/* ── KPI Row ───────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Total Interviews"  value={stats.total}          icon="groups"          accent="bg-yellow-400"   sub={`${stats.pendingTotal} in progress`} />
                <KpiCard label="Completed"          value={stats.completed}      icon="task_alt"        accent="bg-green-400" sub={`${stats.completionRate}% rate`}     linkTo="/candidates" />
                <KpiCard label="Awaiting Response"  value={stats.pendingTotal}   icon="pending_actions" accent="bg-blue-400"  sub={`${stats.sent} sent · ${stats.clicked} clicked`} linkTo="/candidates" />
                <KpiCard label="Active Assessments" value={stats.activeJobs}     icon="quiz"            accent="bg-purple-500"   sub="currently open"                      linkTo="/assessments" />
            </div>

            {/* ── Charts Row ────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Area chart — 7-day trend */}
                <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h2 className="text-sm font-black text-slate-900">Activity Trend</h2>
                            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Invitations sent & completed — last 7 days</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-indigo-500 inline-block" /><span className="text-[10px] font-bold text-slate-400">Sent</span></div>
                            <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-500 inline-block" /><span className="text-[10px] font-bold text-slate-400">Completed</span></div>
                        </div>
                    </div>
                    <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={areaData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="gSent" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.15} />
                                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gDone" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', fontSize: '12px', fontWeight: 700 }}
                                    cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }}
                                />
                                <Area type="monotone" dataKey="sent"      name="Sent"      stroke="#6366f1" strokeWidth={2.5} fill="url(#gSent)" dot={false} activeDot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }} />
                                <Area type="monotone" dataKey="completed" name="Completed" stroke="#10b981" strokeWidth={2.5} fill="url(#gDone)" dot={false} activeDot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Donut — status distribution */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-sm font-black text-slate-900">Status Split</h2>
                            <p className="text-[11px] text-slate-400 font-medium mt-0.5">All invitations</p>
                        </div>
                    </div>

                    {stats.total === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8">
                            <span className="material-symbols-outlined text-slate-200 text-4xl">donut_large</span>
                            <p className="text-xs font-semibold text-slate-400">No data yet</p>
                        </div>
                    ) : (
                        <>
                            <div className="h-[160px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={donutData} innerRadius={52} outerRadius={72} paddingAngle={3} dataKey="value" strokeWidth={0}
                                            label={<DonutLabel value={stats.total} label="total" />} labelLine={false}>
                                            {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', fontSize: '12px', fontWeight: 700 }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Legend */}
                            <div className="mt-4 space-y-2">
                                {donutData.map((d, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="size-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                                            <span className="text-xs font-semibold text-slate-600">{d.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full" style={{ width: `${Math.round((d.value / stats.total) * 100)}%`, background: d.color }} />
                                            </div>
                                            <span className="text-[11px] font-black text-slate-500 w-6 text-right">{d.value}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ── Bottom grid ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Recent Activity */}
                <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
                    {/* Header + tabs */}
                    <div className="px-5 pt-5 pb-0 border-b border-slate-100">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-black text-slate-900">Recent Activity</h2>
                            <Link to="/candidates" className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1">
                                View all <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                            </Link>
                        </div>
                        {/* Tab pills */}
                        <div className="flex gap-1 -mb-px">
                            {(['all', 'pending', 'completed'] as const).map(tab => (
                                <button key={tab} onClick={() => setActivityTab(tab)}
                                    className={`px-3 py-2 text-[11px] font-black uppercase tracking-wider border-b-2 transition-all capitalize ${activityTab === tab ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="divide-y divide-slate-50 max-h-[360px] overflow-y-auto custom-scrollbar">
                        {recentActivity.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-16">
                                <span className="material-symbols-outlined text-slate-200 text-4xl">inbox</span>
                                <p className="text-sm font-semibold text-slate-400">No activity to show</p>
                            </div>
                        ) : recentActivity.map(act => (
                            <div key={act.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="size-9 shrink-0 rounded-xl bg-gradient-to-br from-primary/10 to-indigo-100 border border-primary/10 flex items-center justify-center text-primary font-black text-[11px]">
                                        {getInitials(act.candidateName)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-900 truncate leading-tight">{act.candidateName}</p>
                                        <p className="text-[11px] text-slate-400 font-medium truncate">{act.assessmentTitle}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0 ml-3">
                                    <StatusPill status={act.status} />
                                    <span className="text-[10px] font-bold text-slate-400 w-12 text-right">{timeAgo(act.sentAt)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right column: Top Assessments + Needs Attention */}
                <div className="space-y-5">

                    {/* Top Assessments */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-black text-slate-900">Top Assessments</h2>
                            <Link to="/assessments" className="text-[11px] font-bold text-primary hover:underline">Manage</Link>
                        </div>
                        {topAssessments.length === 0 ? (
                            <div className="text-center py-6">
                                <span className="material-symbols-outlined text-slate-200 text-3xl block mb-1">quiz</span>
                                <p className="text-xs font-semibold text-slate-400">No assessment data yet</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {topAssessments.map((a, i) => (
                                    <div key={a.id} className="flex items-center gap-3">
                                        <span className="text-[10px] font-black text-slate-300 w-4 shrink-0">{i + 1}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-800 truncate">{a.title}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-gradient-to-r from-primary to-indigo-400 rounded-full transition-all duration-700"
                                                        style={{ width: `${a.rate}%` }} />
                                                </div>
                                                <span className="text-[10px] font-black text-slate-400 shrink-0">{a.rate}%</span>
                                            </div>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <p className="text-sm font-black text-slate-900">{a.completed}<span className="text-slate-300">/{a.totalInvites}</span></p>
                                            <p className="text-[9px] text-slate-400 font-semibold">done</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Needs Attention */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="size-6 rounded-md bg-amber-50 border border-amber-200 flex items-center justify-center">
                                <span className="material-symbols-outlined text-amber-500 text-[14px]">warning</span>
                            </div>
                            <h2 className="text-sm font-black text-slate-900">Needs Attention</h2>
                        </div>
                        {needsAttention.length === 0 ? (
                            <div className="text-center py-4">
                                <span className="material-symbols-outlined text-emerald-300 text-3xl block mb-1">check_circle</span>
                                <p className="text-xs font-semibold text-slate-400">All clear!</p>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {needsAttention.map(item => (
                                    <div key={item.id} className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="size-7 shrink-0 rounded-lg bg-gradient-to-br from-primary/10 to-indigo-100 flex items-center justify-center text-primary font-black text-[9px]">
                                                {getInitials(item.name)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                                                <p className="text-[10px] text-slate-400 font-medium truncate">{item.assessment}</p>
                                            </div>
                                        </div>
                                        <StatusPill status={item.status} />
                                    </div>
                                ))}
                            </div>
                        )}

                        <Link to="/candidates"
                            className="mt-4 w-full flex items-center justify-center gap-1.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all">
                            <span className="material-symbols-outlined text-[15px]">manage_accounts</span>
                            Manage All Candidates
                        </Link>
                    </div>
                </div>
            </div>

            {/* ── Quick Actions ─────────────────────────────────────────────── */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 relative overflow-hidden">
                {/* Decorative rings */}
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full border border-white/5 translate-x-20 -translate-y-20" />
                <div className="absolute top-0 right-0 w-96 h-96 rounded-full border border-white/[0.03] translate-x-32 -translate-y-32" />

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-5 justify-between">
                    <div>
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Quick Actions</p>
                        <h3 className="text-base font-black text-white">Jump to a task</h3>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">Common actions at your fingertips</p>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                        {[
                            { label: 'New Assessment', icon: 'add_circle', to: '/assessments' },
                            { label: 'Invite Candidate', icon: 'person_add', to: '/candidates' },
                            { label: 'View Reports', icon: 'bar_chart', to: '/candidates' },
                            { label: 'Manage Jobs', icon: 'work', to: '/assessments' },
                        ].map(action => (
                            <Link key={action.label} to={action.to}
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/20 text-white text-xs font-bold rounded-xl transition-all backdrop-blur-sm active:scale-[0.97]">
                                <span className="material-symbols-outlined text-[15px]">{action.icon}</span>
                                {action.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}