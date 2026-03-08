import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { apiClient } from '../../services/apiClient';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import './EvaluationReportPage.css';

export default function EvaluationReportPage() {
    const { sessionId } = useParams();
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showTranscript, setShowTranscript] = useState(false);
    const [showSummary, setShowSummary] = useState(true);

    const [adminOverride, setAdminOverride] = useState(false);
    const [overrideRec, setOverrideRec] = useState('');
    const [overrideNotes, setOverrideNotes] = useState('');
    const [updatingOverride, setUpdatingOverride] = useState(false);
    const [showBreakdownModal, setShowBreakdownModal] = useState(false);

    const handleDownloadPdf = () => {
        window.print();
    };

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
                admin_recommendation: overrideRec,
                admin_notes: overrideNotes
            });
            setReport((prev: any) => ({
                ...prev,
                evaluation: {
                    ...prev.evaluation,
                    admin_recommendation: updated.data.admin_recommendation,
                    admin_notes: updated.data.admin_notes
                }
            }));
            setAdminOverride(false);
            alert("Override saved successfully.");
        } catch (e) {
            alert("Failed to save override.");
        } finally {
            setUpdatingOverride(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-8 bg-slate-100 rounded w-48"></div>
                <div className="grid lg:grid-cols-3 gap-6">
                    <div className="h-64 bg-slate-100 rounded-xl"></div>
                    <div className="lg:col-span-2 h-64 bg-slate-100 rounded-xl"></div>
                </div>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">No report found</h3>
                <p className="text-sm text-slate-500">This evaluation report does not exist or hasn't been generated yet.</p>
            </div>
        );
    }

    const ev = report.evaluation;
    const transcript = report.transcript;

    const radarData = [
        { subject: 'Technical', score: ev.technical_score || 0, fullMark: 100 },
        { subject: 'Communication', score: ev.communication_score || 0, fullMark: 100 },
        { subject: 'Confidence', score: ev.confidence_score || 0, fullMark: 100 },
        { subject: 'Cultural Fit', score: ev.cultural_alignment_score || 0, fullMark: 100 },
    ];

    const recColor = ev.hiring_recommendation === 'STRONG_HIRE' ? 'success' : ev.hiring_recommendation === 'HIRE' ? 'active' : 'error';
    const recLabel = ev.hiring_recommendation?.replace('_', ' ') || 'Pending';

    const renderSkillBreakdown = () => {
        if (!ev.score_breakdown || Object.keys(ev.score_breakdown).length === 0) return null;

        const flattenedSkills: { skill: string; score: any }[] = [];
        const processObject = (obj: any, prefix = '') => {
            Object.entries(obj).forEach(([key, val]) => {
                const label = prefix ? `${prefix}: ${key}` : key;
                if (typeof val === 'object' && val !== null) {
                    processObject(val, label);
                } else {
                    flattenedSkills.push({ skill: label, score: val });
                }
            });
        };
        processObject(ev.score_breakdown);

        return (
            <div className="space-y-3">
                {flattenedSkills.map((s, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                        <span className="text-sm font-semibold text-slate-700">{s.skill}</span>
                        <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary"
                                    style={{ width: `${Math.min(100, Math.max(0, Number(s.score)))}%` }}
                                />
                            </div>
                            <span className="text-xs font-black text-slate-900 min-w-8 text-right">{s.score}/100</span>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-700" id="report-printable-area">
            <div className="flex items-center justify-between print:hidden">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Evaluation Report</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Session {sessionId?.slice(0, 8)}…</p>
                </div>
                <Button variant="outline"
                    icon={<span className="material-symbols-outlined text-[18px]">download</span>}
                    onClick={handleDownloadPdf}
                >
                    Download PDF
                </Button>
            </div>

            {/* Candidate Overview Card */}
            <Card className="print:break-inside-avoid shadow-sm print:shadow-none border border-slate-200/80">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4 py-2">
                        <div className="size-16 rounded-2xl bg-gradient-to-br from-primary/10 to-indigo-100 flex items-center justify-center text-primary font-black text-xl border border-primary/20 shadow-inner">
                            {report?.candidate?.name ? report.candidate.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'CA'}
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">{report?.candidate?.name || 'Candidate Name Unavailable'}</h2>
                            <p className="text-sm font-medium text-slate-500 mt-0.5 flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[14px]">mail</span> {report?.candidate?.email || 'Email Unavailable'}
                            </p>
                            {report?.candidate?.resume_url && (
                                <a href={report.candidate.resume_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-primary hover:underline flex items-center gap-1 mt-1">
                                    <span className="material-symbols-outlined text-[14px]">link</span> View Resume
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </Card>

            <div className="grid lg:grid-cols-3 gap-6">
                <Card className="text-center">
                    <div className="py-4">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">Overall Score</p>
                        <div className="relative inline-flex items-center justify-center w-32 h-32 mx-auto">
                            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                                <circle cx="60" cy="60" r="52" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                                <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="8"
                                    strokeDasharray={`${(ev.total_score || 0) * 3.27} 327`}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 text-primary"
                                />
                            </svg>
                            <span className="absolute text-3xl font-black text-slate-900">{ev.total_score ?? '—'}</span>
                        </div>
                        <div className="mt-8 flex flex-col items-center gap-2">
                            <Badge variant={ev.admin_recommendation ? (ev.admin_recommendation === 'STRONG_HIRE' ? 'success' : ev.admin_recommendation === 'HIRE' ? 'active' : 'error') : recColor as any}>
                                {ev.admin_recommendation ? ev.admin_recommendation.replace('_', ' ') : recLabel}
                            </Badge>
                            {ev.admin_recommendation && (
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider">Admin Overridden</span>
                            )}
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-6 mt-6 space-y-4">
                        {[
                            { label: 'Technical', score: ev.technical_score, clickable: true },
                            { label: 'Communication', score: ev.communication_score },
                            { label: 'Confidence', score: ev.confidence_score },
                            { label: 'Cultural Fit', score: ev.cultural_alignment_score },
                        ].map(s => (
                            <div
                                key={s.label}
                                className={`flex items-center justify-between text-sm p-1 rounded-lg transition-colors ${s.clickable ? 'cursor-pointer hover:bg-primary/5 group' : ''}`}
                                onClick={() => s.clickable && setShowBreakdownModal(true)}
                            >
                                <span className={`font-bold flex items-center gap-1.5 ${s.clickable ? 'text-primary group-hover:underline' : 'text-slate-500'}`}>
                                    {s.label}
                                    {s.clickable && <span className="material-symbols-outlined text-[14px]">info</span>}
                                </span>
                                <span className="font-black text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{s.score ?? '—'}</span>
                            </div>
                        ))}

                        {/* Detailed Skill Breakdown - Print Only */}
                        <div className="hidden print:block pt-6 mt-6 border-t border-dashed border-slate-200">
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 text-left">Internal Skill Mapping</p>
                            {renderSkillBreakdown()}
                        </div>
                    </div>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader><CardTitle>Competency Mapping</CardTitle></CardHeader>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={radarData}>
                                <PolarGrid stroke="#f1f5f9" />
                                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar name="Score" dataKey="score" stroke="#197fe6" fill="#197fe6" fillOpacity={0.15} strokeWidth={3} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            <Card className="print:break-inside-avoid">
                <div className="w-full flex items-center justify-between cursor-pointer" onClick={() => setShowSummary(!showSummary)}>
                    <CardTitle>AI Analysis & Explanation</CardTitle>
                    <span className={`material-symbols-outlined text-slate-400 transition-transform ${showSummary ? 'rotate-180' : ''} print:hidden`}>expand_more</span>
                </div>
                {showSummary && (
                    <div className="mt-6 space-y-4">
                        <div className="text-sm font-medium text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50 p-6 rounded-xl border border-slate-100">
                            <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Summary</span>
                            {ev.ai_summary || 'Analysis engine is still processing this session.'}
                        </div>
                        {ev.ai_explanation && (
                            <div className="text-sm font-medium text-slate-600 leading-relaxed whitespace-pre-line bg-indigo-50/50 p-6 rounded-xl border border-indigo-100/50">
                                <span className="block text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">Detailed Explanation</span>
                                {ev.ai_explanation}
                            </div>
                        )}
                    </div>
                )}
            </Card>

            <Card className="print:hidden">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => setAdminOverride(!adminOverride)}>
                    <div>
                        <CardTitle>Admin Override & Notes</CardTitle>
                        <p className="text-xs text-slate-500 mt-1">Override AI recommendation and save internal notes.</p>
                    </div>
                    <span className={`material-symbols-outlined text-slate-400 transition-transform ${adminOverride ? 'rotate-180' : ''}`}>expand_more</span>
                </div>
                {adminOverride && (
                    <div className="mt-6 pt-6 border-t border-slate-100 space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 block">Recommendation Override</label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 text-sm font-medium rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/15"
                                    value={overrideRec}
                                    onChange={(e) => setOverrideRec(e.target.value)}
                                >
                                    <option value="STRONG_HIRE">Strong Hire</option>
                                    <option value="HIRE">Hire</option>
                                    <option value="NO_HIRE">No Hire</option>
                                    <option value="REJECT">Reject</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 block">Internal Admin Notes</label>
                            <textarea
                                rows={4}
                                className="w-full bg-slate-50 border border-slate-200 text-sm font-medium rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/15 resize-none placeholder:text-slate-400"
                                placeholder="Add your private notes about this candidate..."
                                value={overrideNotes}
                                onChange={(e) => setOverrideNotes(e.target.value)}
                            />
                        </div>
                        <div className="flex justify-end pt-2">
                            <Button variant="primary" onClick={handleSaveOverride} loading={updatingOverride}>Save Changes</Button>
                        </div>
                    </div>
                )}
            </Card>

            <Card className="print:break-inside-avoid">
                <div className="w-full flex items-center justify-between cursor-pointer" onClick={() => setShowTranscript(!showTranscript)}>
                    <CardTitle>Session Transcript</CardTitle>
                    <span className={`material-symbols-outlined text-slate-400 transition-transform ${showTranscript ? 'rotate-180' : ''} print:hidden`}>expand_more</span>
                </div>
                {showTranscript && transcript?.full_transcript && (
                    <div className="mt-6 max-h-96 print:max-h-none overflow-y-auto print:overflow-visible space-y-4 pr-2 custom-scrollbar">
                        {transcript.full_transcript.map((turn: any, i: number) => {
                            const isInterviewer = turn.role?.toLowerCase() === 'interviewer';
                            return (
                                <div key={i} className={`flex ${isInterviewer ? 'justify-start' : 'justify-end'}`}>
                                    <div className={`max-w-[85%] rounded-2xl px-5 py-3 text-sm shadow-sm ${isInterviewer
                                        ? 'bg-slate-50 text-slate-900 border border-slate-100 rounded-tl-none print:shadow-none print:bg-white print:border-l-4 print:border-l-primary/30 print:border-y-0 print:border-r-0 print:rounded-none'
                                        : 'bg-primary text-white rounded-tr-none print:shadow-none print:bg-white print:text-slate-900 print:border-r-4 print:border-r-slate-300 print:border-y-0 print:border-l-0 print:rounded-none print:text-right'
                                        }`}>
                                        <p className={`text-[10px] font-black uppercase tracking-widest mb-1.5 ${isInterviewer ? 'text-primary' : 'text-white/70 print:text-slate-500'}`}>
                                            {isInterviewer ? 'AI Interviewer' : 'Candidate'}
                                        </p>
                                        <p className="font-medium leading-relaxed">{turn.content || turn.text}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                {showTranscript && !transcript?.full_transcript?.length && (
                    <p className="mt-6 text-sm font-bold text-slate-400 italic text-center py-4 uppercase tracking-widest">Transcript not available</p>
                )}
            </Card>

            <Modal
                isOpen={showBreakdownModal}
                onClose={() => setShowBreakdownModal(false)}
                title="Technical Skill Breakdown"
                size="md"
                footer={<Button variant="outline" onClick={() => setShowBreakdownModal(false)}>Close</Button>}
            >
                <div className="py-2">
                    {renderSkillBreakdown()}
                </div>
            </Modal>
        </div>
    );
}
