import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { AssessmentCreate, DifficultyLevel } from '../types';

interface AssessmentFormProps {
  initialData?: Partial<AssessmentCreate>;
  onSubmit: (data: AssessmentCreate, extra?: { file?: File | null; raw_text?: string | null }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

// ─── Toolbar icon button ──────────────────────────────────────────────────────
const Btn: React.FC<{
  title: string;
  active?: boolean;
  onAction: () => void;
  children: React.ReactNode;
}> = ({ title, active, onAction, children }) => (
  <button
    type="button"
    title={title}
    onMouseDown={(e) => { e.preventDefault(); onAction(); }}
    className={`w-7 h-7 rounded-md flex items-center justify-center transition-all select-none text-xs font-bold
      ${active
        ? 'bg-primary text-white shadow-sm'
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
      }`}
  >
    {children}
  </button>
);

const Divider = () => <span className="w-px h-4 bg-slate-200 mx-0.5 self-center shrink-0" />;

// ─── JD Rich Editor ───────────────────────────────────────────────────────────
const JDEditor: React.FC<{
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

  const setRef = useCallback((node: HTMLDivElement | null) => {
    (editorRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    if (node && !initialized.current) {
      node.innerHTML = value || '';
      // Only lock as initialized once real content is set,
      // so that async/late-arriving initialData can still populate the editor
      if (value) initialized.current = true;
    }
  }, [value]); // depend on value so it re-runs if content arrives late

  // Sync editor content when value changes externally (e.g. initialData loaded async)
  useEffect(() => {
    if (editorRef.current && value && !initialized.current) {
      editorRef.current.innerHTML = value;
      initialized.current = true;
    }
  }, [value]);

  const updateActiveFormats = () => {
    const formats = new Set<string>();
    if (document.queryCommandState('bold')) formats.add('bold');
    if (document.queryCommandState('italic')) formats.add('italic');
    if (document.queryCommandState('underline')) formats.add('underline');
    if (document.queryCommandState('strikeThrough')) formats.add('strikeThrough');
    if (document.queryCommandState('insertUnorderedList')) formats.add('ul');
    if (document.queryCommandState('insertOrderedList')) formats.add('ol');
    setActiveFormats(formats);
  };

  const exec = (command: string, val?: string) => {
    document.execCommand(command, false, val ?? undefined);
    editorRef.current?.focus();
    if (editorRef.current) onChange(editorRef.current.innerHTML);
    updateActiveFormats();
  };

  const handleInput = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  // Paste as plain text to avoid bringing in external HTML junk
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  return (
    <div className="bg-slate-50/80 border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/15 focus-within:border-primary/50 transition-all">

      {/* ── Editable content area (top) ── */}
      <div
        ref={setRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyUp={updateActiveFormats}
        onMouseUp={updateActiveFormats}
        data-placeholder={placeholder}
        className="min-h-[148px] max-h-[280px] overflow-y-auto px-4 py-3.5 text-slate-900 text-sm focus:outline-none jd-editor"
        style={{ lineHeight: '1.75' }}
      />

      {/* ── Formatting toolbar pinned at the bottom ── */}
      <div className="flex flex-wrap items-center gap-0.5 px-2.5 py-2 border-t border-slate-200 bg-white/80">

        {/* Bold / Italic / Underline / Strike */}
        <Btn title="Bold (Ctrl+B)" active={activeFormats.has('bold')} onAction={() => exec('bold')}>
          <span className="font-black">B</span>
        </Btn>
        <Btn title="Italic (Ctrl+I)" active={activeFormats.has('italic')} onAction={() => exec('italic')}>
          <span className="italic">I</span>
        </Btn>
        <Btn title="Underline (Ctrl+U)" active={activeFormats.has('underline')} onAction={() => exec('underline')}>
          <span className="underline">U</span>
        </Btn>
        <Btn title="Strikethrough" active={activeFormats.has('strikeThrough')} onAction={() => exec('strikeThrough')}>
          <span className="line-through">S</span>
        </Btn>

        <Divider />

        {/* Heading / Paragraph */}
        <Btn title="Heading" onAction={() => exec('formatBlock', 'H3')}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M1.5 2v9M1.5 6.5h6M7.5 2v9M10 4.5l2 2-2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Btn>
        <Btn title="Paragraph" onAction={() => exec('formatBlock', 'P')}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M5.5 2h5.5M5.5 5.5h5.5M2 11h9M2 2h2a2 2 0 010 4H2V2z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Btn>

        <Divider />

        {/* Bullet / Numbered list */}
        <Btn title="Bullet list" active={activeFormats.has('ul')} onAction={() => exec('insertUnorderedList')}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <circle cx="2" cy="3.5" r="1.2" fill="currentColor" />
            <rect x="5" y="2.75" width="7" height="1.5" rx="0.75" fill="currentColor" />
            <circle cx="2" cy="9.5" r="1.2" fill="currentColor" />
            <rect x="5" y="8.75" width="7" height="1.5" rx="0.75" fill="currentColor" />
          </svg>
        </Btn>
        <Btn title="Numbered list" active={activeFormats.has('ol')} onAction={() => exec('insertOrderedList')}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <text x="0.5" y="5.5" fontSize="5" fill="currentColor" fontFamily="monospace" fontWeight="700">1.</text>
            <rect x="5" y="2.75" width="7" height="1.5" rx="0.75" fill="currentColor" />
            <text x="0.5" y="11" fontSize="5" fill="currentColor" fontFamily="monospace" fontWeight="700">2.</text>
            <rect x="5" y="8.75" width="7" height="1.5" rx="0.75" fill="currentColor" />
          </svg>
        </Btn>

        <Divider />

        {/* Indent / Outdent */}
        <Btn title="Indent" onAction={() => exec('indent')}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M1 2h11M5 6.5h7M1 11h11M1 4.5l2.5 2-2.5 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Btn>
        <Btn title="Outdent" onAction={() => exec('outdent')}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M1 2h11M5 6.5h7M1 11h11M4.5 4.5L2 6.5l2.5 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Btn>

        <Divider />

        {/* Text color */}
        <label
          title="Text color"
          className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer transition-all relative"
        >
          <span className="font-black text-xs leading-none select-none">A</span>
          <input
            type="color"
            defaultValue="#6366f1"
            className="absolute opacity-0 w-0 h-0 pointer-events-none"
            onInput={(e) => exec('foreColor', (e.target as HTMLInputElement).value)}
          />
        </label>

        <Divider />

        {/* Clear formatting */}
        <Btn title="Clear formatting" onAction={() => exec('removeFormat')}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M2 2l9 9M11 2L2 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </Btn>

        {/* Right-side hint */}
        <span className="ml-auto text-[10px] text-slate-300 font-medium pr-1 hidden sm:block select-none">
          Select text to format
        </span>
      </div>

      {/* Editor content styles */}
      <style>{`
        .jd-editor:empty:before {
          content: attr(data-placeholder);
          color: #94a3b8;
          pointer-events: none;
          display: block;
        }
        .jd-editor h2 { font-size: 1.05em; font-weight: 700; margin: 0.5em 0 0.2em; }
        .jd-editor h3 { font-size: 1em; font-weight: 600; margin: 0.4em 0 0.15em; }
        .jd-editor ul { list-style: disc; padding-left: 1.4em; margin: 0.25em 0; }
        .jd-editor ol { list-style: decimal; padding-left: 1.4em; margin: 0.25em 0; }
        .jd-editor li { margin: 0.1em 0; }
        .jd-editor b, .jd-editor strong { font-weight: 700; }
        .jd-editor i, .jd-editor em { font-style: italic; }
        .jd-editor u { text-decoration: underline; }
        .jd-editor s { text-decoration: line-through; }
      `}</style>
    </div>
  );
};

// ─── Main Form ────────────────────────────────────────────────────────────────
const AssessmentForm: React.FC<AssessmentFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
}) => {
  const [jdMode, setJdMode] = useState<'text' | 'file'>('text');
  const [jdFile, setJdFile] = useState<File | null>(null);

  // FIX: Initialize richHtml from initialData so existing JD loads in edit mode
  const [richHtml, setRichHtml] = useState<string>(initialData?.job_description || '');

  const [formData, setFormData] = useState<AssessmentCreate>({
    title: initialData?.title || '',
    job_description: initialData?.job_description || '',
    duration_minutes: initialData?.duration_minutes || 30,
    passing_score: initialData?.passing_score || 60,
    difficulty_level: (initialData?.difficulty_level || 'medium') as DifficultyLevel,
    max_attempts: initialData?.max_attempts || 1,
    is_active: initialData?.is_active ?? true,
    skill_graph: initialData?.skill_graph,
  });

  // FIX: Sync richHtml if initialData arrives asynchronously after first render
  useEffect(() => {
    if (initialData?.job_description) {
      setRichHtml(initialData.job_description);
    }
  }, [initialData?.job_description]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (jdMode === 'file') {
      onSubmit(formData, { file: jdFile, raw_text: null });
    } else {
      const rawText = richHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      onSubmit({ ...formData, job_description: richHtml }, { file: null, raw_text: rawText });
    }
  };

  const inputClass =
    'w-full bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/50 transition-all placeholder:text-slate-400';
  const labelClass =
    'block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 ml-0.5';
  const tabClass = (active: boolean) =>
    `flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${active
      ? 'bg-primary text-white shadow-md shadow-primary/20'
      : 'bg-slate-50 text-slate-400 border border-slate-200 hover:border-slate-300'
    }`;

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-slate-200/80 p-8 md:p-10 rounded-2xl shadow-sm relative overflow-hidden animate-in zoom-in-[0.98] duration-400"
    >
      {/* Decorative top accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-indigo-500 to-violet-500" />

      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-xl">
            {initialData ? 'edit_note' : 'add_circle'}
          </span>
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            {initialData ? 'Update Assessment' : 'Create Assessment'}
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Fill in the details below to configure your assessment
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Title */}
        <div>
          <label className={labelClass}>Assessment Title</label>
          <input
            type="text"
            name="title"
            placeholder="e.g. Senior Fullstack Engineer Phase 1"
            value={formData.title}
            onChange={handleChange}
            required
            className={inputClass}
          />
        </div>

        {/* Job Description */}
        <div>
          <label className={labelClass}>Job Description</label>

          {/* Tabs: Paste Text | Upload Document */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => { setJdMode('text'); setJdFile(null); }}
              className={tabClass(jdMode === 'text')}
            >
              Paste Text
            </button>
            <button
              type="button"
              onClick={() => setJdMode('file')}
              className={tabClass(jdMode === 'file')}
            >
              Upload Document
            </button>
          </div>

          {/* Paste Text tab → single box with toolbar at the bottom */}
          {jdMode === 'text' && (
            <>
              <JDEditor
                value={richHtml}
                onChange={setRichHtml}
                placeholder="Paste the Job Description here. Our AI will analyze it to generate relevant technical questions."
              />
              {/* Hidden required guard */}
              <input
                type="text"
                required
                value={richHtml.replace(/<[^>]+>/g, '').trim()}
                onChange={() => { }}
                className="opacity-0 h-0 w-0 absolute pointer-events-none"
                tabIndex={-1}
              />
            </>
          )}

          {/* Upload Document tab */}
          {jdMode === 'file' && (
            <div className="relative group">
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                required={!initialData}
                onChange={(e) => setJdFile(e.target.files?.[0] ?? null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="bg-slate-50/80 border-2 border-dashed border-slate-200 rounded-xl p-10 text-center group-hover:border-primary/40 transition-all">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mx-auto mb-4 border border-slate-100">
                  <span className="material-symbols-outlined text-slate-400 text-2xl">cloud_upload</span>
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  {jdFile ? jdFile.name : 'Drop your file here or click to browse'}
                </p>
                <p className="text-xs mt-2 text-slate-400 font-medium">PDF, DOCX, or TXT (Max 5MB)</p>
              </div>
            </div>
          )}
        </div>

        {/* Duration & Pass Score */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Duration</label>
            <div className="relative">
              <input
                type="number"
                name="duration_minutes"
                value={formData.duration_minutes}
                onChange={handleChange}
                min="1"
                max="300"
                className={inputClass}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                mins
              </span>
            </div>
          </div>
          <div>
            <label className={labelClass}>Pass Score</label>
            <div className="relative">
              <input
                type="number"
                name="passing_score"
                value={formData.passing_score}
                onChange={handleChange}
                min="0"
                max="100"
                className={inputClass}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                %
              </span>
            </div>
          </div>
        </div>

        {/* Difficulty & Max Attempts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Difficulty Level</label>
            <select
              name="difficulty_level"
              value={formData.difficulty_level}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="easy">Elementary</option>
              <option value="medium">Professional</option>
              <option value="hard">Expert</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Max Attempts</label>
            <div className="relative">
              <input
                type="number"
                name="max_attempts"
                value={formData.max_attempts}
                onChange={handleChange}
                min="1"
                max="5"
                className={inputClass}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                attempts
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col md:flex-row justify-end gap-3 mt-10 pt-6 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-600 text-sm font-semibold transition-all border border-slate-200 hover:border-slate-300"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-8 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : initialData ? 'Update Assessment' : 'Create Assessment'}
        </button>
      </div>
    </form>
  );
};

export default AssessmentForm;