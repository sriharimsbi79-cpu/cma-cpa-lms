import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Bold, Eye, FileText, ImageIcon, Italic, Play, Plus, Table } from 'lucide-react';
import QuestionView from '@/components/QuestionView';
import { useToast } from '@/components/Toast';
import { ErrorState, Field, Modal, PageLoader } from '@/components/ui';
import { useCourseTests, useCourseTree, useQuestion, useSaveQuestion, useStaff, useUploadExhibit } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cx } from '@/lib/format';
import { isDemo } from '@/lib/supabase';
import { isAdminRole, type Difficulty, type PublishStatus, type QuestionRecord, type QuestionType } from '@/lib/types';
import { defaultsFor, editorFor, validateAnswer, type Json } from './questionEditors';
import { QUESTION_TYPES, STATUS_LABEL, typeInfo } from './questionTypes';

function blankRecord(courseId: string): QuestionRecord {
  const d = defaultsFor('mcq');
  return {
    id: null,
    code: null,
    courseId,
    chapterId: null,
    type: 'mcq',
    difficulty: 'medium',
    topic: '',
    stem: '',
    content: d.content,
    points: 1,
    partialCredit: true,
    timeGuideMinutes: null,
    status: 'draft',
    reviewerId: null,
    answerKey: d.answerKey,
    explanation: '',
    exhibits: [],
    testIds: [],
  };
}

const STEM_LABEL: Partial<Record<QuestionType, string>> = {
  mcq: 'Question',
  tbs_research: 'Scenario',
};

