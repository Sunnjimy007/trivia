import { useCallback, useEffect, useState } from 'react';

// In dev: empty string → Vite proxies /api → localhost:3001
// In prod: VITE_SOCKET_URL=https://your-server.railway.app → full URL
const API = import.meta.env.VITE_SOCKET_URL || '';

// ── Types ─────────────────────────────────────────────────────────────────────
interface RoundSummary {
  id: string;
  name: string;
  emoji: string;
  description: string;
  questionCount: number;
  isCustom: boolean;
  enabled: boolean;
}

interface StoredQuestion {
  id: string;
  text: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
}

interface StoredRound {
  id: string;
  name: string;
  emoji: string;
  description: string;
  questions: StoredQuestion[];
  isCustom: boolean;
  enabled: boolean;
}

interface QuestionDraft {
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correct: 'A' | 'B' | 'C' | 'D';
}

interface RoundDraft {
  name: string;
  emoji: string;
  description: string;
  questions: QuestionDraft[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const emptyQuestion = (): QuestionDraft => ({
  text: '', optionA: '', optionB: '', optionC: '', optionD: '', correct: 'A',
});

const emptyRound = (): RoundDraft => ({
  name: '', emoji: '🎯', description: '', questions: [emptyQuestion()],
});

function slugify(name: string): string {
  return `custom-${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${Date.now()}`;
}

function storedToDraft(q: StoredQuestion): QuestionDraft {
  return {
    text: q.text,
    optionA: q.options.find((o) => o.id === 'A')?.text ?? '',
    optionB: q.options.find((o) => o.id === 'B')?.text ?? '',
    optionC: q.options.find((o) => o.id === 'C')?.text ?? '',
    optionD: q.options.find((o) => o.id === 'D')?.text ?? '',
    correct: q.correctOptionId as 'A' | 'B' | 'C' | 'D',
  };
}

function roundToDraft(r: StoredRound): RoundDraft {
  return {
    name: r.name,
    emoji: r.emoji,
    description: r.description,
    questions: r.questions.map(storedToDraft),
  };
}

function buildPayload(draft: RoundDraft, existingId?: string) {
  const id = existingId ?? slugify(draft.name);
  return {
    id,
    name: draft.name.trim(),
    emoji: draft.emoji.trim() || '🎯',
    description: draft.description.trim(),
    questions: draft.questions
      .filter((q) => q.text.trim() && q.optionA.trim() && q.optionB.trim() && q.optionC.trim() && q.optionD.trim())
      .map((q, qi) => ({
        id: `${id}-q${qi + 1}`,
        text: q.text.trim(),
        options: [
          { id: 'A', text: q.optionA.trim() },
          { id: 'B', text: q.optionB.trim() },
          { id: 'C', text: q.optionC.trim() },
          { id: 'D', text: q.optionD.trim() },
        ],
        correctOptionId: q.correct,
      })),
  };
}

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full
                  transition-colors duration-200 focus:outline-none
                  ${enabled ? 'bg-green-500' : 'bg-gray-600'}`}
      title={enabled ? 'Click to disable this round' : 'Click to enable this round'}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200
                    ${enabled ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  );
}

// ── Question form ─────────────────────────────────────────────────────────────
function QuestionForm({
  q, index, onChange, onRemove, canRemove,
}: {
  q: QuestionDraft;
  index: number;
  onChange: (updated: QuestionDraft) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const set = (field: keyof QuestionDraft, value: string) => onChange({ ...q, [field]: value });

  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-purple-300 font-bold text-sm uppercase tracking-wide">
          Question {index + 1}
        </span>
        {canRemove && (
          <button onClick={onRemove} className="text-red-400 hover:text-red-300 text-sm font-bold transition-colors">
            ✕ Remove
          </button>
        )}
      </div>

      <textarea
        value={q.text}
        onChange={(e) => set('text', e.target.value)}
        placeholder="Type your question here..."
        rows={2}
        className="w-full bg-gray-800 border border-gray-600 focus:border-purple-500 rounded-xl
                   px-3 py-2.5 text-white text-sm font-bold placeholder-gray-500
                   focus:outline-none transition-colors resize-none"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {(['A', 'B', 'C', 'D'] as const).map((letter) => {
          const field = `option${letter}` as keyof QuestionDraft;
          const isCorrect = q.correct === letter;
          return (
            <div key={letter} className="flex items-center gap-2">
              <button
                onClick={() => set('correct', letter)}
                title={`Mark ${letter} as correct answer`}
                className={`flex-shrink-0 w-8 h-8 rounded-lg font-display text-lg font-bold
                            transition-all border-2
                            ${isCorrect
                              ? 'bg-green-600 border-green-400 text-white'
                              : 'bg-gray-700 border-gray-600 text-gray-400 hover:border-gray-400'}`}
              >
                {letter}
              </button>
              <input
                type="text"
                value={q[field] as string}
                onChange={(e) => set(field, e.target.value)}
                placeholder={`Option ${letter}`}
                className={`flex-1 bg-gray-800 border rounded-xl px-3 py-2 text-white text-sm
                            font-bold placeholder-gray-500 focus:outline-none transition-colors
                            ${isCorrect ? 'border-green-600 focus:border-green-400' : 'border-gray-600 focus:border-purple-500'}`}
              />
            </div>
          );
        })}
      </div>
      <p className="text-gray-500 text-xs">Tap a letter to mark it as the correct answer (turns green).</p>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
type FormMode = 'add' | { kind: 'edit'; id: string } | { kind: 'duplicate'; sourceId: string };

export default function RoundsManager({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'list' | 'form'>('list');
  const [rounds, setRounds] = useState<RoundSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode>('add');
  const [draft, setDraft] = useState<RoundDraft>(emptyRound());
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const fetchRounds = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/rounds`);
      setRounds(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRounds(); }, [fetchRounds]);

  // ── Toggle enabled/disabled ──
  async function handleToggle(id: string) {
    setToggling(id);
    try {
      await fetch(`${API}/api/rounds/${id}/toggle`, { method: 'PATCH' });
      fetchRounds();
    } finally {
      setToggling(null);
    }
  }

  // ── Delete ──
  async function handleDelete(id: string) {
    if (!confirm('Delete this round? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await fetch(`${API}/api/rounds/${id}`, { method: 'DELETE' });
      fetchRounds();
    } finally {
      setDeleting(null);
    }
  }

  // ── Open editor ──
  async function openEdit(id: string) {
    const res = await fetch(`${API}/api/rounds/${id}`);
    const full: StoredRound = await res.json();
    setDraft(roundToDraft(full));
    setFormMode({ kind: 'edit', id });
    setMsg(null);
    setTab('form');
  }

  async function openDuplicate(id: string) {
    const res = await fetch(`${API}/api/rounds/${id}`);
    const full: StoredRound = await res.json();
    const d = roundToDraft(full);
    d.name = `${d.name} (Copy)`;
    setDraft(d);
    setFormMode({ kind: 'duplicate', sourceId: id });
    setMsg(null);
    setTab('form');
  }

  function openAdd() {
    setDraft(emptyRound());
    setFormMode('add');
    setMsg(null);
    setTab('form');
  }

  // ── Save ──
  async function handleSave() {
    if (!draft.name.trim()) { setMsg({ ok: false, text: 'Round name is required.' }); return; }
    const validQuestions = draft.questions.filter(
      (q) => q.text.trim() && q.optionA.trim() && q.optionB.trim() && q.optionC.trim() && q.optionD.trim()
    );
    if (validQuestions.length === 0) {
      setMsg({ ok: false, text: 'Add at least one complete question (all 4 options filled).' });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const isEdit = typeof formMode === 'object' && formMode.kind === 'edit';
      const payload = buildPayload({ ...draft, questions: validQuestions }, isEdit ? formMode.id : undefined);

      let res: Response;
      if (isEdit) {
        res = await fetch(`${API}/api/rounds/${formMode.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/rounds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (data.success) {
        setMsg({ ok: true, text: isEdit ? 'Round updated!' : `"${draft.name}" saved!` });
        fetchRounds();
        setTimeout(() => { setTab('list'); setMsg(null); }, 1400);
      } else {
        setMsg({ ok: false, text: data.error ?? 'Failed to save.' });
      }
    } catch {
      setMsg({ ok: false, text: 'Could not reach server.' });
    } finally {
      setSaving(false);
    }
  }

  // ── Question helpers ──
  function updateQ(i: number, updated: QuestionDraft) {
    setDraft((d) => { const qs = [...d.questions]; qs[i] = updated; return { ...d, questions: qs }; });
  }
  function addQ() { setDraft((d) => ({ ...d, questions: [...d.questions, emptyQuestion()] })); }
  function removeQ(i: number) { setDraft((d) => ({ ...d, questions: d.questions.filter((_, idx) => idx !== i) })); }

  const isEditing = typeof formMode === 'object' && formMode.kind === 'edit';
  const formTitle = isEditing ? 'Edit Round' : 'Add New Round';

  const inputCls = 'w-full bg-gray-800 border border-gray-600 focus:border-purple-500 rounded-xl ' +
                   'px-3 py-3 text-white font-bold placeholder-gray-500 focus:outline-none transition-colors text-sm';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3 sm:p-6">
      <div className="bg-gray-900 border border-gray-700 rounded-3xl w-full max-w-2xl
                      max-h-[92vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700 flex-shrink-0">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl text-white">Manage Rounds</h2>
            <p className="text-gray-400 text-xs mt-0.5">Toggle rounds on/off · Edit · Add new</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400
                       hover:text-white font-bold text-lg flex items-center justify-center transition-colors"
          >✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 flex-shrink-0">
          <button
            onClick={() => { setTab('list'); setMsg(null); }}
            className={`flex-1 py-3 font-bold text-sm transition-colors
                        ${tab === 'list' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            📋 All Rounds
          </button>
          <button
            onClick={openAdd}
            className={`flex-1 py-3 font-bold text-sm transition-colors
                        ${tab === 'form' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {isEditing ? '✏️ Editing' : '➕ Add New'}
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── List ── */}
          {tab === 'list' && (
            <div className="p-4 sm:p-5 flex flex-col gap-3">
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 font-bold animate-pulse">Loading rounds...</p>
                </div>
              ) : (
                rounds.map((r) => (
                  <div
                    key={r.id}
                    className={`rounded-2xl border transition-all
                                ${r.enabled
                                  ? r.isCustom ? 'bg-purple-500/10 border-purple-500/30' : 'bg-gray-800/60 border-gray-700'
                                  : 'bg-gray-900 border-gray-800 opacity-50'}`}
                  >
                    {/* Main row */}
                    <div className="flex items-center gap-3 p-3 sm:p-4">
                      <span className="text-2xl sm:text-3xl flex-shrink-0">{r.emoji}</span>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white font-bold text-sm sm:text-base">{r.name}</p>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                                           ${r.isCustom ? 'text-purple-300 bg-purple-500/20' : 'text-gray-400 bg-gray-700'}`}>
                            {r.isCustom ? 'Custom' : 'Built-in'}
                          </span>
                          {!r.enabled && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full text-red-400 bg-red-500/20">
                              Disabled
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 text-xs mt-0.5">{r.questionCount} questions</p>
                      </div>

                      {/* Toggle */}
                      <div className="flex-shrink-0" title={r.enabled ? 'Enabled — click to disable' : 'Disabled — click to enable'}>
                        {toggling === r.id
                          ? <div className="w-11 h-6 rounded-full bg-gray-600 animate-pulse" />
                          : <Toggle enabled={r.enabled} onChange={() => handleToggle(r.id)} />}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 px-3 sm:px-4 pb-3">
                      {r.isCustom ? (
                        <>
                          <button
                            onClick={() => openEdit(r.id)}
                            className="flex-1 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40
                                       text-indigo-300 font-bold text-xs py-2 rounded-xl transition-colors"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            disabled={deleting === r.id}
                            className="flex-1 bg-red-600/20 hover:bg-red-600/40 border border-red-500/40
                                       text-red-400 font-bold text-xs py-2 rounded-xl transition-colors
                                       disabled:opacity-40"
                          >
                            {deleting === r.id ? '...' : '🗑 Delete'}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => openDuplicate(r.id)}
                          className="flex-1 bg-gray-700/60 hover:bg-gray-700 border border-gray-600
                                     text-gray-300 font-bold text-xs py-2 rounded-xl transition-colors"
                        >
                          📋 Duplicate &amp; Edit
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}

              <button
                onClick={openAdd}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-2xl
                           text-sm border-b-2 border-purple-800 active:scale-95 transition-all mt-1"
              >
                ➕ Add New Round
              </button>
            </div>
          )}

          {/* ── Form ── */}
          {tab === 'form' && (
            <div className="p-4 sm:p-5 flex flex-col gap-5">
              <h3 className="text-white font-bold text-base">{formTitle}</h3>

              {/* Round details */}
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <div className="w-20 flex-shrink-0">
                    <label className="text-gray-400 text-xs font-bold block mb-1">Emoji</label>
                    <input
                      type="text"
                      value={draft.emoji}
                      onChange={(e) => setDraft((d) => ({ ...d, emoji: e.target.value }))}
                      maxLength={2}
                      className="w-full bg-gray-800 border border-gray-600 focus:border-purple-500
                                 rounded-xl px-3 py-3 text-white text-2xl text-center focus:outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-gray-400 text-xs font-bold block mb-1">Round Name *</label>
                    <input
                      type="text"
                      value={draft.name}
                      onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                      placeholder="e.g. Pop Culture, Science..."
                      className={inputCls}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-gray-400 text-xs font-bold block mb-1">Description</label>
                  <input
                    type="text"
                    value={draft.description}
                    onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                    placeholder="Short description shown on screen"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Questions */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-white font-bold text-sm uppercase tracking-wide">
                    Questions ({draft.questions.length})
                  </h4>
                </div>

                {draft.questions.map((q, i) => (
                  <QuestionForm
                    key={i}
                    q={q}
                    index={i}
                    onChange={(updated) => updateQ(i, updated)}
                    onRemove={() => removeQ(i)}
                    canRemove={draft.questions.length > 1}
                  />
                ))}

                <button
                  onClick={addQ}
                  className="border-2 border-dashed border-gray-600 hover:border-purple-500
                             text-gray-400 hover:text-purple-400 font-bold py-3 rounded-2xl
                             text-sm transition-colors"
                >
                  + Add Another Question
                </button>
              </div>

              {msg && (
                <div className={`rounded-2xl px-4 py-3 font-bold text-sm
                                 ${msg.ok ? 'bg-green-500/20 border border-green-500/40 text-green-300'
                                          : 'bg-red-500/20 border border-red-500/40 text-red-400'}`}>
                  {msg.text}
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white
                           font-bold text-base py-4 rounded-2xl border-b-4 border-emerald-800
                           active:border-b-0 active:scale-95 transition-all disabled:opacity-50"
              >
                {saving ? 'Saving...' : isEditing ? '💾 Update Round' : '💾 Save Round'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
