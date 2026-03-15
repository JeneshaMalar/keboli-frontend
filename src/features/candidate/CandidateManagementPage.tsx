import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchCandidates, fetchInvitations, bulkUploadCandidates,
    addCandidate, revokeInvitation, deleteCandidate
} from './slices/candidateSlice';
import { fetchAssessments } from '../assessment/slices/assessmentSlice';
import type { AppDispatch, RootState } from '../../app/store';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import { invitationService, InvitationStatus } from './services/invitationService';
import { apiClient } from '../../services/apiClient';

// ─── Status helpers ──────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; border: string; label: string }> = {
    COMPLETED: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-200', label: 'Completed' },
    CLICKED: { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500', border: 'border-sky-200', label: 'Clicked' },
    SENT: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500', border: 'border-indigo-200', label: 'Sent' },
    EXPIRED: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-400', border: 'border-rose-200', label: 'Expired' },
    DEFAULT: { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-300', border: 'border-slate-200', label: 'Not Invited' },
};

function getStatusConfig(status?: string) {
    return STATUS_CONFIG[status?.toUpperCase() ?? ''] ?? STATUS_CONFIG.DEFAULT;
}
function getScoreColor(score: number) {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-500';
    return 'text-rose-500';
}
function getScoreBarColor(score: number) {
    if (score >= 80) return 'from-emerald-400 to-emerald-500';
    if (score >= 60) return 'from-amber-400 to-amber-500';
    return 'from-rose-400 to-rose-500';
}
function getInitials(name: string) {
    return name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
}

// ─── Checkbox ────────────────────────────────────────────────────────────────

function Checkbox({ checked, indeterminate, onChange }: { checked: boolean; indeterminate?: boolean; onChange: () => void }) {
    return (
        <button
            onClick={e => { e.stopPropagation(); onChange(); }}
            className={`size-[18px] rounded-[5px] flex items-center justify-center border-2 transition-all shrink-0 focus:outline-none focus:ring-2 focus:ring-primary/30 ${checked || indeterminate
                ? 'bg-primary border-primary shadow-sm'
                : 'bg-white border-slate-300 hover:border-primary/60'
                }`}
        >
            {indeterminate && !checked
                ? <span className="w-2 h-[2px] bg-white rounded-full block" />
                : checked
                    ? <span className="material-symbols-outlined text-white text-[13px]">check</span>
                    : null
            }
        </button>
    );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: string; color: string }) {
    return (
        <div className="relative overflow-hidden bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
            <div className={`absolute top-0 right-0 w-20 h-20 rounded-full opacity-[0.06] -translate-y-6 translate-x-6 ${color}`} />
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
                    <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl ${color} bg-opacity-10 flex items-center justify-center`}>
                    <span className={`material-symbols-outlined text-[20px] ${color.replace('bg-', 'text-')}`}>{icon}</span>
                </div>
            </div>
        </div>
    );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({ candidate, onConfirm, onClose, deleting }: {
    candidate: any | null; onConfirm: () => void; onClose: () => void; deleting: boolean;
}) {
    if (!candidate) return null;
    return (
        <Modal isOpen={!!candidate} onClose={onClose} title="" size="sm">
            <div className="flex flex-col items-center text-center gap-4 py-2">
                {/* Icon */}
                <div className="size-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center">
                    <span className="material-symbols-outlined text-rose-500 text-[28px]">delete_forever</span>
                </div>

                {/* Copy */}
                <div>
                    <p className="text-base font-black text-slate-900 mb-1">Delete candidate?</p>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">
                        <span className="font-bold text-slate-700">{candidate.name}</span> and all their
                        assessment history will be permanently removed. This cannot be undone.
                    </p>
                </div>

                {/* Candidate pill */}
                <div className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl w-full">
                    <div className="size-8 rounded-lg bg-gradient-to-br from-rose-100 to-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 font-black text-xs shrink-0">
                        {getInitials(candidate.name)}
                    </div>
                    <div className="text-left min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{candidate.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium truncate">{candidate.email}</p>
                    </div>
                    {candidate.invitation_count > 0 && (
                        <span className="ml-auto shrink-0 text-[10px] font-bold text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-lg">
                            {candidate.invitation_count} invite{candidate.invitation_count !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-2.5 w-full">
                    <Button variant="secondary" onClick={onClose} disabled={deleting} className="flex-1">
                        Cancel
                    </Button>
                    <button
                        onClick={onConfirm}
                        disabled={deleting}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-xl transition-all shadow-sm shadow-rose-200 active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {deleting
                            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Deleting…</>
                            : <><span className="material-symbols-outlined text-[16px]">delete</span>Yes, Delete</>
                        }
                    </button>
                </div>
            </div>
        </Modal>
    );
}

// ─── Bulk Invite Modal ───────────────────────────────────────────────────────

function BulkInviteModal({ isOpen, onClose, selectedCandidates, assessments, invitations, onSend }: {
    isOpen: boolean; onClose: () => void; selectedCandidates: any[];
    assessments: any[]; invitations: any[];
    onSend: (assessmentId: string, expiresInHours: number) => Promise<void>;
}) {
    const [assessmentId, setAssessmentId] = useState('');
    const [expiresInHours, setExpiresInHours] = useState(48);
    const [sending, setSending] = useState(false);

    useEffect(() => { if (isOpen) { setAssessmentId(''); setExpiresInHours(48); } }, [isOpen]);

    const activeAssessments = assessments.filter(a => a.is_active);

    const alreadySentCount = useMemo(() => {
        if (!assessmentId) return 0;
        return selectedCandidates.filter(c =>
            invitations.some((i: any) => i.candidate_id === c.id && i.assessment_id === assessmentId)
        ).length;
    }, [assessmentId, selectedCandidates, invitations]);

    const handleSend = async () => {
        if (!assessmentId) return;
        setSending(true);
        try { await onSend(assessmentId, expiresInHours); onClose(); }
        finally { setSending(false); }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Send Assessment to Selected Candidates" size="md"
            footer={
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={handleSend} disabled={!assessmentId || sending} loading={sending}>
                        Send to {selectedCandidates.length} Candidate{selectedCandidates.length !== 1 ? 's' : ''}
                    </Button>
                </div>
            }
        >
            <div className="space-y-5 py-2">
                {/* Chips preview */}
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Selected ({selectedCandidates.length})</p>
                    <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto custom-scrollbar p-0.5">
                        {selectedCandidates.map(c => (
                            <div key={c.id} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                                <div className="size-5 rounded-md bg-gradient-to-br from-primary/10 to-indigo-100 flex items-center justify-center text-primary font-black text-[9px]">
                                    {getInitials(c.name)}
                                </div>
                                <span className="text-xs font-semibold text-slate-700">{c.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Assessment */}
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Assessment <span className="text-rose-400">*</span></label>
                    <select className="w-full bg-slate-50 border border-slate-200 text-sm font-semibold rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                        value={assessmentId} onChange={e => setAssessmentId(e.target.value)}>
                        <option value="">Choose an assessment…</option>
                        {activeAssessments.map(a => <option key={a.id} value={a.id}>{a.title}{a.display_id ? ` (${a.display_id})` : ''}</option>)}
                    </select>
                    {alreadySentCount > 0 && (
                        <div className="flex items-start gap-2 mt-2.5 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                            <span className="material-symbols-outlined text-amber-500 text-[15px] mt-0.5 shrink-0">warning</span>
                            <p className="text-xs font-semibold text-amber-700">
                                {alreadySentCount} candidate{alreadySentCount !== 1 ? 's have' : ' has'} already been invited to this assessment. New links will be created.
                            </p>
                        </div>
                    )}
                </div>

                {/* Expiry */}
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Link Expiry</label>
                    <div className="flex items-center gap-2 mb-2">
                        {[24, 48, 72, 168].map(h => (
                            <button key={h} onClick={() => setExpiresInHours(h)}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${expiresInHours === h ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                                {h < 48 ? `${h}h` : h === 168 ? '7d' : `${h / 24}d`}
                            </button>
                        ))}
                    </div>
                    <input type="number" min={1} className="w-full bg-slate-50 border border-slate-200 text-sm font-semibold rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20"
                        value={expiresInHours} onChange={e => setExpiresInHours(parseInt(e.target.value) || 48)} />
                </div>
            </div>
        </Modal>
    );
}

// ─── Send Assessment Modal (single) ─────────────────────────────────────────

function SendAssessmentModal({ isOpen, onClose, candidate, assessments, existingInvitations, onSend }: {
    isOpen: boolean; onClose: () => void; candidate: any | null;
    assessments: any[]; existingInvitations: any[];
    onSend: (assessmentId: string, expiresInHours: number) => Promise<void>;
}) {
    const [assessmentId, setAssessmentId] = useState('');
    const [expiresInHours, setExpiresInHours] = useState(48);
    const [sending, setSending] = useState(false);
    const alreadySentIds = new Set(existingInvitations.map((i: any) => i.assessment_id));
    const available = assessments.filter(a => a.is_active);

    useEffect(() => { if (isOpen) { setAssessmentId(''); setExpiresInHours(48); } }, [isOpen]);

    const handleSend = async () => {
        if (!assessmentId) return;
        setSending(true);
        try { await onSend(assessmentId, expiresInHours); onClose(); }
        finally { setSending(false); }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Send Assessment — ${candidate?.name ?? ''}`} size="md"
            footer={<div className="flex gap-3"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={handleSend} disabled={!assessmentId || sending} loading={sending}>Send Invitation</Button></div>}
        >
            <div className="space-y-5 py-2">
                {existingInvitations.length > 0 && (
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Previous Invitations</p>
                        <div className="space-y-2 max-h-36 overflow-y-auto custom-scrollbar">
                            {existingInvitations.map((inv: any) => {
                                const cfg = getStatusConfig(inv.status);
                                const aTitle = available.find(a => a.id === inv.assessment_id)?.title ?? inv.assessment_id;
                                return (
                                    <div key={inv.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <span className={`shrink-0 w-2 h-2 rounded-full ${cfg.dot}`} />
                                            <span className="text-xs font-semibold text-slate-700 truncate">{aTitle}</span>
                                        </div>
                                        <span className={`shrink-0 ml-2 text-[10px] font-bold px-2 py-0.5 rounded-lg border ${cfg.bg} ${cfg.text} ${cfg.border}`}>{cfg.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Select Assessment <span className="text-rose-400">*</span></label>
                    <select className="w-full bg-slate-50 border border-slate-200 text-sm font-semibold rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                        value={assessmentId} onChange={e => setAssessmentId(e.target.value)}>
                        <option value="">Choose an assessment…</option>
                        {available.map(a => <option key={a.id} value={a.id}>{a.title}{a.display_id ? ` (${a.display_id})` : ''}</option>)}
                    </select>
                    {assessmentId && alreadySentIds.has(assessmentId) && (
                        <div className="flex items-start gap-2 mt-2.5 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                            <span className="material-symbols-outlined text-amber-500 text-[16px] mt-0.5 shrink-0">warning</span>
                            <p className="text-xs font-semibold text-amber-700">Already invited. Sending again creates a new link.</p>
                        </div>
                    )}
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Link Expiry</label>
                    <div className="flex items-center gap-2 mb-2">
                        {[24, 48, 72, 168].map(h => (
                            <button key={h} onClick={() => setExpiresInHours(h)}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${expiresInHours === h ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                                {h < 48 ? `${h}h` : h === 168 ? '7d' : `${h / 24}d`}
                            </button>
                        ))}
                    </div>
                    <input type="number" min={1} className="w-full bg-slate-50 border border-slate-200 text-sm font-semibold rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20"
                        value={expiresInHours} onChange={e => setExpiresInHours(parseInt(e.target.value) || 48)} />
                </div>
            </div>
        </Modal>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CandidateManagementPage() {
    const dispatch = useDispatch<AppDispatch>();
    const { candidates, invitations, loading } = useSelector((state: RootState) => state.candidate);
    const { assessments } = useSelector((state: RootState) => state.assessment);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [assessmentFilter, setAssessmentFilter] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // ── Selection ──────────────────────────────────────────────────────────────
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // ── Modals ────────────────────────────────────────────────────────────────
    const [showAddModal, setShowAddModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showSendModal, setShowSendModal] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [selectedForSend, setSelectedForSend] = useState<any>(null);
    const [selectedCandidate, setSelectedCandidate] = useState<any>(null);

    // Gen-link
    const [genLinkMode, setGenLinkMode] = useState<'single' | 'bulk'>('single');
    const [genLinkFile, setGenLinkFile] = useState<File | null>(null);
    const [generating, setGenerating] = useState(false);
    const [addForm, setAddForm] = useState({ name: '', email: '', resume_url: '' });
    const [inviteForm, setInviteForm] = useState({ assessment_id: '', expires_in_hours: 48 });

    // Eval
    const [evalReport, setEvalReport] = useState<any>(null);
    const [evalLoading, setEvalLoading] = useState(false);
    const [showTranscript, setShowTranscript] = useState(false);
    const [triggeringEval, setTriggeringEval] = useState(false);

    // ── FIX: track which session is being viewed (not always the latest) ──────
    const [activeReportSessionId, setActiveReportSessionId] = useState<string | null>(null);

    // ── Delete confirmation modal ─────────────────────────────────────────────
    const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
    const [deleting, setDeleting] = useState(false);

    const location = useLocation();

    useEffect(() => {
        dispatch(fetchCandidates()); dispatch(fetchInvitations()); dispatch(fetchAssessments());
    }, [dispatch]);

    useEffect(() => {
        const t = new URLSearchParams(location.search).get('assessment');
        if (t) setAssessmentFilter(t);
    }, [location.search]);

    // ── When the candidate modal opens, default to their latest session ────────
    useEffect(() => {
        if (selectedCandidate) {
            setActiveReportSessionId(selectedCandidate.latest_session_id ?? null);
            setShowTranscript(false);
        } else {
            setActiveReportSessionId(null);
            setEvalReport(null);
        }
    }, [selectedCandidate?.id]);

    // ── FIX: fetch report whenever activeReportSessionId changes ─────────────
    useEffect(() => {
        if (!activeReportSessionId) {
            setEvalReport(null);
            return;
        }
        setEvalLoading(true);
        setEvalReport(null);
        setShowTranscript(false);
        apiClient.get(`/evaluation/report/${activeReportSessionId}`)
            .then((r: { data: any }) => setEvalReport(r.data))
            .catch(() => setEvalReport(null))
            .finally(() => setEvalLoading(false));
    }, [activeReportSessionId]);

    // ── Derived ───────────────────────────────────────────────────────────────

    const unifiedData = useMemo(() => candidates.map((c: any) => {
        const cInvs = invitations
            .filter((i: any) => i.candidate_id === c.id)
            .sort((a: any, b: any) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());
        const latest = cInvs[0];
        const linked = latest ? assessments.find(a => a.id === latest.assessment_id) : null;
        return {
            ...c, all_invitations: cInvs, invitation_count: cInvs.length,
            latest_status: latest?.status, latest_invitation_id: latest?.id,
            latest_session_id: (latest as any)?.latest_session_id,
            latest_session_status: (latest as any)?.latest_session_status,
            latest_assessment_title: linked?.title,
            latest_assessment_display_id: linked?.display_id,
            score: (latest as any)?.total_score,
            recommendation: (latest as any)?.hiring_recommendation,
        };
    }), [candidates, invitations, assessments]);

    const filteredData = useMemo(() => {
        let data = unifiedData;
        if (search) { const s = search.toLowerCase(); data = data.filter((c: any) => c.name.toLowerCase().includes(s) || c.email.toLowerCase().includes(s)); }
        if (statusFilter !== 'All') data = data.filter((c: any) => statusFilter === 'Not Invited' ? !c.latest_status : c.latest_status?.toUpperCase() === statusFilter.toUpperCase());
        if (assessmentFilter !== 'All') data = data.filter((c: any) => c.latest_assessment_title === assessmentFilter);
        return data;
    }, [unifiedData, search, statusFilter, assessmentFilter]);

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedItems = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const stats = useMemo(() => ({
        total: unifiedData.length,
        completed: unifiedData.filter((c: any) => c.latest_status?.toUpperCase() === 'COMPLETED').length,
        pending: unifiedData.filter((c: any) => c.latest_status?.toUpperCase() === 'SENT').length,
        noInvite: unifiedData.filter((c: any) => !c.latest_status).length,
    }), [unifiedData]);

    // ── Selection helpers ─────────────────────────────────────────────────────

    const pageIds = paginatedItems.map((c: any) => c.id);
    const selectedOnPage = pageIds.filter((id: string) => selectedIds.has(id));
    const allPageSelected = pageIds.length > 0 && selectedOnPage.length === pageIds.length;
    const somePageSelected = selectedOnPage.length > 0 && !allPageSelected;

    const toggleOne = (id: string) => setSelectedIds(prev => {
        const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
    });

    const togglePage = () => setSelectedIds(prev => {
        const next = new Set(prev);
        allPageSelected ? pageIds.forEach((id: string) => next.delete(id)) : pageIds.forEach((id: string) => next.add(id));
        return next;
    });

    const clearSelection = () => setSelectedIds(new Set());

    const selectedCandidatesData = useMemo(
        () => filteredData.filter((c: any) => selectedIds.has(c.id)),
        [filteredData, selectedIds]
    );

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleAdd = async () => {
        try { await dispatch(addCandidate(addForm)).unwrap(); setShowAddModal(false); setAddForm({ name: '', email: '', resume_url: '' }); dispatch(fetchCandidates()); }
        catch (error: any) { alert('Failed: ' + (typeof error === 'string' ? error : JSON.stringify(error))); }
    };

    const handleGenerateLink = async () => {
        if (!inviteForm.assessment_id) { alert("Select an assessment."); return; }
        setGenerating(true);
        try {
            if (genLinkMode === 'single') {
                if (!addForm.name || !addForm.email) { alert("Provide name and email."); setGenerating(false); return; }
                const nc = await dispatch(addCandidate(addForm)).unwrap();
                await invitationService.createInvitation({ candidate_id: nc.id, assessment_id: inviteForm.assessment_id, expires_in_hours: inviteForm.expires_in_hours });
            } else {
                if (!genLinkFile) { alert("Upload a CSV."); setGenerating(false); return; }
                const old = candidates; const result = await dispatch(bulkUploadCandidates(genLinkFile)).unwrap();
                const next = await dispatch(fetchCandidates()).unwrap();
                const newCs = next.filter((nc: any) => !old.find((oc: any) => oc.id === nc.id));
                for (const c of newCs) await invitationService.createInvitation({ candidate_id: c.id, assessment_id: inviteForm.assessment_id, expires_in_hours: inviteForm.expires_in_hours });
                if (result.errors?.length > 0) alert('Done with errors:\n' + result.errors.join('\n'));
            }
            dispatch(fetchCandidates()); dispatch(fetchInvitations()); setShowInviteModal(false);
        } catch (error: any) { alert('Failed:\n' + (typeof error === 'string' ? error : JSON.stringify(error))); }
        finally { setGenerating(false); }
    };

    const handleSendAssessment = async (assessmentId: string, expiresInHours: number) => {
        if (!selectedForSend) return;
        await invitationService.createInvitation({ candidate_id: selectedForSend.id, assessment_id: assessmentId, expires_in_hours: expiresInHours });
        dispatch(fetchInvitations());
    };

    const handleBulkSend = async (assessmentId: string, expiresInHours: number) => {
        await Promise.all(
            selectedCandidatesData.map((c: any) =>
                invitationService.createInvitation({ candidate_id: c.id, assessment_id: assessmentId, expires_in_hours: expiresInHours })
            )
        );
        dispatch(fetchInvitations());
        clearSelection();
    };

    const handleRevoke = async (invitationId: string) => {
        if (!window.confirm('Revoke this invitation?')) return;
        await dispatch(revokeInvitation(invitationId)).unwrap(); dispatch(fetchInvitations());
    };

    const handleDelete = (candidate: any) => {
        setDeleteTarget(candidate);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await dispatch(deleteCandidate(deleteTarget.id)).unwrap();
            dispatch(fetchCandidates());
            setDeleteTarget(null);
        } catch (error: any) {
            alert('Failed: ' + (typeof error === 'string' ? error : error?.message));
        } finally {
            setDeleting(false);
        }
    };

    const handleGenerateReport = async (sessionId: string) => {
        setTriggeringEval(true);
        try {
            await apiClient.post(`/evaluation/trigger/${sessionId}`);
            setTimeout(() => {
                apiClient.get(`/evaluation/report/${sessionId}`)
                    .then((r: { data: any }) => setEvalReport(r.data)).catch(() => setEvalReport(null)).finally(() => setTriggeringEval(false));
            }, 3000);
        } catch { alert("Failed to trigger evaluation."); setTriggeringEval(false); }
    };

    const copyLink = (inv: any) => { navigator.clipboard.writeText(`${window.location.origin}/interview?token=${inv.token}`); alert('Link copied!'); };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900">Candidates</h2>
                    <p className="text-slate-500 text-sm mt-0.5 font-medium">Manage your recruitment pipeline and track every step.</p>
                </div>
                <div className="flex items-center gap-2.5">
                    <button onClick={() => setShowAddModal(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
                        <span className="material-symbols-outlined text-[17px]">person_add</span>Add Candidate
                    </button>
                    <button onClick={() => { setInviteForm({ assessment_id: '', expires_in_hours: 48 }); setGenLinkMode('single'); setAddForm({ name: '', email: '', resume_url: '' }); setGenLinkFile(null); setShowInviteModal(true); }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all active:scale-[0.98]">
                        <span className="material-symbols-outlined text-[17px]">add_link</span>Generate Link
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Candidates" value={stats.total} icon="group" color="bg-yellow-500" />
                <StatCard label="Completed" value={stats.completed} icon="task_alt" color="bg-green-500" />
                <StatCard label="Awaiting Response" value={stats.pending} icon="pending_actions" color="bg-blue-400" />
                <StatCard label="Not Invited" value={stats.noInvite} icon="mail_off" color="bg-gray-400" />
            </div>

            {/* Filters */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 flex flex-wrap items-center gap-3 shadow-sm">
                <div className="relative flex-1 min-w-[240px] group">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-[17px] text-slate-400 group-focus-within:text-primary transition-colors">search</span>
                    <input className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/15 focus:border-primary/40 outline-none transition-all placeholder:text-slate-400"
                        placeholder="Search name or email…" value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <select className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl py-2.5 pl-3.5 pr-8 outline-none cursor-pointer hover:border-slate-300 transition-all"
                        value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
                        <option value="All">All Statuses</option>
                        <option value="Not Invited">Not Invited</option>
                        <option value="SENT">Sent</option>
                        <option value="CLICKED">Clicked</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="EXPIRED">Expired</option>
                    </select>
                    <select className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl py-2.5 pl-3.5 pr-8 outline-none cursor-pointer hover:border-slate-300 transition-all max-w-[180px]"
                        value={assessmentFilter} onChange={e => { setAssessmentFilter(e.target.value); setCurrentPage(1); }}>
                        <option value="All">All Assessments</option>
                        {assessments.map(a => <option key={a.id} value={a.title}>{a.title}{a.display_id ? ` (${a.display_id})` : ''}</option>)}
                    </select>
                    {(search || statusFilter !== 'All' || assessmentFilter !== 'All') && (
                        <button onClick={() => { setSearch(''); setStatusFilter('All'); setAssessmentFilter('All'); setCurrentPage(1); }}
                            className="inline-flex items-center gap-1 px-3 py-2.5 text-xs font-bold text-slate-500 hover:text-rose-500 bg-slate-50 border border-slate-200 rounded-xl transition-colors">
                            <span className="material-symbols-outlined text-[14px]">close</span>Clear
                        </button>
                    )}
                </div>
                <span className="ml-auto text-[11px] font-bold text-slate-400">{filteredData.length} result{filteredData.length !== 1 ? 's' : ''}</span>
            </div>

            {/* ── Bulk action bar ── */}
            {selectedIds.size > 0 && (
                <div className="flex items-center justify-between gap-4 px-5 py-3.5 bg-primary/[0.04] border border-primary/20 rounded-2xl">
                    <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
                        </div>
                        <div>
                            <p className="text-sm font-black text-slate-900 leading-tight">
                                {selectedIds.size} candidate{selectedIds.size !== 1 ? 's' : ''} selected
                            </p>
                            <p className="text-[11px] text-slate-500 font-medium">Choose an action to apply to all selected</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => setShowBulkModal(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-all shadow-sm shadow-primary/20 active:scale-[0.97]"
                        >
                            <span className="material-symbols-outlined text-[15px]">send</span>
                            Send Assessment
                        </button>
                        <button
                            onClick={clearSelection}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white text-slate-500 text-xs font-bold rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 transition-all"
                        >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                            Clear
                        </button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/70 border-b border-slate-100">
                                <th className="pl-5 pr-3 py-4 w-10">
                                    <Checkbox checked={allPageSelected} indeterminate={somePageSelected} onChange={togglePage} />
                                </th>
                                <th className="px-3 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Candidate</th>
                                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Latest Assessment</th>
                                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Score</th>
                                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Recommendation</th>
                                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading && candidates.length === 0 ? (
                                <tr><td colSpan={7} className="py-24 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-9 h-9 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" />
                                        <span className="text-xs font-semibold text-slate-400">Loading candidates…</span>
                                    </div>
                                </td></tr>
                            ) : paginatedItems.length === 0 ? (
                                <tr><td colSpan={7} className="py-24 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <span className="material-symbols-outlined text-slate-200 text-5xl">person_search</span>
                                        <span className="text-sm font-bold text-slate-400">No candidates match your filters.</span>
                                        <button onClick={() => { setSearch(''); setStatusFilter('All'); setAssessmentFilter('All'); }} className="mt-2 text-xs font-bold text-primary hover:underline">Clear filters</button>
                                    </div>
                                </td></tr>
                            ) : paginatedItems.map((c: any) => {
                                const statusCfg = getStatusConfig(c.latest_status);
                                const hasScore = c.score !== null && c.score !== undefined;
                                const isSelected = selectedIds.has(c.id);
                                return (
                                    <tr key={c.id} className={`transition-colors group ${isSelected ? 'bg-primary/[0.025]' : 'hover:bg-slate-50/60'}`}>
                                        {/* Checkbox */}
                                        <td className="pl-5 pr-3 py-4">
                                            <Checkbox checked={isSelected} onChange={() => toggleOne(c.id)} />
                                        </td>

                                        {/* Candidate */}
                                        <td className="px-3 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="relative shrink-0">
                                                    <div className={`size-10 rounded-xl flex items-center justify-center font-black text-xs border transition-all ${isSelected ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-gradient-to-br from-primary/10 to-indigo-100 border-primary/10 text-primary'}`}>
                                                        {getInitials(c.name)}
                                                    </div>
                                                    {c.invitation_count > 1 && (
                                                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-indigo-500 text-white text-[9px] font-black flex items-center justify-center border-2 border-white">{c.invitation_count}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900 leading-tight">{c.name}</p>
                                                    <p className="text-[11px] text-slate-400 font-medium">{c.email}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Assessment */}
                                        <td className="px-5 py-4">
                                            {c.latest_assessment_title
                                                ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg w-max">{c.latest_assessment_title}</span>
                                                        {c.latest_assessment_display_id && (
                                                            <span className="text-[10px] font-mono text-slate-400 pl-1">{c.latest_assessment_display_id}</span>
                                                        )}
                                                    </div>
                                                )
                                                : <span className="text-slate-300 text-xs">—</span>}
                                        </td>

                                        {/* Score */}
                                        <td className="px-5 py-4 text-center">
                                            {hasScore ? (
                                                <div className="inline-flex flex-col items-center">
                                                    <span className={`text-base font-black ${getScoreColor(c.score)}`}>{Math.round(c.score)}</span>
                                                    <div className="w-10 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                                        <div className={`h-full bg-gradient-to-r ${getScoreBarColor(c.score)} rounded-full`} style={{ width: `${c.score}%` }} />
                                                    </div>
                                                </div>
                                            ) : <span className="text-slate-300 text-sm">—</span>}
                                        </td>

                                        {/* Recommendation */}
                                        <td className="px-5 py-4">
                                            {c.recommendation
                                                ? <Badge variant={c.recommendation === 'STRONG_HIRE' ? 'success' : c.recommendation === 'REJECT' ? 'error' : 'active'} className="text-[10px] font-black">{c.recommendation.replace(/_/g, ' ')}</Badge>
                                                : <span className="text-slate-300 text-xs">—</span>}
                                        </td>

                                        {/* Status */}
                                        <td className="px-5 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                                                <span className={`size-1.5 rounded-full shrink-0 ${statusCfg.dot} ${c.latest_status?.toUpperCase() === 'SENT' ? 'animate-pulse' : ''}`} />
                                                {statusCfg.label}
                                            </span>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-end gap-0.5">
                                                <button onClick={() => setSelectedCandidate(c)} className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all" title="View Report">
                                                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                                                </button>
                                                <button onClick={() => { setSelectedForSend(c); setShowSendModal(true); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Send Assessment">
                                                    <span className="material-symbols-outlined text-[18px]">send</span>
                                                </button>
                                                {c.latest_status === InvitationStatus.SENT && c.latest_invitation_id && (<>
                                                    <button onClick={() => { const inv = invitations.find((i: any) => i.id === c.latest_invitation_id); if (inv) copyLink(inv); }}
                                                        className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all" title="Copy Link">
                                                        <span className="material-symbols-outlined text-[18px]">content_copy</span>
                                                    </button>
                                                    <button onClick={() => handleRevoke(c.latest_invitation_id!)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all" title="Revoke">
                                                        <span className="material-symbols-outlined text-[18px]">block</span>
                                                    </button>
                                                </>)}
                                                <button onClick={() => handleDelete(c)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Delete">
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="border-t border-slate-100">
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filteredData.length} itemsPerPage={itemsPerPage} />
                </div>
            </div>

            {/* Add Modal */}
            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Candidate"
                footer={<div className="flex gap-3"><Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button><Button variant="primary" onClick={handleAdd} disabled={!addForm.name || !addForm.email}>Save Candidate</Button></div>}
            >
                <div className="space-y-4 py-2">
                    <Input label="Full Name" placeholder="Jane Smith" value={addForm.name} onChange={(e: any) => setAddForm(p => ({ ...p, name: e.target.value }))} />
                    <Input label="Email Address" type="email" placeholder="jane@example.com" value={addForm.email} onChange={(e: any) => setAddForm(p => ({ ...p, email: e.target.value }))} />
                    <Input label="Resume URL (Optional)" placeholder="https://linkedin.com/in/…" value={addForm.resume_url} onChange={(e: any) => setAddForm(p => ({ ...p, resume_url: e.target.value }))} />
                </div>
            </Modal>

            {/* Generate Link Modal */}
            <Modal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} title="Generate Invitation Link"
                footer={<div className="flex gap-3"><Button variant="secondary" onClick={() => setShowInviteModal(false)}>Cancel</Button><Button variant="primary" onClick={handleGenerateLink} loading={generating} disabled={generating || !inviteForm.assessment_id || (genLinkMode === 'single' ? (!addForm.name || !addForm.email) : !genLinkFile)}>Generate Link{genLinkMode === 'bulk' ? 's' : ''}</Button></div>}
            >
                <div className="space-y-5 py-2">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Assessment <span className="text-rose-400">*</span></label>
                        <select className="w-full bg-slate-50 border border-slate-200 text-sm font-semibold rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                            value={inviteForm.assessment_id} onChange={e => setInviteForm(p => ({ ...p, assessment_id: e.target.value }))}>
                            <option value="">Select an assessment…</option>
                            {assessments.filter(a => a.is_active).map(a => <option key={a.id} value={a.id}>{a.title}{a.display_id ? ` (${a.display_id})` : ''}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Link Expiry</label>
                        <div className="flex items-center gap-2 mb-2">
                            {[24, 48, 72, 168].map(h => (
                                <button key={h} onClick={() => setInviteForm(p => ({ ...p, expires_in_hours: h }))}
                                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${inviteForm.expires_in_hours === h ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                                    {h < 48 ? `${h}h` : h === 168 ? '7d' : `${h / 24}d`}
                                </button>
                            ))}
                        </div>
                        <input type="number" min={1} className="w-full bg-slate-50 border border-slate-200 text-sm font-semibold rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20"
                            value={inviteForm.expires_in_hours} onChange={e => setInviteForm(p => ({ ...p, expires_in_hours: parseInt(e.target.value) || 48 }))} />
                    </div>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        {(['single', 'bulk'] as const).map(mode => (
                            <button key={mode} onClick={() => setGenLinkMode(mode)}
                                className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${genLinkMode === mode ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                {mode === 'single' ? 'Single Candidate' : 'Bulk Upload CSV'}
                            </button>
                        ))}
                    </div>
                    {genLinkMode === 'single' ? (
                        <div className="space-y-3">
                            <Input label="Full Name" placeholder="Jane Smith" value={addForm.name} onChange={(e: any) => setAddForm(p => ({ ...p, name: e.target.value }))} />
                            <Input label="Email Address" type="email" placeholder="jane@example.com" value={addForm.email} onChange={(e: any) => setAddForm(p => ({ ...p, email: e.target.value }))} />
                            <Input label="Resume URL (Optional)" placeholder="https://…" value={addForm.resume_url} onChange={(e: any) => setAddForm(p => ({ ...p, resume_url: e.target.value }))} />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">CSV File</label>
                            <div className={`relative flex items-center justify-center border-2 border-dashed rounded-xl p-8 transition-all ${genLinkFile ? 'border-primary/40 bg-primary/5' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}>
                                {genLinkFile ? (
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-primary text-2xl">description</span>
                                        <div><p className="text-sm font-bold text-slate-800">{genLinkFile.name}</p><p className="text-xs text-slate-500">{(genLinkFile.size / 1024).toFixed(1)} KB</p></div>
                                        <button onClick={() => setGenLinkFile(null)} className="ml-2 p-1 hover:bg-rose-50 hover:text-rose-500 rounded-lg transition-colors"><span className="material-symbols-outlined text-[16px]">close</span></button>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <span className="material-symbols-outlined text-slate-300 text-3xl block mb-2">upload_file</span>
                                        <p className="text-sm font-bold text-slate-500">Drop CSV or click to browse</p>
                                        <p className="text-[10px] text-slate-400 mt-1">Needs <code className="bg-slate-200 px-1 rounded">name</code> and <code className="bg-slate-200 px-1 rounded">email</code> columns</p>
                                    </div>
                                )}
                                <input type="file" accept=".csv" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setGenLinkFile(e.target.files?.[0] || null)} />
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Single Send Modal */}
            <SendAssessmentModal isOpen={showSendModal} onClose={() => { setShowSendModal(false); setSelectedForSend(null); }}
                candidate={selectedForSend} assessments={assessments}
                existingInvitations={selectedForSend ? invitations.filter((i: any) => i.candidate_id === selectedForSend.id) : []}
                onSend={handleSendAssessment} />

            {/* Bulk Invite Modal */}
            <BulkInviteModal isOpen={showBulkModal} onClose={() => setShowBulkModal(false)}
                selectedCandidates={selectedCandidatesData} assessments={assessments} invitations={invitations} onSend={handleBulkSend} />

            {/* ── Candidate Detail Modal ─────────────────────────────────────────── */}
            <Modal isOpen={!!selectedCandidate} onClose={() => setSelectedCandidate(null)} title="" size="xl">
                {selectedCandidate && (
                    <div className="space-y-6 -mt-2">
                        {/* Hero strip */}
                        <div className="flex items-center justify-between p-5 -mx-6 -mt-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                            <div className="flex items-center gap-4">
                                <div className="size-14 rounded-2xl bg-gradient-to-br from-primary/15 to-indigo-100 border border-primary/10 flex items-center justify-center text-primary font-black text-lg">{getInitials(selectedCandidate.name)}</div>
                                <div><h3 className="text-lg font-black text-slate-900">{selectedCandidate.name}</h3><p className="text-sm text-slate-500 font-medium">{selectedCandidate.email}</p></div>
                            </div>
                            <button onClick={() => { setSelectedCandidate(null); setSelectedForSend(selectedCandidate); setShowSendModal(true); }}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-all shadow-sm shadow-primary/20">
                                <span className="material-symbols-outlined text-[15px]">send</span>Send Assessment
                            </button>
                        </div>

                        {/* Assessment Journey */}
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Assessment Journey</p>
                            {selectedCandidate.all_invitations?.length > 0 ? (
                                <div className="space-y-2">
                                    {selectedCandidate.all_invitations.map((inv: any, idx: number) => {
                                        const cfg = getStatusConfig(inv.status);
                                        const aTitle = assessments.find(a => a.id === inv.assessment_id)?.title ?? 'Assessment';
                                        // FIX: each invitation carries its own session id
                                        const sessionId: string | undefined = (inv as any)?.latest_session_id;
                                        const isActiveSession = !!sessionId && activeReportSessionId === sessionId;
                                        return (
                                            <div key={inv.id} className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${isActiveSession
                                                ? 'bg-primary/[0.04] border-primary/30 ring-1 ring-primary/20'
                                                : idx === 0 ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-100'
                                                }`}>
                                                <div className="flex items-center gap-3">
                                                    <span className={`size-8 rounded-lg flex items-center justify-center ${cfg.bg} border ${cfg.border}`}><span className={`size-2 rounded-full ${cfg.dot}`} /></span>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-800">{aTitle}</p>
                                                        <p className="text-[10px] text-slate-400 font-medium">{new Date(inv.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {idx === 0 && <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-md">Latest</span>}
                                                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${cfg.bg} ${cfg.text} ${cfg.border}`}>{cfg.label}</span>

                                                    {/* ── FIX: "View Report" button on every invitation that has a session ── */}
                                                    {sessionId && (
                                                        <button
                                                            onClick={() => setActiveReportSessionId(isActiveSession ? null : sessionId)}
                                                            title={isActiveSession ? 'Collapse report' : 'View report for this session'}
                                                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${isActiveSession
                                                                ? 'bg-primary text-white border-primary shadow-sm'
                                                                : 'bg-white text-primary border-primary/30 hover:bg-primary/5'
                                                                }`}
                                                        >
                                                            <span className="material-symbols-outlined text-[13px]">
                                                                {isActiveSession ? 'expand_less' : 'analytics'}
                                                            </span>
                                                            {isActiveSession ? 'Collapse' : 'View Report'}
                                                        </button>
                                                    )}

                                                    {inv.status?.toUpperCase() === 'SENT' && <>
                                                        <button onClick={() => copyLink(inv)} className="p-1.5 hover:bg-sky-50 hover:text-sky-600 text-slate-400 rounded-lg transition-colors" title="Copy"><span className="material-symbols-outlined text-[15px]">content_copy</span></button>
                                                        <button onClick={() => handleRevoke(inv.id)} className="p-1.5 hover:bg-amber-50 hover:text-amber-600 text-slate-400 rounded-lg transition-colors" title="Revoke"><span className="material-symbols-outlined text-[15px]">block</span></button>
                                                    </>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    <span className="material-symbols-outlined text-slate-200 text-3xl block mb-1">mail_off</span>
                                    <p className="text-xs font-semibold text-slate-400">No assessments sent yet</p>
                                </div>
                            )}
                        </div>

                        {/* ── Evaluation Report panel — shown below whichever row is active ── */}
                        {activeReportSessionId && (
                            <div className="border-t border-slate-100 pt-5">
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Evaluation Report</p>
                                    {!evalLoading && evalReport?.evaluation && (
                                        <Button variant="primary" size="sm" onClick={() => window.open(`/evaluation/${activeReportSessionId}`, '_blank')}>
                                            Full Report ↗
                                        </Button>
                                    )}
                                </div>

                                {evalLoading ? (
                                    <div className="flex flex-col items-center justify-center py-14 gap-3">
                                        <div className="w-9 h-9 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" />
                                        <span className="text-xs font-semibold text-slate-400">Loading…</span>
                                    </div>
                                ) : !evalReport?.evaluation ? (
                                    <div className="p-10 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                                        <div className="inline-flex items-center justify-center size-12 rounded-2xl bg-white border border-slate-200 text-slate-400 mb-4 shadow-sm">
                                            <span className="material-symbols-outlined text-2xl">analytics</span>
                                        </div>
                                        {(() => {
                                            // Find the session status for the active session specifically
                                            const matchedInv = selectedCandidate.all_invitations?.find(
                                                (inv: any) => (inv as any)?.latest_session_id === activeReportSessionId
                                            );
                                            const s = (matchedInv as any)?.latest_session_status?.toUpperCase();
                                            const isC = s === 'COMPLETED', isA = s === 'ABANDONED', isP = s === 'IN_PROGRESS';
                                            return (<>
                                                <p className="text-sm font-black text-slate-800 mb-1.5">{isC ? 'Report Pending' : isA ? 'Interview Abandoned' : isP ? 'In Progress' : 'No Session Yet'}</p>
                                                <p className="text-xs text-slate-400 max-w-[240px] mx-auto mb-5">{isC ? 'Interview finished. Generate the AI report.' : isA ? 'Left early. Partial report available.' : isP ? 'Candidate is in the interview now.' : 'No session started yet.'}</p>
                                                {(isC || isA) && (
                                                    <Button variant="primary" size="sm" onClick={() => handleGenerateReport(activeReportSessionId)} loading={triggeringEval}>
                                                        Generate AI Report
                                                    </Button>
                                                )}
                                            </>);
                                        })()}
                                    </div>
                                ) : (() => {
                                    const ev = evalReport.evaluation; const transcript = evalReport.transcript;
                                    const rec = ev?.hiring_recommendation?.toUpperCase();
                                    const recV = rec === 'STRONG_HIRE' ? 'success' : rec === 'HIRE' ? 'active' : rec === 'REJECT' ? 'error' : 'secondary';
                                    const cats = [
                                        { label: 'Technical', score: ev?.technical_score, icon: 'code' },
                                        { label: 'Communication', score: ev?.communication_score, icon: 'forum' },
                                        { label: 'Confidence', score: ev?.confidence_score, icon: 'psychology' },
                                        { label: 'Cultural Fit', score: ev?.cultural_alignment_score, icon: 'diversity_3' },
                                    ];
                                    return (
                                        <div className="space-y-5">
                                            <div className="flex flex-col md:flex-row gap-4">
                                                <div className="shrink-0 bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col items-center justify-center min-w-[160px] shadow-sm">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Overall</p>
                                                    <div className="relative flex items-center justify-center w-20 h-20">
                                                        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 120 120">
                                                            <circle cx="60" cy="60" r="52" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                                                            <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="10"
                                                                strokeDasharray={`${(ev?.total_score || 0) * 3.27} 327`} strokeLinecap="round"
                                                                className={`transition-all duration-1000 ${(ev?.total_score || 0) >= 80 ? 'text-emerald-500' : (ev?.total_score || 0) >= 60 ? 'text-amber-500' : 'text-rose-500'}`} />
                                                        </svg>
                                                        <span className={`absolute text-xl font-black ${getScoreColor(ev?.total_score || 0)}`}>{ev?.total_score ? Math.round(ev.total_score) : '—'}</span>
                                                    </div>
                                                    <div className="mt-3"><Badge variant={recV as any} className="text-[10px] font-black">{(ev?.hiring_recommendation ?? 'Pending').replace(/_/g, ' ').toUpperCase()}</Badge></div>
                                                </div>
                                                <div className="flex-1 grid grid-cols-2 gap-3">
                                                    {cats.map(cat => {
                                                        const s = cat.score ?? 0; return (
                                                            <div key={cat.label} className="bg-white border border-slate-200/80 rounded-xl p-3.5 hover:shadow-sm transition-shadow">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-primary text-[14px]">{cat.icon}</span><span className="text-xs font-bold text-slate-700">{cat.label}</span></div>
                                                                    <span className={`text-xs font-black ${getScoreColor(s)}`}>{cat.score != null ? Math.round(cat.score) : '—'}</span>
                                                                </div>
                                                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full bg-gradient-to-r ${getScoreBarColor(s)} rounded-full`} style={{ width: `${s}%` }} /></div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            {ev?.ai_summary && (
                                                <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200/80 p-5">
                                                    <div className="flex items-center gap-2 mb-3"><span className="material-symbols-outlined text-primary text-[18px]">auto_awesome</span><span className="text-xs font-black text-slate-800 uppercase tracking-widest">AI Analysis</span></div>
                                                    <p className="text-sm text-slate-600 leading-relaxed">{ev.ai_summary}</p>
                                                </div>
                                            )}
                                            <div className="border border-slate-200/80 rounded-2xl overflow-hidden">
                                                <button className="w-full flex items-center justify-between px-5 py-3.5 bg-white hover:bg-slate-50/60 transition-colors" onClick={() => setShowTranscript(!showTranscript)}>
                                                    <div className="flex items-center gap-2"><span className="material-symbols-outlined text-primary text-[18px]">chat_bubble_outline</span><span className="text-xs font-black text-slate-800 uppercase tracking-widest">Interview Transcript</span></div>
                                                    <span className={`material-symbols-outlined text-slate-400 text-[18px] transition-transform duration-200 ${showTranscript ? 'rotate-180' : ''}`}>expand_more</span>
                                                </button>
                                                {showTranscript && (
                                                    <div className="border-t border-slate-100 p-3 bg-white">
                                                        {transcript?.full_transcript?.length > 0 ? (
                                                            <div className="max-h-64 overflow-y-auto space-y-3 p-2 custom-scrollbar">
                                                                {transcript.full_transcript.map((turn: any, i: number) => {
                                                                    const isAI = turn.role?.toLowerCase() === 'interviewer';
                                                                    return (
                                                                        <div key={i} className={`flex ${isAI ? 'justify-start' : 'justify-end'}`}>
                                                                            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs shadow-sm ${isAI ? 'bg-slate-50 text-slate-900 border border-slate-100 rounded-tl-none' : 'bg-primary text-white rounded-tr-none'}`}>
                                                                                <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${isAI ? 'text-primary' : 'text-white/60'}`}>{isAI ? 'AI Interviewer' : 'Candidate'}</p>
                                                                                <p className="font-medium leading-relaxed">{turn.text || turn.content}</p>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : <p className="text-xs text-slate-400 text-center py-8">Transcript unavailable</p>}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* Delete Confirmation Modal */}
            <DeleteConfirmModal
                candidate={deleteTarget}
                onConfirm={confirmDelete}
                onClose={() => !deleting && setDeleteTarget(null)}
                deleting={deleting}
            />
        </div>
    );
}