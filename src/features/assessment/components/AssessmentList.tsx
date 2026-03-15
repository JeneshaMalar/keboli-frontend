import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { AssessmentResponse } from '../types';
import Pagination from '../../../components/ui/Pagination';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';

interface AssessmentListProps {
  assessments: AssessmentResponse[];
  onEdit: (assessment: AssessmentResponse) => void;
  onToggleStatus: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
}


function parseJobDescription(jd: string): Array<{ heading?: string; items: string[] }> {
  if (!jd) return [];

  const lines = jd.split('\n').map((l) => l.trim()).filter(Boolean);
  const sections: Array<{ heading?: string; items: string[] }> = [];
  let current: { heading?: string; items: string[] } = { items: [] };

  const bulletRe = /^[-*•]\s+(.+)$/;
  const numberedRe = /^\d+[.)]\s+(.+)$/;

  for (const line of lines) {
    const isHeading =
      /^[A-Z][A-Z\s&/()-]{3,}:?$/.test(line) ||
      (line.endsWith(':') && line.length < 60 && !bulletRe.test(line));

    if (isHeading) {
      if (current.items.length > 0 || current.heading) {
        sections.push(current);
      }
      current = { heading: line.replace(/:$/, ''), items: [] };
      continue;
    }

    const bullet = bulletRe.exec(line) || numberedRe.exec(line);
    if (bullet) {
      current.items.push(bullet[1]);
    } else {
      current.items.push(line);
    }
  }

  if (current.items.length > 0 || current.heading) {
    sections.push(current);
  }

  return sections;
}