export default function QuestionBuilder() {
  const { questionId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { me } = useAuth();
  const isNew = !questionId || questionId === 'new';
  const query = useQuestion(isNew ? 'new' : questionId);
  const tree = useCourseTree();
  const staff = useStaff();
  const save = useSaveQuestion();
  const uploadExhibit = useUploadExhibit();
  const [q, setQ] = useState<QuestionRecord | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState(false);
  const stemRef = useRef<HTMLTextAreaElement>(null);
  const exhibitRef = useRef<HTMLInputElement>(null);

  const courses = useMemo(
    () => (tree.data ?? []).flatMap((p) => p.courses.map((c) => ({ ...c, label: c.kind === 'skill' ? c.name : `${p.name} · ${c.name}` }))),
    [tree.data],
  );

  useEffect(() => {
    if (query.isLoading || tree.isLoading) return;
    setQ(query.data ?? blankRecord(courses[0]?.id ?? ''));
  }, [query.data, query.isLoading, tree.isLoading, courses]);

  const tests = useCourseTests(q?.courseId || undefined);

  if (query.isLoading || tree.isLoading || !q) return query.error ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : <PageLoader />;

  const set = (patch: Partial<QuestionRecord>) => {
    setQ((x) => (x ? { ...x, ...patch } : x));
    setErrors([]);
  };
  const chapters = courses.find((c) => c.id === q.courseId)?.chapters ?? [];
  const Editor = editorFor(q.type);
  const canPublish = isDemo || isAdminRole(me?.role) || (q.reviewerId && q.reviewerId === me?.id);

  const wrap = (before: string, after = before) => {
    const el = stemRef.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b, value } = el;
    const next = value.slice(0, a) + before + value.slice(a, b) + after + value.slice(b);
    set({ stem: next });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + before.length, b + before.length);
    });
  };

  const persist = (status: PublishStatus) => {
    const problems: string[] = [];
    if (!q.stem.trim()) problems.push('Write the question text');
    if (!q.courseId) problems.push('Choose a course');
    if (status !== 'draft') problems.push(...validateAnswer(q.type, q.content as Json, q.answerKey as Json | null));
    if (problems.length) {
      setErrors(problems);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    save.mutate(
      { ...q, status },
      {
        onSuccess: (id) => {
          toast.show(status === 'draft' ? 'Draft saved' : status === 'in_review' ? 'Sent for review' : 'Question published');
          if (isNew) navigate(`/admin/questions/${id}`, { replace: true });
          else set({ status });
        },
        onError: toast.error,
      },
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-3">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link to="/admin/questions" className="hover:text-ink">Question bank</Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="font-semibold text-ink">{isNew ? 'New question' : q.code ?? 'Question'}</li>
        </ol>
      </nav>

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold leading-tight tracking-tight lg:text-[28px]">{isNew ? 'New question' : `Edit ${q.code ?? 'question'}`}</h1>
          <p className="mt-1 text-sm text-ink-3">
            {typeInfo(q.type).label} · {STATUS_LABEL[q.status]}
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button type="button" className="btn-secondary" onClick={() => setPreview(true)}>
            <Eye aria-hidden className="size-4" />
            Preview as student
          </button>
          <button type="button" className="btn-secondary" disabled={save.isPending} onClick={() => persist('draft')}>
            Save draft
          </button>
          {q.status === 'in_review' && canPublish ? (
            <button type="button" className="btn-primary" disabled={save.isPending} onClick={() => persist('published')}>
              Approve and publish
            </button>
          ) : (
            <button type="button" className="btn-primary" disabled={save.isPending} onClick={() => persist('in_review')}>
              Send for review
            </button>
          )}
        </div>
      </header>

      {errors.length > 0 && (
        <div role="alert" className="rounded-2xl border border-warn-line bg-warn-bg px-4 py-3 text-sm text-warn-fg">
          <p className="font-bold">Fix these first:</p>
          <ul className="mt-1 list-disc pl-5">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <fieldset className="card flex flex-col gap-3 p-5">
        <legend className="px-1.5 text-sm font-extrabold">Question type</legend>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
          {QUESTION_TYPES.map((t) => {
            const on = q.type === t.id;
            return (
              <label key={t.id} className={cx('flex cursor-pointer items-start gap-2.5 rounded-xl border px-3.5 py-3', on ? 'border-brand bg-brand/10' : 'border-line bg-white hover:bg-mist-4')}>
                <input
                  type="radio"
                  name="qtype"
                  checked={on}
                  onChange={() => {
                    const d = defaultsFor(t.id);
                    set({ type: t.id, content: d.content, answerKey: d.answerKey, partialCredit: t.id !== 'mcq' });
                  }}
                  className="mt-0.5 size-[18px] shrink-0 accent-brand"
                />
                <span className="flex flex-col">
                  <span className="text-sm font-bold">{t.label}</span>
                  <span className="text-xs text-ink-3">{t.exam}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-start gap-5 lg:gap-6">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
          <section className="card flex flex-col gap-2.5 p-5 lg:p-6">
            <label htmlFor="q-stem" className="text-base font-extrabold">
              {STEM_LABEL[q.type] ?? 'Case scenario and question'}
            </label>
            <div role="toolbar" aria-label="Formatting" className="flex flex-wrap gap-1 rounded-t-[10px] border border-b-0 border-line-strong bg-mist-4 p-1">
              <button type="button" aria-label="Bold" onClick={() => wrap('**')} className="flex size-10 items-center justify-center rounded-lg hover:bg-white">
                <Bold aria-hidden className="size-4" />
              </button>
              <button type="button" aria-label="Italic" onClick={() => wrap('_')} className="flex size-10 items-center justify-center rounded-lg hover:bg-white">
                <Italic aria-hidden className="size-4" />
              </button>
              <button type="button" aria-label="Insert table" onClick={() => wrap('\n| Item | Amount |\n|---|---|\n| ', ' |  |\n')} className="flex size-10 items-center justify-center rounded-lg hover:bg-white">
                <Table aria-hidden className="size-4" />
              </button>
              <button type="button" aria-label="Insert image" onClick={() => toast.show('Add images and documents as exhibits below.', 'info')} className="flex size-10 items-center justify-center rounded-lg hover:bg-white">
                <ImageIcon aria-hidden className="size-4" />
              </button>
            </div>
            <textarea
              id="q-stem"
              ref={stemRef}
              rows={7}
              value={q.stem}
              onChange={(e) => set({ stem: e.target.value })}
              className="-mt-2.5 resize-y rounded-b-[10px] border border-line-strong px-3.5 py-3 text-sm leading-relaxed"
            />
          </section>

          {q.type !== 'mcq' && (
            <section className="card flex flex-col gap-3 p-5 lg:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-extrabold">Exhibits</h2>
                  <p className="mt-0.5 text-[13px] text-ink-3">Students open these in tabs, like the real exam</p>
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={uploadExhibit.isPending}
                  onClick={() => (q.id || isDemo ? exhibitRef.current?.click() : toast.show('Save the draft first, then add exhibits.', 'info'))}
                >
                  <Plus aria-hidden className="size-4" strokeWidth={2.4} />
                  Add exhibit
                </button>
                <input
                  ref={exhibitRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file) return;
                    uploadExhibit.mutate(
                      { questionId: q.id ?? '', file, fileName: file.name, title: file.name.replace(/\.[^.]+$/, '') },
                      { onSuccess: () => toast.show('Exhibit added'), onError: toast.error },
                    );
                  }}
                />
              </div>
              {q.exhibits.length === 0 ? (
                <p className="text-sm text-ink-3">No exhibits yet.</p>
              ) : (
                <ul className="grid gap-2.5 sm:grid-cols-2">
                  {q.exhibits.map((x) => {
                    const ext = (x.storagePath ?? '').split('.').pop()?.toUpperCase().slice(0, 3) ?? 'FILE';
                    return (
                      <li key={x.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
                        <span className={cx('flex h-10 w-9 shrink-0 items-center justify-center rounded-md text-[10px] font-extrabold', ext === 'PDF' ? 'bg-navy text-white' : 'bg-mist-2 text-navy')}>
                          {ext === 'PDF' || ext === 'XLS' ? ext : <FileText aria-hidden className="size-4" />}
                        </span>
                        <span className="flex min-w-0 flex-col">
                          <span className="text-sm font-bold">{x.title}</span>
                          {x.description && <span className="text-xs text-ink-3">{x.description}</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}

          <section className="card flex flex-col gap-3.5 border-2 border-brand p-[19px] lg:p-[23px]">
            <div>
              <h2 className="text-base font-extrabold">Answer key · {typeInfo(q.type).label.replace('TBS · ', '').toLowerCase()}</h2>
              {q.type === 'tbs_journal_entry' && <p className="mt-0.5 text-[13px] text-ink-3">Enter the correct entry. Students see an empty grid with the account list below.</p>}
            </div>
            {Editor && <Editor content={q.content as Json} answerKey={(q.answerKey ?? defaultsFor(q.type).answerKey) as Json} onChange={(content, answerKey) => set({ content, answerKey })} />}
          </section>

          <section className="card flex flex-col gap-2.5 p-5 lg:p-6">
            <label htmlFor="q-expl" className="text-base font-extrabold">
              Explanation <span className="text-[13px] font-medium text-ink-3">· shown to students after they submit</span>
            </label>
            <textarea id="q-expl" rows={4} value={q.explanation} onChange={(e) => set({ explanation: e.target.value })} className="resize-y rounded-[10px] border border-line-strong px-3.5 py-3 text-sm leading-relaxed" />
            <button type="button" onClick={() => toast.show('Solution videos link to the video library once the video service is connected.', 'info')} className="inline-flex h-10 items-center gap-1.5 self-start text-sm font-bold text-brand">
              <Play aria-hidden className="size-3.5" />
              Attach a solution video
            </button>
          </section>
        </div>

        <aside aria-label="Question settings" className="flex w-full min-w-0 flex-col gap-5 lg:w-auto lg:flex-[1_1_320px]">
          <section className="card flex flex-col gap-3.5 p-5">
            <h2 className="text-base font-extrabold">Tags</h2>
            <Field label="Course" htmlFor="s-course">
              <select id="s-course" className="field" value={q.courseId} onChange={(e) => set({ courseId: e.target.value, chapterId: null, testIds: [] })}>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Chapter" htmlFor="s-chapter">
              <select id="s-chapter" className="field" value={q.chapterId ?? ''} onChange={(e) => set({ chapterId: e.target.value || null })}>
                <option value="">No chapter (mock only)</option>
                {chapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    Ch {c.position} · {c.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Topic" htmlFor="s-topic" hint="Used for students' focus areas">
              <input id="s-topic" className="field" value={q.topic} onChange={(e) => set({ topic: e.target.value })} />
            </Field>
            <fieldset>
              <legend className="mb-1 text-xs font-bold text-ink-2">Difficulty</legend>
              <div className="grid grid-cols-3 gap-1.5">
                {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                  <label key={d} className={cx('flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border text-[13px] capitalize', q.difficulty === d ? 'border-brand bg-brand/10 font-bold' : 'border-line-strong font-semibold')}>
                    <input type="radio" name="diff" checked={q.difficulty === d} onChange={() => set({ difficulty: d })} className="accent-brand" />
                    {d}
                  </label>
                ))}
              </div>
            </fieldset>
          </section>

          <section className="card flex flex-col gap-3 p-5">
            <h2 className="text-base font-extrabold">Scoring</h2>
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Points" htmlFor="s-points">
                <input id="s-points" type="number" min={0.5} step={0.5} className="field" value={q.points} onChange={(e) => set({ points: Number(e.target.value) || 1 })} />
              </Field>
              <Field label="Time guide" htmlFor="s-time">
                <select id="s-time" className="field" value={q.timeGuideMinutes ?? ''} onChange={(e) => set({ timeGuideMinutes: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">None</option>
                  {[2, 5, 10, 15, 20, 30].map((m) => (
                    <option key={m} value={m}>
                      {m} min
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            {q.type !== 'mcq' && (
              <label className="flex min-h-11 items-center gap-2.5 text-sm">
                <input type="checkbox" checked={q.partialCredit} onChange={(e) => set({ partialCredit: e.target.checked })} className="size-5 accent-brand" />
                {q.type === 'cbq' ? 'Partial credit for each correct part' : 'Partial credit for each correct row'}
              </label>
            )}
          </section>

          <section className="card flex flex-col gap-1 p-5">
            <h2 className="mb-1.5 text-base font-extrabold">Use in</h2>
            {(tests.data ?? []).length === 0 ? (
              <p className="text-sm text-ink-3">No tests in this course yet. Create a chapter test in Courses &amp; content.</p>
            ) : (
              tests.data!.map((t) => (
                <label key={t.id} className="flex min-h-11 items-center gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    checked={q.testIds.includes(t.id)}
                    onChange={(e) => set({ testIds: e.target.checked ? [...q.testIds, t.id] : q.testIds.filter((x) => x !== t.id) })}
                    className="size-5 accent-brand"
                  />
                  {t.title}
                </label>
              ))
            )}
          </section>

          <section className="card flex flex-col gap-3 p-5">
            <h2 className="text-base font-extrabold">Review</h2>
            <Field label="Reviewer" htmlFor="s-reviewer">
              <select id="s-reviewer" className="field" value={q.reviewerId ?? ''} onChange={(e) => set({ reviewerId: e.target.value || null })}>
                <option value="">Choose a reviewer</option>
                {(staff.data ?? [])
                  .filter((s) => s.id !== me?.id || isDemo)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName}
                    </option>
                  ))}
              </select>
            </Field>
            <p className="text-[13px] text-ink-3">A second faculty member checks every question before students see it.</p>
          </section>
        </aside>
      </div>

      <Modal open={preview} onClose={() => setPreview(false)} title="Preview as student" description={typeInfo(q.type).label} wide>
        <QuestionView type={q.type} stem={q.stem} content={q.content as Json} exhibits={q.exhibits} />
      </Modal>
    </div>
  );
}
