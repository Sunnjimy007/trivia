import { useCallback, useEffect, useState } from 'react';

// In dev: empty string → Vite proxies /api → localhost:3001
// In prod: VITE_SOCKET_URL=https://your-server.railway.app → full URL
const API = import.meta.env.VITE_SOCKET_URL || '';

// Admin password (server env ADMIN_PASSWORD). Kept for this tab only, never in localStorage.
const PW_KEY = 'trivia-admin-password';
function getStoredPassword(): string {
  try { return sessionStorage.getItem(PW_KEY) ?? ''; } catch { return ''; }
}
function storePassword(pw: string) {
  try { sessionStorage.setItem(PW_KEY, pw); } catch { /* storage unavailable */ }
}
function clearStoredPassword() {
  try { sessionStorage.removeItem(PW_KEY); } catch { /* storage unavailable */ }
}

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
// The picture of a switch, for use inside something that is already a button.
function SwitchKnob({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full
                  transition-colors duration-200 ${on ? 'bg-ans-d' : 'bg-ink-4'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200
                    ${on ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </span>
  );
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={enabled}
      className="focus:outline-none"
      title={enabled ? 'Click to disable this round' : 'Click to enable this round'}
    >
      <SwitchKnob on={enabled} />
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
    <div className="bg-ink-3/60 border border-ink-4 rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sun font-bold text-sm uppercase tracking-wide">
          Question {index + 1}
        </span>
        {canRemove && (
          <button onClick={onRemove} className="text-rose-300 hover:text-rose-200 text-sm font-bold transition-colors">
            ✕ Remove
          </button>
        )}
      </div>

      <textarea
        value={q.text}
        onChange={(e) => set('text', e.target.value)}
        placeholder="Type your question here..."
        rows={2}
        className="w-full bg-ink-3 border border-ink-4 focus:border-sun rounded-xl
                   px-3 py-2.5 text-chalk text-base font-bold placeholder-soft/50
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
                className={`flex-shrink-0 w-11 h-11 rounded-lg font-display text-lg font-bold
                            transition-all border-2
                            ${isCorrect
                              ? 'bg-ans-d border-ans-d-d text-ink'
                              : 'bg-ink-4 border-ink-4 text-soft hover:border-soft'}`}
              >
                {letter}
              </button>
              <input
                type="text"
                value={q[field] as string}
                onChange={(e) => set(field, e.target.value)}
                placeholder={`Option ${letter}`}
                className={`flex-1 bg-ink-3 border rounded-xl px-3 py-2 text-chalk text-base
                            font-bold placeholder-soft/50 focus:outline-none transition-colors
                            ${isCorrect ? 'border-green-600 focus:border-green-400' : 'border-ink-4 focus:border-sun'}`}
              />
            </div>
          );
        })}
      </div>
      <p className="text-soft/70 text-xs">Tap a letter to mark it as the correct answer (turns green).</p>
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
  const [pwPrompt, setPwPrompt] = useState<{ resolve: (pw: string | null) => void; wrong: boolean } | null>(null);
  const [pwInput, setPwInput] = useState('');
  // Scoring: do faster right answers earn more? null until the server has told us.
  const [speedScoring, setSpeedScoring] = useState<boolean | null>(null);
  const [savingSpeed, setSavingSpeed] = useState(false);

  // Shows the password box (a real password field, since the host screen may be on a TV).
  const askPassword = useCallback((wrong: boolean) => new Promise<string | null>((resolve) => {
    setPwInput('');
    setPwPrompt({ resolve, wrong });
  }), []);

  function answerPassword(pw: string | null) {
    pwPrompt?.resolve(pw);
    setPwPrompt(null);
  }

  // fetch() that sends the admin password. On a 401 it asks for the password and retries.
  const adminFetch = useCallback(async (url: string, init: RequestInit = {}): Promise<Response> => {
    const send = (pw: string) => fetch(url, {
      ...init,
      headers: { ...(init.headers as Record<string, string> | undefined), ...(pw ? { 'x-admin-password': pw } : {}) },
    });
    let res = await send(getStoredPassword());
    for (let attempt = 0; res.status === 401 && attempt < 3; attempt++) {
      const pw = await askPassword(attempt > 0 || !!getStoredPassword());
      if (pw === null) return res;
      storePassword(pw);
      res = await send(pw);
    }
    if (res.status === 401) clearStoredPassword();
    return res;
  }, [askPassword]);

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

  useEffect(() => {
    fetch(`${API}/api/settings`)
      .then((res) => res.json())
      .then((s: { speedScoring?: boolean }) => setSpeedScoring(s.speedScoring !== false))
      .catch(() => setSpeedScoring(null));
  }, []);

  // ── "Turn off the speed factor" ──
  async function handleSpeedToggle() {
    if (speedScoring === null || savingSpeed) return;
    setSavingSpeed(true);
    setMsg(null);
    try {
      const res = await adminFetch(`${API}/api/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speedScoring: !speedScoring }),
      });
      if (res.ok) {
        const s = await res.json();
        setSpeedScoring(s.speedScoring !== false);
      } else {
        setMsg({ ok: false, text: 'Could not change the scoring (wrong password?).' });
      }
    } catch {
      setMsg({ ok: false, text: 'Could not reach server.' });
    } finally {
      setSavingSpeed(false);
    }
  }

  // ── Toggle enabled/disabled ──
  async function handleToggle(id: string) {
    setToggling(id);
    setMsg(null);
    try {
      const res = await adminFetch(`${API}/api/rounds/${id}/toggle`, { method: 'PATCH' });
      if (!res.ok) setMsg({ ok: false, text: 'Could not change that round (wrong password?).' });
      fetchRounds();
    } catch {
      setMsg({ ok: false, text: 'Could not reach server.' });
    } finally {
      setToggling(null);
    }
  }

  // ── Delete ──
  async function handleDelete(id: string) {
    if (!confirm('Delete this round? This cannot be undone.')) return;
    setDeleting(id);
    setMsg(null);
    try {
      const res = await adminFetch(`${API}/api/rounds/${id}`, { method: 'DELETE' });
      if (!res.ok) setMsg({ ok: false, text: 'Could not delete that round (wrong password?).' });
      fetchRounds();
    } catch {
      setMsg({ ok: false, text: 'Could not reach server.' });
    } finally {
      setDeleting(null);
    }
  }

  // Full round data (including correct answers) needs the admin password.
  async function loadFullRound(id: string): Promise<StoredRound | null> {
    try {
      const res = await adminFetch(`${API}/api/rounds/${id}`);
      if (!res.ok) {
        setMsg({ ok: false, text: 'Could not open that round (wrong password?).' });
        return null;
      }
      return await res.json();
    } catch {
      setMsg({ ok: false, text: 'Could not reach server.' });
      return null;
    }
  }

  // ── Open editor ──
  async function openEdit(id: string) {
    setMsg(null);
    const full = await loadFullRound(id);
    if (!full) return;
    setDraft(roundToDraft(full));
    setFormMode({ kind: 'edit', id });
    setMsg(null);
    setTab('form');
  }

  async function openDuplicate(id: string) {
    setMsg(null);
    const full = await loadFullRound(id);
    if (!full) return;
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
        res = await adminFetch(`${API}/api/rounds/${formMode.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await adminFetch(`${API}/api/rounds`, {
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

  const inputCls = 'w-full bg-ink-3 border border-ink-4 focus:border-sun rounded-xl ' +
                   'px-3 py-3 text-chalk font-bold placeholder-soft/50 focus:outline-none transition-colors text-base';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rounds-title"
    >
      <div className="bg-ink-2 border border-ink-4 rounded-3xl w-full max-w-2xl
                      max-h-[92vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-4 flex-shrink-0">
          <div>
            <h2 id="rounds-title" className="font-display text-2xl sm:text-3xl text-chalk">Manage Rounds</h2>
            <p className="text-soft text-xs mt-0.5">Toggle rounds on/off · Edit · Add new</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-ink-3 hover:bg-ink-4 text-soft
                       hover:text-chalk font-bold text-lg flex items-center justify-center transition-colors"
          >✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-ink-4 flex-shrink-0">
          <button
            onClick={() => { setTab('list'); setMsg(null); }}
            className={`flex-1 py-3 font-bold text-sm transition-colors
                        ${tab === 'list' ? 'text-sun border-b-2 border-sun' : 'text-soft/70 hover:text-soft'}`}
          >
            📋 All Rounds
          </button>
          <button
            onClick={openAdd}
            className={`flex-1 py-3 font-bold text-sm transition-colors
                        ${tab === 'form' ? 'text-sun border-b-2 border-sun' : 'text-soft/70 hover:text-soft'}`}
          >
            {isEditing ? '✏️ Editing' : '➕ Add New'}
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── List ── */}
          {tab === 'list' && (
            <div className="p-4 sm:p-5 flex flex-col gap-3">
              {msg && !msg.ok && (
                <div className="rounded-2xl px-4 py-3 font-bold text-sm bg-ans-a/20 border border-ans-a/50 text-rose-300">
                  {msg.text}
                </div>
              )}

              {/* Scoring: the speed factor can be switched off so every right answer scores the same. */}
              {speedScoring !== null && (
                <button
                  onClick={handleSpeedToggle}
                  disabled={savingSpeed}
                  role="switch"
                  aria-checked={!speedScoring}
                  className={`w-full flex items-center gap-3 text-left rounded-2xl border p-3 sm:p-4 min-h-[64px]
                              transition-colors disabled:opacity-60
                              ${speedScoring ? 'bg-ink-3/60 border-ink-4' : 'bg-ans-d/15 border-ans-d/60'}`}
                >
                  <span className="text-2xl sm:text-3xl flex-shrink-0" aria-hidden="true">⚖️</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-chalk font-bold text-sm sm:text-base">Turn off the speed factor</span>
                    <span className="block text-soft text-xs mt-0.5">
                      {speedScoring
                        ? 'Right now, faster right answers earn more points. Switch on to make every right answer worth the same.'
                        : 'On: every right answer scores 500 points, however fast. Fairer for younger players. Applies to games that have not started yet.'}
                    </span>
                  </span>
                  {savingSpeed
                    ? <span className="w-11 h-6 rounded-full bg-ink-4 animate-pulse flex-shrink-0" />
                    : <SwitchKnob on={!speedScoring} />}
                </button>
              )}

              {loading ? (
                <div className="text-center py-12">
                  <p className="text-soft font-bold animate-pulse">Loading rounds...</p>
                </div>
              ) : (
                rounds.map((r) => (
                  <div
                    key={r.id}
                    className={`rounded-2xl border transition-all
                                ${r.enabled
                                  ? r.isCustom ? 'bg-sun/10 border-sun/40' : 'bg-ink-3/60 border-ink-4'
                                  : 'bg-ink-2 border-ink-4 opacity-50'}`}
                  >
                    {/* Main row */}
                    <div className="flex items-center gap-3 p-3 sm:p-4">
                      <span className="text-2xl sm:text-3xl flex-shrink-0">{r.emoji}</span>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-chalk font-bold text-sm sm:text-base">{r.name}</p>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                                           ${r.isCustom ? 'text-sun bg-sun/20' : 'text-soft bg-ink-4'}`}>
                            {r.isCustom ? 'Custom' : 'Built-in'}
                          </span>
                          {!r.enabled && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full text-rose-300 bg-ans-a/20">
                              Disabled
                            </span>
                          )}
                        </div>
                        <p className="text-soft text-xs mt-0.5">{r.questionCount} questions</p>
                      </div>

                      {/* Toggle */}
                      <div className="flex-shrink-0" title={r.enabled ? 'Enabled — click to disable' : 'Disabled — click to enable'}>
                        {toggling === r.id
                          ? <div className="w-11 h-6 rounded-full bg-ink-4 animate-pulse" />
                          : <Toggle enabled={r.enabled} onChange={() => handleToggle(r.id)} />}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 px-3 sm:px-4 pb-3">
                      {r.isCustom ? (
                        <>
                          <button
                            onClick={() => openEdit(r.id)}
                            className="flex-1 bg-white/10 hover:bg-white/20 border border-ink-4
                                       text-chalk font-extrabold text-xs py-2 rounded-xl transition-colors"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            disabled={deleting === r.id}
                            className="flex-1 bg-ans-a/15 hover:bg-ans-a/35 border border-ans-a/50
                                       text-rose-300 font-bold text-xs py-2 rounded-xl transition-colors
                                       disabled:opacity-40"
                          >
                            {deleting === r.id ? '...' : '🗑 Delete'}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => openDuplicate(r.id)}
                          className="flex-1 bg-ink-4/60 hover:bg-ink-4 border border-ink-4
                                     text-soft font-bold text-xs py-2 rounded-xl transition-colors"
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
                className="bg-sun hover:bg-sun-soft text-ink font-extrabold rounded-full border-[3px] border-sun border-b-[6px] border-b-sun-dark active:translate-y-0.5 transition-all py-3 text-sm mt-1"
              >
                ➕ Add New Round
              </button>
            </div>
          )}

          {/* ── Form ── */}
          {tab === 'form' && (
            <div className="p-4 sm:p-5 flex flex-col gap-5">
              <h3 className="text-chalk font-bold text-base">{formTitle}</h3>

              {/* Round details */}
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <div className="w-20 flex-shrink-0">
                    <label className="text-soft text-xs font-bold block mb-1">Emoji</label>
                    <input
                      type="text"
                      value={draft.emoji}
                      onChange={(e) => setDraft((d) => ({ ...d, emoji: e.target.value }))}
                      maxLength={2}
                      className="w-full bg-ink-3 border border-ink-4 focus:border-sun
                                 rounded-xl px-3 py-3 text-chalk text-2xl text-center focus:outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-soft text-xs font-bold block mb-1">Round Name *</label>
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
                  <label className="text-soft text-xs font-bold block mb-1">Description</label>
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
                  <h4 className="text-chalk font-bold text-sm uppercase tracking-wide">
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
                  className="border-2 border-dashed border-ink-4 hover:border-sun
                             text-soft hover:text-sun font-bold py-3 rounded-2xl
                             text-sm transition-colors"
                >
                  + Add Another Question
                </button>
              </div>

              {msg && (
                <div className={`rounded-2xl px-4 py-3 font-bold text-sm
                                 ${msg.ok ? 'bg-green-500/20 border border-green-500/40 text-green-300'
                                          : 'bg-ans-a/20 border border-ans-a/50 text-rose-300'}`}>
                  {msg.text}
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-sun hover:bg-sun-soft text-ink font-extrabold rounded-full border-[3px] border-sun border-b-[6px] border-b-sun-dark active:translate-y-0.5 transition-all text-base py-4 disabled:opacity-50"
              >
                {saving ? 'Saving...' : isEditing ? '💾 Update Round' : '💾 Save Round'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Admin password prompt */}
      {pwPrompt && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
          <form
            onSubmit={(e) => { e.preventDefault(); answerPassword(pwInput); }}
            className="bg-ink-2 border border-ink-4 rounded-3xl p-6 w-full max-w-sm flex flex-col gap-4"
          >
            <h3 className="font-display text-2xl text-chalk">Admin password</h3>
            <p className="text-soft text-sm">Enter the admin password to manage rounds.</p>
            <input
              type="password"
              value={pwInput}
              onChange={(e) => setPwInput(e.target.value)}
              autoFocus
              autoComplete="current-password"
              className={inputCls}
              placeholder="Password"
            />
            {pwPrompt.wrong && (
              <p className="text-rose-300 font-bold text-sm">That password didn't work. Try again.</p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => answerPassword(null)}
                className="flex-1 bg-ink-3 hover:bg-ink-4 text-soft font-bold py-3 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-sun hover:bg-sun-soft text-ink font-extrabold rounded-full border-[3px] border-sun border-b-[6px] border-b-sun-dark active:translate-y-0.5 transition-all py-3"
              >
                Unlock
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