function colorFromString(str: string): { bg: string; text: string; border: string } {
  const palettes = [
    { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200/80' },
    { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200/80' },
    { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200/80' },
    { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200/80' },
    { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200/80' },
    { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200/80' },
    { bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-200/80' },
    { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200/80' },
  ];

  const hash = (str || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return palettes[hash % palettes.length];
}

function normalizeSkills(skillGraph: unknown): Array<Record<string, unknown>> {
  if (!skillGraph) return [];
  if (Array.isArray(skillGraph)) return skillGraph as Array<Record<string, unknown>>;

  const g = skillGraph as Record<string, unknown>;

  for (const key of ['skills', 'nodes', 'items', 'data']) {
    if (Array.isArray(g[key])) return g[key] as Array<Record<string, unknown>>;
  }

  const values = Object.values(g);
  if (values.every(Array.isArray)) {
    return (values as unknown[][]).flat() as Array<Record<string, unknown>>;
  }

  return [];
}

function getWeightPercent(skill: Record<string, unknown>): number {
  const raw = skill.weightage ?? skill.weight ?? skill.score ?? skill.percentage ?? 0;
  const n = Number(raw);
  if (isNaN(n)) return 0;
  return n <= 1 ? Math.round(n * 100) : Math.round(n);
}

function getSkillName(skill: Record<string, unknown>): string {
  return String(skill.name ?? skill.title ?? skill.skill ?? skill.label ?? 'Unnamed Skill');
}

function getSkillCategory(skill: Record<string, unknown>): string {
  return String(skill.category ?? skill.type ?? skill.group ?? '');
}

function getSkillDescription(skill: Record<string, unknown>): string {
  return String(skill.description ?? skill.desc ?? skill.notes ?? '');
}


function JobDescriptionViewer({ text }: { text: string }) {
  const sections = parseJobDescription(text);

  if (sections.length === 1 && !sections[0].heading) {
    return (
      <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-5 max-h-60 overflow-y-auto custom-scrollbar">
        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{text}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-72 overflow-y-auto custom-scrollbar pr-1">
      {sections.map((section, si) => (
        <div key={si} className="bg-slate-50/60 border border-slate-100 rounded-xl p-4">
          {section.heading && (
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1 h-4 rounded-full bg-primary shrink-0" />
              <h5 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-widest">
                {section.heading}
              </h5>
            </div>
          )}
          <ul className="space-y-1.5">
            {section.items.map((item, ii) => {
              const isBullet = section.items.length > 1 || section.heading;
              return isBullet ? (
                <li key={ii} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                  <span className="text-sm text-slate-600 leading-relaxed">{item}</span>
                </li>
              ) : (
                <p key={ii} className="text-sm text-slate-600 leading-relaxed">{item}</p>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function SkillGraphViewer({ skillGraph }: { skillGraph: unknown }) {
  const skills = normalizeSkills(skillGraph);

  if (skills.length === 0) {
    return (
      <div className="text-center py-8">
        <span className="material-symbols-outlined text-4xl text-slate-200 block mb-2">schema</span>
        <p className="text-sm text-slate-400 font-medium">No skills configured</p>
      </div>
    );
  }

  const grouped = skills.reduce<Record<string, Array<Record<string, unknown>>>>((acc, skill) => {
    const cat = getSkillCategory(skill) || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(skill);
    return acc;
  }, {});

  const hasGroups = Object.keys(grouped).length > 1 || !grouped['General'];

  return (
    <div className="space-y-4 max-h-80 overflow-y-auto custom-scrollbar pr-1">
      {Object.entries(grouped).map(([category, catSkills]) => {
        const colors = colorFromString(category);
        return (
          <div key={category}>
            {hasGroups && (
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${colors.bg} ${colors.text} ${colors.border}`}>
                  {category}
                </span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>
            )}

            <div className="space-y-2">
              {catSkills.map((skill, idx) => {
                const weight = getWeightPercent(skill);
                const name = getSkillName(skill);
                const desc = getSkillDescription(skill);
                const { text } = colorFromString(category);

                const knownKeys = new Set(['name', 'title', 'skill', 'label', 'category', 'type',
                  'group', 'weightage', 'weight', 'score', 'percentage', 'description', 'desc', 'notes']);
                const extraEntries = Object.entries(skill).filter(
                  ([k, v]) => !knownKeys.has(k) && v !== null && v !== undefined && typeof v !== 'object'
                );

                return (
                  <div
                    key={idx}
                    className="bg-white border border-slate-200/80 rounded-xl p-3.5 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-slate-900 leading-tight">{name}</span>
                        {extraEntries.map(([k, v]) => (
                          <span
                            key={k}
                            className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-semibold rounded-md uppercase tracking-wide"
                            title={k}
                          >
                            {String(v)}
                          </span>
                        ))}
                      </div>
                      {weight > 0 && (
                        <span className={`shrink-0 text-xs font-extrabold ${text}`}>{weight}%</span>
                      )}
                    </div>

                    {weight > 0 && (
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2.5">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${weight}%`,
                            background: `linear-gradient(90deg, var(--color-primary, #6366f1), #a5b4fc)`,
                          }}
                        />
                      </div>
                    )}

                    {desc && desc !== 'undefined' && (
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">{desc}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({ assessment, onConfirm, onClose, deleting }: {
  assessment: AssessmentResponse | null;
  onConfirm: () => void;
  onClose: () => void;
  deleting: boolean;
}) {
  if (!assessment) return null;

  const getDifficultyLabel = (level: string) => {
    switch (level) {
      case 'hard': return 'Expert';
      case 'medium': return 'Professional';
      default: return 'Elementary';
    }
  };

  return (
    <Modal isOpen={!!assessment} onClose={onClose} title="" size="sm">
      <div className="flex flex-col items-center text-center gap-4 py-2">

        {/* Icon */}
        <div className="size-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center">
          <span className="material-symbols-outlined text-rose-500 text-[28px]">delete_forever</span>
        </div>

        {/* Copy */}
        <div>
          <p className="text-base font-black text-slate-900 mb-1">Delete assessment?</p>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            <span className="font-bold text-slate-700">{assessment.title}</span> will be permanently
            removed. All associated invitations and sessions will be affected. This cannot be undone.
          </p>
        </div>

        {/* Assessment pill */}
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl w-full text-left">
          <div className="size-9 rounded-xl bg-gradient-to-br from-rose-100 to-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-rose-400 text-[18px]">quiz</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-800 truncate">{assessment.title}</p>
            {assessment.display_id && (
              <p className="text-[10px] font-mono text-slate-400 mt-0.5">{assessment.display_id}</p>
            )}
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              {assessment.duration_minutes}m · {assessment.passing_score}% pass · {getDifficultyLabel(assessment.difficulty_level)}
            </p>
          </div>
          <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-lg border ${assessment.is_active
              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
              : 'bg-slate-100 text-slate-400 border-slate-200'
            }`}>
            {assessment.is_active ? 'Active' : 'Draft'}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2.5 w-full">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={deleting}
            className="flex-1"
          >
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AssessmentList({
  assessments,
  onEdit,
  onToggleStatus,
  onDelete,
}: AssessmentListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentResponse | null>(null);
  const [isEditingSkillGraph, setIsEditingSkillGraph] = useState(false);
  const [editedSkillGraph, setEditedSkillGraph] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [activeTab, setActiveTab] = useState<'jd' | 'skills'>('jd');

  // ── Delete confirmation state ───────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<AssessmentResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  const itemsPerPage = 9;
  const totalPages = Math.ceil(assessments.length / itemsPerPage);

  const paginatedItems = assessments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleOpenDetails = (assessment: AssessmentResponse) => {
    setSelectedAssessment(assessment);
    setEditedSkillGraph(JSON.stringify(assessment.skill_graph, null, 2) || '');
    setIsEditingSkillGraph(false);
    setJsonError('');
    setActiveTab('jd');
  };

  const handleSaveSkillGraph = () => {
    if (!selectedAssessment) return;
    try {
      const parsedGraph = JSON.parse(editedSkillGraph);
      setJsonError('');
      onEdit({ ...selectedAssessment, skill_graph: parsedGraph });
      setSelectedAssessment({ ...selectedAssessment, skill_graph: parsedGraph });
      setIsEditingSkillGraph(false);
    } catch {
      setJsonError('Invalid JSON — please fix the syntax before saving.');
    }
  };

  // ── Delete handlers ─────────────────────────────────────────────────────────
  const handleDeleteClick = (assessment: AssessmentResponse) => {
    setDeleteTarget(assessment);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await onDelete(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const getDifficultyConfig = (level: string) => {
    switch (level) {
      case 'hard': return { label: 'Expert', color: 'bg-rose-50 text-rose-600 border-rose-200/80' };
      case 'medium': return { label: 'Professional', color: 'bg-amber-50 text-amber-600 border-amber-200/80' };
      default: return { label: 'Elementary', color: 'bg-emerald-50 text-emerald-600 border-emerald-200/80' };
    }
  };

  if (assessments.length === 0) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-20 text-center shadow-sm">
        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-slate-100">
          <span className="material-symbols-outlined text-slate-300 text-3xl">folder_off</span>
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">No assessments found</h3>
        <p className="text-slate-500 text-sm max-w-xs mx-auto font-medium">
          Try adjusting your filters or create a new assessment to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 flex flex-col">
      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {paginatedItems.map((assessment) => {
          const difficulty = getDifficultyConfig(assessment.difficulty_level);
          return (
            <div
              key={assessment.id}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:border-primary/20 transition-all duration-300 group flex flex-col"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-3 gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-primary transition-colors line-clamp-1 leading-snug">
                    {assessment.title}
                  </h3>
                  {assessment.display_id && (
                    <p className="text-[11px] font-mono text-slate-500 mt-1.5 uppercase tracking-wider bg-slate-50 inline-block px-1.5 py-0.5 rounded border border-slate-100">
                      {assessment.display_id}
                    </p>
                  )}
                </div>
                <span className={`flex-shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border ${difficulty.color}`}>
                  {difficulty.label}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-slate-500 line-clamp-2 mb-5 flex-grow leading-relaxed">
                {assessment.job_description}
              </p>

              {/* Stats Row */}
              <div className="flex items-center gap-5 mb-5 py-3.5 border-y border-slate-100">
                <div className="flex flex-col">
                  <span className="text-sm font-extrabold text-slate-900">{assessment.duration_minutes}m</span>
                  <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Duration</span>
                </div>
                <div className="w-px h-5 bg-slate-100" />
                <div className="flex flex-col">
                  <span className="text-sm font-extrabold text-slate-900">{assessment.passing_score}%</span>
                  <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Pass Score</span>
                </div>
                <div className="ml-auto">
                  <button
                    onClick={() => onToggleStatus(assessment.id, !assessment.is_active)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${assessment.is_active
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${assessment.is_active ? 'bg-white animate-pulse' : 'bg-slate-300'}`} />
                    {assessment.is_active ? 'Active' : 'Draft'}
                  </button>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenDetails(assessment)}
                    className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                    title="View Details"
                  >
                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                  </button>
                  <button
                    onClick={() => onEdit(assessment)}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                    title="Edit Assessment"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  {/* Opens confirmation modal instead of calling onDelete directly */}
                  <button
                    onClick={() => handleDeleteClick(assessment)}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                    title="Delete Assessment"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>

                <Link
                  to={`/candidates?assessment=${encodeURIComponent(assessment.title)}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-slate-800 transition-all shadow-sm active:scale-[0.97]"
                >
                  <span className="material-symbols-outlined text-[14px]">monitoring</span>
                  Performance
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={assessments.length}
          itemsPerPage={itemsPerPage}
        />
      </div>

      {/* Assessment Details Modal — unchanged */}
      <Modal
        isOpen={!!selectedAssessment}
        onClose={() => setSelectedAssessment(null)}
        title="Assessment Details"
        size="lg"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setSelectedAssessment(null)}>Close</Button>
            <Button variant="primary" onClick={() => { onEdit(selectedAssessment!); setSelectedAssessment(null); }}>
              Edit Assessment
            </Button>
          </div>
        }
      >
        {selectedAssessment && (
          <div className="space-y-5 py-2">
            <div>
              <h3 className="text-xl font-bold text-slate-900">{selectedAssessment.title}</h3>
              {selectedAssessment.display_id && (
                <p className="text-sm font-mono text-slate-500 mt-1">{selectedAssessment.display_id}</p>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Duration', value: `${selectedAssessment.duration_minutes}m` },
                { label: 'Pass Score', value: `${selectedAssessment.passing_score}%` },
                { label: 'Attempts', value: selectedAssessment.max_attempts },
                { label: 'Difficulty', value: selectedAssessment.difficulty_level, isBadge: true },
              ].map((stat) => (
                <div key={stat.label} className="p-4 bg-slate-50/80 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{stat.label}</p>
                  {stat.isBadge ? (
                    <Badge
                      variant={
                        selectedAssessment.difficulty_level === 'hard' ? 'error' :
                          selectedAssessment.difficulty_level === 'medium' ? 'warning' : 'success'
                      }
                      className="mt-0.5"
                    >
                      {String(stat.value)}
                    </Badge>
                  ) : (
                    <p className="text-lg font-extrabold text-slate-900">{String(stat.value)}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="border border-slate-200/80 rounded-2xl overflow-hidden">
              <div className="flex border-b border-slate-100 bg-slate-50/60">
                <button
                  onClick={() => setActiveTab('jd')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-[11px] font-bold uppercase tracking-wider transition-all ${activeTab === 'jd'
                      ? 'text-primary border-b-2 border-primary bg-white'
                      : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                  <span className="material-symbols-outlined text-[15px]">description</span>
                  Job Description
                </button>
                {selectedAssessment.skill_graph && (
                  <button
                    onClick={() => setActiveTab('skills')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-[11px] font-bold uppercase tracking-wider transition-all ${activeTab === 'skills'
                        ? 'text-primary border-b-2 border-primary bg-white'
                        : 'text-slate-400 hover:text-slate-600'
                      }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">schema</span>
                    Skill Graph
                    <span className="ml-1 px-1.5 py-0.5 bg-slate-200 text-slate-500 text-[9px] rounded-md font-bold">
                      {normalizeSkills(selectedAssessment.skill_graph).length}
                    </span>
                  </button>
                )}
              </div>

              <div className="p-4">
                {activeTab === 'jd' && (
                  <JobDescriptionViewer text={selectedAssessment.job_description} />
                )}

                {activeTab === 'skills' && selectedAssessment.skill_graph && (
                  <div>
                    <div className="flex items-center justify-end mb-3">
                      <button
                        onClick={() => {
                          setIsEditingSkillGraph(!isEditingSkillGraph);
                          setJsonError('');
                        }}
                        className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-500 hover:text-primary uppercase tracking-wider transition-colors"
                      >
                        <span className="material-symbols-outlined text-[13px]">
                          {isEditingSkillGraph ? 'close' : 'code'}
                        </span>
                        {isEditingSkillGraph ? 'Cancel' : 'Edit JSON'}
                      </button>
                    </div>

                    {isEditingSkillGraph ? (
                      <div className="space-y-3 animate-in fade-in duration-300">
                        <div className="relative">
                          <textarea
                            className={`w-full bg-slate-900 text-emerald-400 font-mono text-xs p-5 rounded-xl border min-h-[200px] outline-none focus:ring-2 focus:ring-primary/20 resize-none transition-all ${jsonError ? 'border-rose-500' : 'border-slate-700'
                              }`}
                            value={editedSkillGraph}
                            onChange={(e) => {
                              setEditedSkillGraph(e.target.value);
                              setJsonError('');
                            }}
                            spellCheck={false}
                          />
                          {jsonError && (
                            <div className="flex items-center gap-1.5 mt-2 text-rose-500 text-xs font-medium">
                              <span className="material-symbols-outlined text-[14px]">error</span>
                              {jsonError}
                            </div>
                          )}
                        </div>
                        <div className="flex justify-end">
                          <Button variant="primary" size="sm" onClick={handleSaveSkillGraph}>
                            Save Changes
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <SkillGraphViewer skillGraph={selectedAssessment.skill_graph} />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        assessment={deleteTarget}
        onConfirm={confirmDelete}
        onClose={() => !deleting && setDeleteTarget(null)}
        deleting={deleting}
      />
    </div>
  );
}