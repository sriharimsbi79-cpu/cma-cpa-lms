import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, Check, ChevronLeft, Circle, Plus, Search, Trash2 } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { ChipGroup, EmptyState, Field, Modal, NOT_CONNECTED, Pill, SampleNotice, Switch } from '@/components/ui';
import { adminMocks, bankCounts, blankMock, courseOptions, type AdminMock } from '@/data/adminDemo';
import { questions as bankQuestions } from '@/data/demo';
import { cx, durationLabel } from '@/lib/format';
import { STATUS_LABEL, statusTone } from './MockTests';
import { TYPE_LABEL } from '@/pages/student/Exam';

const TYPES = [
  { key: 'mcq', label: 'Multiple choice (MCQ)' },
  { key: 'tbs', label: 'Task-based simulations (TBS)' },
  { key: 'cbq', label: 'Case-based questions (CBQ)' },
] as const;

export default function MockBuilder() {
  const { testId = 'new' } = useParams();
  const toast = useToast();
  const courses = useMemo(() => courseOptions(), []);
  const bank = useMemo(() => bankQuestions(), []);
  const isNew = testId === 'new';
  const [t, setT] = useState<AdminMock>(() => adminMocks().find((x) => x.id === testId) ?? blankMock('cma-part-1'));
  const [picker, setPicker] = useState(false);
  const [pickSearch, setPickSearch] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const set = (patch: Partial<AdminMock>) => setT((x) => ({ ...x, ...patch }));
  const course = courses.find((c) => c.id === t.courseId);
  const available = bankCounts(t.courseId);
  const selected = t.questionIds.map((id) => bank.find((q) => q.id === id)).filter((q): q is NonNullable<typeof q> => !!q);
  const total = t.selection === 'random' ? t.counts.mcq + t.counts.tbs + t.counts.cbq : selected.length;

  const problems = [
    !t.title.trim() && 'Add a title',
    total === 0 && 'Add at least one question',
    !(t.durationMinutes > 0) && 'Set the time limit',
    t.selection === 'random' && TYPES.some((ty) => t.counts[ty.key] > available[ty.key]) && 'Some counts are more than the bank has',
  ].filter(Boolean) as string[];

  const save = (publish: boolean) => {
    if (publish && problems.length) {
      toast.show(`Before publishing: ${problems.join(', ').toLowerCase()}.`, 'error');
      return;
    }
    toast.show(NOT_CONNECTED, 'info');
  };

  const move = (i: number, d: -1 | 1) => {
    const ids = [...t.questionIds];
    const j = i + d;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    set({ questionIds: ids });
  };

  const pickList = bank.filter((q) => !pickSearch.trim() || `${q.code} ${q.stem}`.toLowerCase().includes(pickSearch.trim().toLowerCase()));
  const toggleChapter = (id: string) => set({ chapterIds: t.chapterIds.includes(id) ? t.chapterIds.filter((x) => x !== id) : [...t.chapterIds, id] });

  const actions = (
    <>
      <button type="button" className="btn-secondary" onClick={() => save(false)}>
        Save draft
      </button>
      <button type="button" className="btn-primary" onClick={() => save(true)}>
        Publish
      </button>
    </>
  );

  return (
    <div className="flex flex-col gap-5 pb-20 lg:pb-0">
      <Link to="/admin/mock-tests" className="inline-flex h-11 items-center gap-1 self-start text-sm font-bold text-ink-2">
        <ChevronLeft aria-hidden className="size-[18px]" />
        Mock tests
      </Link>
      <header className="-mt-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[26px] font-extrabold leading-tight tracking-tight lg:text-[28px]">{isNew ? 'New mock test' : t.title || 'Mock test'}</h1>
          <Pill tone={statusTone(t.status)}>{STATUS_LABEL[t.status]}</Pill>
        </div>
        <div className="hidden gap-2.5 lg:flex">{actions}</div>
      </header>
      <SampleNotice />

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-5">
          <section aria-labelledby="mb-details" className="card flex flex-col gap-4 p-5 lg:p-6">
            <h2 id="mb-details" className="text-lg font-extrabold">
              Details
            </h2>
            <Field label="Title" htmlFor="mb-title">
              <input id="mb-title" className="field" placeholder="e.g. Full mock 3" value={t.title} onChange={(e) => set({ title: e.target.value })} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Course" htmlFor="mb-course">
                <select
                  id="mb-course"
                  className="field"
                  value={t.courseId}
                  onChange={(e) => {
                    const fresh = blankMock(e.target.value);
                    set({ courseId: e.target.value, counts: fresh.counts, chapterIds: [] });
                  }}
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="flex flex-col gap-1">
                <span className="field-label">Type</span>
                <ChipGroup
                  label="Test type"
                  value={t.kind}
                  onChange={(k) => set({ kind: k, durationMinutes: k === 'full_mock' ? 240 : 120 })}
                  options={[
                    { value: 'full_mock', label: 'Full mock' },
                    { value: 'practice_set', label: 'Practice set' },
                  ]}
                />
              </div>
              <Field label="Time limit (minutes)" htmlFor="mb-time" hint={t.durationMinutes > 0 ? durationLabel(t.durationMinutes) : undefined}>
                <input id="mb-time" type="number" min={5} step={5} className="field" value={t.durationMinutes || ''} onChange={(e) => set({ durationMinutes: Number(e.target.value) || 0 })} />
              </Field>
              <Field label="Attempts allowed" htmlFor="mb-attempts" hint="Leave empty for unlimited">
                <input
                  id="mb-attempts"
                  type="number"
                  min={1}
                  className="field"
                  placeholder="Unlimited"
                  value={t.maxAttempts ?? ''}
                  onChange={(e) => set({ maxAttempts: e.target.value ? Number(e.target.value) : null })}
                />
              </Field>
            </div>
            <Field label="Instructions for students (optional)" htmlFor="mb-desc">
              <textarea id="mb-desc" rows={3} className="field h-auto py-2.5" value={t.description} onChange={(e) => set({ description: e.target.value })} placeholder="e.g. Same format as the real exam. Use the calculator for all numeric questions." />
            </Field>
          </section>

          <section aria-labelledby="mb-questions" className="card flex flex-col gap-4 p-5 lg:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="mb-questions" className="text-lg font-extrabold">
                Questions
              </h2>
              <ChipGroup
                label="How questions are chosen"
                value={t.selection}
                onChange={(v) => set({ selection: v })}
                options={[
                  { value: 'random', label: 'Random from bank' },
                  { value: 'fixed', label: 'Pick questions' },
                ]}
              />
            </div>

            {t.selection === 'random' ? (
              <>
                <p className="text-sm text-ink-3">Every student gets a different set of published questions, picked at random when they start.</p>
                <ul className="flex flex-col divide-y divide-line-soft rounded-xl border border-line">
                  {TYPES.filter((ty) => available[ty.key] > 0 || t.counts[ty.key] > 0).map((ty) => {
                    const over = t.counts[ty.key] > available[ty.key];
                    return (
                      <li key={ty.key} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                        <div>
                          <label htmlFor={`mb-count-${ty.key}`} className="text-sm font-bold">
                            {ty.label}
                          </label>
                          <p className={cx('text-xs', over ? 'font-semibold text-warn-fg' : 'text-ink-3')}>
                            {available[ty.key].toLocaleString('en-IN')} published in the bank{over ? ' · not enough questions' : ''}
                          </p>
                        </div>
                        <input
                          id={`mb-count-${ty.key}`}
                          type="number"
                          min={0}
                          className={cx('field w-28 text-right', over && 'border-warn-strong')}
                          value={t.counts[ty.key]}
                          onChange={(e) => set({ counts: { ...t.counts, [ty.key]: Math.max(0, Number(e.target.value) || 0) } })}
                        />
                      </li>
                    );
                  })}
                </ul>
                <div className="flex flex-col gap-2">
                  <p className="field-label">Take questions from</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      aria-pressed={t.chapterIds.length === 0}
                      onClick={() => set({ chapterIds: [] })}
                      className={cx('chip min-h-10 border', t.chapterIds.length === 0 ? 'border-brand bg-brand/10 text-brand' : 'border-line-strong bg-white')}
                    >
                      All chapters
                    </button>
                    {(course?.chapters ?? []).map((ch) => {
                      const on = t.chapterIds.includes(ch.id);
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          aria-pressed={on}
                          onClick={() => toggleChapter(ch.id)}
                          className={cx('chip min-h-10 border text-left', on ? 'border-brand bg-brand/10 text-brand' : 'border-line-strong bg-white')}
                        >
                          {ch.position}. {ch.title}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <>
                {selected.length === 0 ? (
                  <EmptyState title="No questions picked yet" text="Add questions from the question bank. You can change their order here." />
                ) : (
                  <ol className="flex flex-col divide-y divide-line-soft rounded-xl border border-line">
                    {selected.map((q, i) => (
                      <li key={q.id} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
                        <span className="w-6 shrink-0 text-center text-sm font-bold text-ink-3">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-ink-3">
                            {q.code} · {TYPE_LABEL[q.type]}
                          </p>
                          <p className="line-clamp-2 text-sm font-semibold">{q.stem}</p>
                        </div>
                        <div className="flex shrink-0">
                          <button type="button" aria-label={`Move ${q.code} up`} disabled={i === 0} onClick={() => move(i, -1)} className="flex size-10 items-center justify-center rounded-lg text-ink-3 hover:bg-mist disabled:opacity-30">
                            <ArrowUp aria-hidden className="size-4" />
                          </button>
                          <button type="button" aria-label={`Move ${q.code} down`} disabled={i === selected.length - 1} onClick={() => move(i, 1)} className="flex size-10 items-center justify-center rounded-lg text-ink-3 hover:bg-mist disabled:opacity-30">
                            <ArrowDown aria-hidden className="size-4" />
                          </button>
                          <button type="button" aria-label={`Remove ${q.code}`} onClick={() => set({ questionIds: t.questionIds.filter((x) => x !== q.id) })} className="flex size-10 items-center justify-center rounded-lg text-ink-3 hover:bg-mist">
                            <Trash2 aria-hidden className="size-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
                <button
                  type="button"
                  className="btn-secondary self-start"
                  onClick={() => {
                    setPicked(new Set());
                    setPicker(true);
                  }}
                >
                  <Plus aria-hidden className="size-4" />
                  Add questions
                </button>
              </>
            )}
          </section>

          <section aria-labelledby="mb-options" className="card flex flex-col gap-3 p-5 lg:p-6">
            <h2 id="mb-options" className="text-lg font-extrabold">
              Options
            </h2>
            <Switch checked={t.shuffle} onChange={(v) => set({ shuffle: v })} label="Shuffle question order" hint="Each student sees the questions in a different order." />
            <Switch checked={t.showAnswers} onChange={(v) => set({ showAnswers: v })} label="Show answers after submit" hint="Students see the correct answer and explanation for every question." />
          </section>
        </div>

        <aside aria-label="Summary" className="card flex flex-col gap-4 p-5 lg:sticky lg:top-8">
          <h2 className="text-lg font-extrabold">Summary</h2>
          <dl className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-mist-4 px-3 py-2.5">
              <dt className="text-xs font-semibold text-ink-3">Questions</dt>
              <dd className="text-2xl font-extrabold">{total}</dd>
            </div>
            <div className="rounded-xl bg-mist-4 px-3 py-2.5">
              <dt className="text-xs font-semibold text-ink-3">Time</dt>
              <dd className="text-2xl font-extrabold">{t.durationMinutes ? durationLabel(t.durationMinutes).replace(' hours', ' h').replace(' hour', ' h') : '—'}</dd>
            </div>
          </dl>
          {course?.examFormat && (
            <p className="rounded-xl bg-brand/10 px-3.5 py-2.5 text-[13px] text-brand">
              <b>Real {course.label} exam:</b> {course.examFormat}
            </p>
          )}
          <ul className="flex flex-col gap-2 text-sm">
            {[
              { ok: !!t.title.trim(), l: 'Title added' },
              { ok: total > 0, l: 'Questions added' },
              { ok: t.durationMinutes > 0, l: 'Time limit set' },
              { ok: !(t.selection === 'random' && TYPES.some((ty) => t.counts[ty.key] > available[ty.key])), l: 'Enough questions in the bank' },
            ].map((c) => (
              <li key={c.l} className={cx('flex items-center gap-2', c.ok ? 'text-ink' : 'text-ink-3')}>
                {c.ok ? <Check aria-hidden className="size-4 text-ok-fg" /> : <Circle aria-hidden className="size-4" />}
                {c.l}
                <span className="sr-only">{c.ok ? ', done' : ', not done'}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {/* phone actions */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-line bg-white px-4 py-2.5 pb-safe lg:hidden [&>button]:flex-1">{actions}</div>

      <Modal
        open={picker}
        onClose={() => setPicker(false)}
        wide
        title="Add questions"
        description={`From the ${course?.label ?? ''} question bank`}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setPicker(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={picked.size === 0}
              onClick={() => {
                set({ questionIds: [...t.questionIds, ...[...picked].filter((id) => !t.questionIds.includes(id))] });
                setPicker(false);
              }}
            >
              Add {picked.size || ''} {picked.size === 1 ? 'question' : 'questions'}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <label className="relative">
            <span className="sr-only">Search questions</span>
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
            <input className="field pl-9" placeholder="Search by code or text" value={pickSearch} onChange={(e) => setPickSearch(e.target.value)} />
          </label>
          <ul className="flex flex-col divide-y divide-line-soft rounded-xl border border-line">
            {pickList.map((q) => {
              const already = t.questionIds.includes(q.id);
              return (
                <li key={q.id}>
                  <label className={cx('flex items-start gap-3 px-3.5 py-3', already ? 'opacity-50' : 'cursor-pointer hover:bg-mist-4')}>
                    <input
                      type="checkbox"
                      className="mt-1 size-[18px] shrink-0 accent-brand"
                      disabled={already}
                      checked={already || picked.has(q.id)}
                      onChange={(e) =>
                        setPicked((s) => {
                          const n = new Set(s);
                          if (e.target.checked) n.add(q.id);
                          else n.delete(q.id);
                          return n;
                        })
                      }
                    />
                    <span className="min-w-0">
                      <span className="block text-xs font-bold text-ink-3">
                        {q.code} · {TYPE_LABEL[q.type]} · {q.chapterLabel}
                        {already && ' · already added'}
                      </span>
                      <span className="mt-0.5 block text-sm font-semibold">{q.stem}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      </Modal>
    </div>
  );
}
