import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../app/store';
import { fetchCandidates, fetchInvitations } from '../candidate/slices/candidateSlice';
import { fetchAssessments } from '../assessment/slices/assessmentSlice';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Navigate } from 'react-router-dom';
import { Link } from "react-router-dom";
export default function DashboardPage() {
    const dispatch = useDispatch<AppDispatch>();
    const { candidates, invitations, loading } = useSelector((state: RootState) => state.candidate);
    const { assessments } = useSelector((state: RootState) => state.assessment);

    useEffect(() => {
        dispatch(fetchCandidates());
        dispatch(fetchInvitations());
        dispatch(fetchAssessments());
    }, [dispatch]);

    // Calculate Stats
    const stats = useMemo(() => {
        const total = invitations.length;
        const completed = invitations.filter(inv => inv.status?.toUpperCase() === 'COMPLETED').length;
        const pending = invitations.filter(inv => inv.status?.toUpperCase() === 'SENT' || inv.status?.toUpperCase() === 'CLICKED').length;
        const activeJobs = assessments.filter(a => a.is_active).length;
        const completionRate = total > 0 ? (completed / total) * 100 : 0;

        return {
            totalInterviews: total,
            pendingReviews: pending,
            completionRate: completionRate.toFixed(1) + '%',
            activeJobs,
            chartData: [
                { name: 'Completed', value: completed, color: '#10b981' },
                { name: 'Pending', value: pending, color: '#197fe6' },
                { name: 'Expired/Other', value: Math.max(0, total - completed - pending), color: '#f43f5e' }
            ]
        };
    }, [invitations, assessments]);

    const recentActivity = useMemo(() => {
        return invitations
            .slice(0, 5)
            .map(inv => {
                const candidate = candidates.find(c => c.id === inv.candidate_id);
                const assessment = assessments.find(a => a.id === inv.assessment_id);
                return {
                    id: inv.id,
                    name: candidate?.name || 'Unknown Candidate',
                    role: assessment?.title || 'Unknown Role',
                    date: new Date(inv.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    status: inv.status,
                };
            });
    }, [invitations, candidates, assessments]);
    

    const getStatusBadge = (status?: string) => {
        switch (status?.toUpperCase()) {
            case 'COMPLETED': return <Badge variant="success">Completed</Badge>;
            case 'CLICKED': return <Badge variant="active">Active</Badge>;
            case 'SENT': return <Badge variant="secondary">Scheduled</Badge>;
            default: return <Badge variant="error">{status || 'Unknown'}</Badge>;
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">Dashboard Overview</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">
                        Welcome back! Here's what's happening with your recruitment pipeline today.
                    </p>
                </div>
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-200/60 shadow-sm">
                    <span className="material-symbols-outlined text-primary text-[20px]">calendar_today</span>
                    <span className="text-sm font-bold text-slate-700">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total Interviews', value: stats.totalInterviews, icon: 'groups', color: 'from-blue-500 to-indigo-600', trend: '+12%', trendUp: true },
                    { label: 'Pending Reviews', value: stats.pendingReviews, icon: 'pending_actions', color: 'from-amber-400 to-orange-500', trend: '-5%', trendUp: false },
                    { label: 'Completion Rate', value: stats.completionRate, icon: 'task_alt', color: 'from-emerald-400 to-teal-500', trend: '+2.4%', trendUp: true },
                    { label: 'Active Jobs', value: stats.activeJobs, icon: 'work', color: 'from-violet-500 to-purple-600', trend: '+4', trendUp: true },
                ].map((kpi, i) => (
                    <Card key={i} className="group hover:border-primary/30 transition-all duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                            <span className="material-symbols-outlined text-7xl rotate-12">{kpi.icon}</span>
                        </div>
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-2 rounded-xl bg-gradient-to-br ${kpi.color} text-white shadow-lg shadow-inner`}>
                                <span className="material-symbols-outlined text-[20px]">{kpi.icon}</span>
                            </div>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${kpi.trendUp ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                {kpi.trend}
                            </span>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                            <h3 className="text-2xl font-black text-slate-900 mt-1">{kpi.value}</h3>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Activity Table */}
                <div className="lg:col-span-2 space-y-4">
                    <Card className="p-0 border-none shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">history</span>
                                <h2 className="font-black text-slate-900 tracking-tight">Recent Activity</h2>
                            </div>
                            <Link
  to="/candidate"
  className="text-xs font-bold text-primary hover:underline"
>
  View All Candidates
</Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50">
                                    <tr>
                                        <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Candidate</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Role</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {recentActivity.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                                                No recent activity found.
                                            </td>
                                        </tr>
                                    ) : (
                                        recentActivity.map((activity) => (
                                            <tr key={activity.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                                                            {activity.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                                        </div>
                                                        <span className="text-sm font-bold text-slate-900">{activity.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm font-medium text-slate-500">{activity.role}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {getStatusBadge(activity.status)}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-xs font-bold text-slate-400">{activity.date}</span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* AI Insights Card */}
                    {/* <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-xl relative overflow-hidden group">
                        <div className="absolute top-[-20%] right-[-10%] w-[300px] h-[300px] bg-primary/20 rounded-full blur-[80px] group-hover:bg-primary/30 transition-all duration-700" />
                        <div className="relative z-10 flex items-center gap-6">
                            <div className="bg-white/10 backdrop-blur-xl p-4 rounded-2xl border border-white/10 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-3xl text-primary-light">auto_awesome</span>
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-black tracking-tight">AI Recruitment Assistant</h3>
                                <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-lg">
                                    Our AI has analyzed the latest 5 interviews. Overall candidate confidence is up by 15% this week. Consider prioritizing Alex Rivera for the Senior Frontend role.
                                </p>
                            </div>
                            <div className="ml-auto">
                                <button className="px-5 py-2.5 bg-white text-slate-900 text-xs font-black rounded-xl hover:bg-slate-100 transition-all active:scale-95 whitespace-nowrap">
                                    Generate Report
                                </button>
                            </div>
                        </div>
                    </Card> */}
                </div>

                {/* Right Column: Status & Performance */}
                <div className="space-y-8">
                    {/* Status Chart */}
                    <Card className="flex flex-col items-center">
                        <div className="w-full flex items-center justify-between mb-6">
                            <h2 className="font-black text-slate-900 tracking-tight">Interview Status</h2>
                            <span className="material-symbols-outlined text-slate-400 text-[18px]">more_horiz</span>
                        </div>
                        <div className="h-[240px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.chartData}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {stats.chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-full grid grid-cols-3 gap-2 mt-4">
                            {stats.chartData.map((item, i) => (
                                <div key={i} className="text-center">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{item.name}</p>
                                    <p className="text-sm font-black" style={{ color: item.color }}>
                                        {stats.totalInterviews > 0 ? Math.round((item.value / stats.totalInterviews) * 100) : 0}%
                                    </p>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Performance Metrics */}
                    {/* <Card className="bg-primary shadow-lg shadow-primary/20 text-white border-none">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                                <span className="material-symbols-outlined text-[20px]">speed</span>
                            </div>
                            <h2 className="font-black tracking-tight">Efficiency Stats</h2>
                        </div>
                        <div className="space-y-5">
                            {[
                                { label: 'Average Duration', value: '42 mins', progress: 75 },
                                { label: 'Offer Acceptance', value: '88%', progress: 88 },
                                { label: 'Time to Hire', value: '14 days', progress: 60 }
                            ].map((metric, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between items-center text-xs font-bold">
                                        <span className="text-white/70 uppercase tracking-widest">{metric.label}</span>
                                        <span>{metric.value}</span>
                                    </div>
                                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-white rounded-full transition-all duration-1000"
                                            style={{ width: `${metric.progress}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card> */}
                </div>
            </div>
        </div>
    );
}
