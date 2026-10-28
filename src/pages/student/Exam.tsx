import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Calculator as CalcIcon, ChevronLeft, ChevronRight, Clock, Flag, LayoutGrid, X } from 'lucide-react';
import QuestionView from '@/components/QuestionView';
import { Modal, PageLoader } from '@/components/ui';
import { examQuestionsFor, saveAttempt, type ExamQuestion } from '@/data/exam';
import { useTestInfo } from '@/lib/api';
import { hasValue } from '@/lib/grading';
import { isDemo } from '@/lib/supabase';
import { clock, cx, plural } from '@/lib/format';
import type { QuestionType } from '@/lib/types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = Record<string, any>;

export const TYPE_LABEL: Record<QuestionType, string> = {
  mcq: 'Multiple choice',
  tbs_journal_entry: 'TBS · Journal entry',
  tbs_numeric: 'TBS · Numeric entry',
  tbs_dropdown: 'TBS · Dropdown',
  tbs_drag_drop: 'TBS · Matching',
  tbs_research: 'TBS · Research',
  tbs_document_review: 'TBS · Document review',
  cbq: 'Case-based question',
};

const SECTION_LABEL = { mcq: 'Multiple choice', task: 'Task-based and case questions' } as const;

// ---------- saved progress (this device) ----------
interface Saved {
  startedAt: number;
  responses: Record<string, Json>;
  flagged: string[];
  index: number;
}
const storeKey = (testId: string) => `lms_exam_${testId}`;
function loadSaved(testId: string): Saved | null {
  try {
    const raw = localStorage.getItem(storeKey(testId));
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}
function writeSaved(testId: string, s: Saved) {
  try {
    localStorage.setItem(storeKey(testId), JSON.stringify(s));
  } catch {
    /* storage unavailable: answers stay in memory */
  }
}
function clearSaved(testId: string) {
  try {
    localStorage.removeItem(storeKey(testId));
  } catch {
    /* ignore */
  }
}

// ---------- palette ----------
function Palette({
  questions,
  index,
  responses,
  flagged,
  onPick,
}: {
  questions: ExamQuestion[];
  index: number;
  responses: Record<string, Json>;
  flagged: Set<string>;
  onPick: (i: number) => void;
}) {
  const sections = (['mcq', 'task'] as const)
    .map((s) => ({ s, items: questions.map((q, i) => ({ q, i })).filter((x) => x.q.section === s) }))
    .filter((x) => x.items.length > 0);
  return (
    <div className="flex flex-col gap-4">
      {sections.map(({ s, items }) => (
        <div key={s} className="flex flex-col gap-2">
          <p className="text-xs font-bold text-ink-3">{SECTION_LABEL[s]}</p>
          <div className="grid grid-cols-5 gap-2">
            {items.map(({ q, i }) => {
              const answered = hasValue(responses[q.id]);
              const isFlagged = flagged.has(q.id);
              const current = i === index;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => onPick(i)}
                  aria-current={current ? 'step' : undefined}
                  aria-label={`Question ${i + 1}, ${answered ? 'answered' : 'not answered'}${isFlagged ? ', flagged' : ''}`}
                  className={cx(
                    'relative flex h-11 items-center justify-center rounded-[10px] text-sm font-bold',
                    answered ? 'bg-brand text-white' : 'border border-line-strong bg-white text-ink',
                    current && 'ring-2 ring-navy ring-offset-2',
                  )}
                >
                  {i + 1}
                  {isFlagged && (
                    <span className="absolute -right-1 -top-1 flex size-[18px] items-center justify-center rounded-full bg-warn-strong text-white">
                      <Flag aria-hidden className="size-2.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line-soft pt-3 text-xs text-ink-3">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="size-3 rounded bg-brand" />
          Answered
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="size-3 rounded border border-line-strong bg-white" />
          Not answered
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="size-3 rounded-full bg-warn-strong" />
          Flagged
        </li>
      </ul>
    </div>
  );
}

// ---------- calculator ----------
const CALC_KEYS = ['C', '±', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '0', '.', '='];

function Calculator() {
  const [display, setDisplay] = useState('0');
  const [acc, setAcc] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [fresh, setFresh] = useState(true);

  const fmt = (n: number) => (Number.isFinite(n) ? String(parseFloat(n.toPrecision(12))) : 'Error');
  const run = (a: number, b: number, o: string) => (o === '+' ? a + b : o === '−' ? a - b : o === '×' ? a * b : b === 0 ? NaN : a / b);

  const press = (k: string) => {
    if (/^[0-9]$/.test(k)) {
      setDisplay((d) => (fresh || d === '0' || d === 'Error' ? k : d.length < 16 ? d + k : d));
      setFresh(false);
    } else if (k === '.') {
      setDisplay((d) => (fresh || d === 'Error' ? '0.' : d.includes('.') ? d : d + '.'));
      setFresh(false);
    } else if (k === 'C') {
      setDisplay('0');
      setAcc(null);
      setOp(null);
      setFresh(true);
    } else if (k === '±') {
      setDisplay((d) => (d === '0' || d === 'Error' ? d : d.startsWith('-') ? d.slice(1) : '-' + d));
    } else if (k === '%') {
      setDisplay((d) => fmt(Number(d) / 100));
    } else if (k === '=') {
      if (op && acc !== null) {
        setDisplay(fmt(run(acc, Number(display), op)));
        setAcc(null);
        setOp(null);
        setFresh(true);
      }
    } else {
      const cur = Number(display);
      if (op && acc !== null && !fresh) {
        const r = run(acc, cur, op);
        setAcc(r);
        setDisplay(fmt(r));
      } else setAcc(cur);
      setOp(k);
      setFresh(true);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <output aria-live="polite" className="block truncate rounded-xl bg-mist px-4 py-3 text-right text-[28px] font-extrabold tabular-nums">
        {display}
      </output>
      <div className="grid grid-cols-4 gap-2">
        {CALC_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => press(k)}
            aria-label={k === '−' ? 'minus' : k === '×' ? 'times' : k === '÷' ? 'divide' : k === '±' ? 'plus or minus' : k === 'C' ? 'clear' : undefined}
            className={cx(
              'h-12 rounded-xl text-lg font-bold',
              k === '0' && 'col-span-2',
              k === '=' ? 'bg-brand text-white' : ['÷', '×', '−', '+'].includes(k) ? (op === k && fresh ? 'bg-navy text-white' : 'bg-mist-2 text-navy') : 'border border-line bg-white',
            )}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- exam screen ----------
export default function Exam() {
  const { testId = '' } = useParams();
  const navigate = useNavigate();
  const { data: info, isLoading } = useTestInfo(testId);
  const questions = useMemo(() => examQuestionsFor(testId), [testId]);
  const saved = useMemo(() => loadSaved(testId), [testId]);

  const [startedAt] = useState(() => saved?.startedAt ?? Date.now());
  const [index, setIndex] = useState(() => Math.min(saved?.index ?? 0, questions.length - 1));
  const [responses, setResponses] = useState<Record<string, Json>>(() => saved?.responses ?? {});
  const [flagged, setFlagged] = useState<Set<string>>(() => new Set(saved?.flagged ?? []));
  const [now, setNow] = useState(() => Date.now());
  const [modal, setModal] = useState<null | 'submit' | 'exit' | 'palette' | 'calc'>(null);
  const done = useRef(false);

  const q = questions[index];
  const total = questions.length;
  const answeredCount = questions.filter((x) => hasValue(responses[x.id])).length;
  const durationSec = (info?.durationMinutes ?? 60) * 60;
  const left = Math.max(0, durationSec - Math.floor((now - startedAt) / 1000));

  // tick
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // save progress on this device
  useEffect(() => {
    if (!done.current) writeSaved(testId, { startedAt, responses, flagged: [...flagged], index });
  }, [testId, startedAt, responses, flagged, index]);

  // warn before closing the tab
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!done.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  const submit = useCallback(() => {
    if (done.current) return;
    done.current = true;
    const attemptId = `local-${Date.now().toString(36)}`;
    saveAttempt({
      attemptId,
      testId,
      title: info?.title ?? 'Test',
      courseLabel: info?.courseLabel ?? '',
      submittedAt: new Date().toISOString(),
      timeSpentSeconds: Math.min(durationSec, Math.round((Date.now() - startedAt) / 1000)),
      questions,
      responses,
      flagged: [...flagged],
    });
    clearSaved(testId);
    navigate(`/results/${attemptId}`, { replace: true });
  }, [testId, info, durationSec, startedAt, questions, responses, flagged, navigate]);

  // time up: submit automatically
  useEffect(() => {
    if (info && left === 0) submit();
  }, [info, left, submit]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <PageLoader label="Opening test" />
      </div>
    );
  }

  const go = (i: number) => {
    setIndex(Math.max(0, Math.min(total - 1, i)));
    setModal(null);
    window.scrollTo(0, 0);
  };
  const toggleFlag = () =>
    setFlagged((s) => {
      const n = new Set(s);
      if (n.has(q.id)) n.delete(q.id);
      else n.add(q.id);
      return n;
    });
  const isFlagged = flagged.has(q.id);
  const last = index === total - 1;
  const lowTime = left <= 300;
  const unanswered = total - answeredCount;

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <header className="sticky top-0 z-30 bg-navy text-white">
        <div className="flex h-14 items-center gap-1.5 px-2 sm:gap-2 sm:px-4 lg:h-16 lg:px-6">
          <button type="button" aria-label="Exit test" onClick={() => setModal('exit')} className="flex size-11 shrink-0 items-center justify-center rounded-xl hover:bg-white/10">
            <X aria-hidden className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold lg:text-base">{info?.title ?? 'Test'}</p>
            <p className="hidden truncate text-xs text-navy-muted sm:block">{info?.courseLabel}</p>
          </div>
          <div
            role="timer"
            aria-label={`Time left ${clock(left)}`}
            className={cx(
              'flex h-10 items-center gap-1.5 rounded-xl px-3 text-[15px] font-extrabold tabular-nums',
              lowTime ? 'bg-warn-strong text-white' : 'bg-white/10',
            )}
          >
            <Clock aria-hidden className="size-4" />
            {clock(left)}
          </div>
          <button type="button" onClick={() => setModal('calc')} className="hidden h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold hover:bg-white/10 sm:flex">
            <CalcIcon aria-hidden className="size-4" />
            Calculator
          </button>
          <button type="button" aria-label="Calculator" onClick={() => setModal('calc')} className="flex size-11 items-center justify-center rounded-xl hover:bg-white/10 sm:hidden">
            <CalcIcon aria-hidden className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => setModal('palette')}
            aria-label={`All questions, ${answeredCount} of ${total} answered`}
            className="flex h-10 items-center gap-1.5 rounded-xl bg-white/10 px-3 text-sm font-bold lg:hidden"
          >
            <LayoutGrid aria-hidden className="size-4" />
            {answeredCount}/{total}
          </button>
          <button type="button" onClick={() => setModal('submit')} className="btn-primary ml-1 hidden lg:inline-flex">
            Submit test
          </button>
        </div>
        <div className="h-1 bg-white/10">
          <div className="h-full bg-brand transition-all" style={{ width: `${(100 * answeredCount) / total}%` }} />
        </div>
      </header>

      {!isDemo && (
        <p className="border-b border-warn-line bg-warn-bg px-4 py-2 text-center text-xs font-semibold text-warn-fg">
          Sample questions. This screen is not connected to your question bank yet.
        </p>
      )}

      <div className="mx-auto flex w-full max-w-[1240px] flex-1 gap-6 px-4 pb-28 pt-4 sm:px-6 lg:pb-10 lg:pt-6">
        <main className="min-w-0 flex-1">
          <section aria-labelledby="q-title" className="card p-4 sm:p-6 lg:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft pb-4">
              <div>
                <p className="text-xs font-bold text-ink-3">{TYPE_LABEL[q.type]}</p>
                <h1 id="q-title" className="mt-0.5 text-lg font-extrabold lg:text-xl">
                  Question {index + 1} <span className="font-semibold text-ink-3">of {total}</span>
                </h1>
              </div>
              <button
                type="button"
                aria-pressed={isFlagged}
                onClick={toggleFlag}
                className={cx('btn hidden border lg:inline-flex', isFlagged ? 'border-warn-line bg-warn-bg text-warn-fg' : 'border-line-strong bg-white text-ink hover:bg-mist-4')}
              >
                <Flag aria-hidden className="size-4" />
                {isFlagged ? 'Flagged' : 'Flag for review'}
              </button>
            </div>
            <div className="pt-5">
              <QuestionView
                key={q.id}
                idPrefix={q.id}
                type={q.type}
                stem={q.stem}
                content={q.content}
                exhibits={q.exhibits}
                value={responses[q.id] ?? {}}
                onChange={(v) => setResponses((r) => ({ ...r, [q.id]: v }))}
              />
            </div>
          </section>

          <div className="mt-4 hidden items-center justify-between lg:flex">
            <button type="button" className="btn-secondary" disabled={index === 0} onClick={() => go(index - 1)}>
              <ChevronLeft aria-hidden className="size-4" />
              Previous
            </button>
            {last ? (
              <button type="button" className="btn-primary" onClick={() => setModal('submit')}>
                Review and submit
              </button>
            ) : (
              <button type="button" className="btn-primary" onClick={() => go(index + 1)}>
                Next
                <ChevronRight aria-hidden className="size-4" />
              </button>
            )}
          </div>
        </main>

        <aside aria-label="Questions" className="hidden w-[296px] shrink-0 lg:block">
          <div className="card sticky top-[92px] flex flex-col gap-4 p-5">
            <div>
              <p className="text-base font-extrabold">Questions</p>
              <p className="mt-0.5 text-[13px] text-ink-3">
                {answeredCount} answered · {unanswered} left · {flagged.size} flagged
              </p>
            </div>
            <Palette questions={questions} index={index} responses={responses} flagged={flagged} onPick={go} />
            <button type="button" className="btn-primary w-full" onClick={() => setModal('submit')}>
              Submit test
            </button>
          </div>
        </aside>
      </div>

      {/* phone / tablet bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white pb-safe lg:hidden">
        <div className="mx-auto flex max-w-[1240px] items-center gap-2 px-4 py-2.5 sm:px-6">
          <button type="button" aria-label="Previous question" className="btn-secondary w-12 shrink-0 px-0" disabled={index === 0} onClick={() => go(index - 1)}>
            <ChevronLeft aria-hidden className="size-5" />
          </button>
          <button
            type="button"
            aria-pressed={isFlagged}
            onClick={toggleFlag}
            className={cx('btn flex-1 border px-3', isFlagged ? 'border-warn-line bg-warn-bg text-warn-fg' : 'border-line-strong bg-white text-ink')}
          >
            <Flag aria-hidden className="size-4" />
            {isFlagged ? 'Flagged' : 'Flag'}
          </button>
          {last ? (
            <button type="button" className="btn-primary flex-[1.4] px-3" onClick={() => setModal('submit')}>
              Submit
            </button>
          ) : (
            <button type="button" className="btn-primary flex-[1.4] px-3" onClick={() => go(index + 1)}>
              Next
              <ChevronRight aria-hidden className="size-4" />
            </button>
          )}
        </div>
      </div>

      <Modal
        open={modal === 'palette'}
        onClose={() => setModal(null)}
        title="All questions"
        description={`${answeredCount} answered · ${unanswered} left · ${flagged.size} flagged`}
        footer={
          <button type="button" className="btn-primary w-full" onClick={() => setModal('submit')}>
            Submit test
          </button>
        }
      >
        <Palette questions={questions} index={index} responses={responses} flagged={flagged} onPick={go} />
      </Modal>

      <Modal
        open={modal === 'submit'}
        onClose={() => setModal(null)}
        title="Submit this test?"
        description="You cannot change your answers after you submit."
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModal(null)}>
              Keep working
            </button>
            <button type="button" className="btn-primary" onClick={submit}>
              Submit test
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <dl className="grid grid-cols-3 gap-2 text-center">
            {[
              { l: 'Answered', v: answeredCount },
              { l: 'Not answered', v: unanswered },
              { l: 'Flagged', v: flagged.size },
            ].map((s) => (
              <div key={s.l} className="rounded-xl bg-mist px-2 py-3">
                <dt className="text-xs font-semibold text-ink-3">{s.l}</dt>
                <dd className="text-2xl font-extrabold">{s.v}</dd>
              </div>
            ))}
          </dl>
          {unanswered > 0 && (
            <p className="rounded-xl border border-warn-line bg-warn-bg px-3.5 py-2.5 text-sm text-warn-fg">
              {plural(unanswered, 'question is', 'questions are')} not answered. Unanswered questions score zero.
            </p>
          )}
          <p className="text-sm text-ink-3">Time left: {clock(left)}</p>
        </div>
      </Modal>

      <Modal
        open={modal === 'exit'}
        onClose={() => setModal(null)}
        title="Leave the test?"
        description="Your answers are saved on this device. The timer keeps running while you are away."
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModal(null)}>
              Stay
            </button>
            <button type="button" className="btn-dark" onClick={() => navigate(`/tests/${testId}`)}>
              Leave test
            </button>
          </>
        }
      >
        <p className="text-sm text-ink-2">
          {answeredCount} of {total} questions answered. You can come back and continue before the time runs out.
        </p>
      </Modal>

      <Modal open={modal === 'calc'} onClose={() => setModal(null)} title="Calculator">
        <Calculator />
      </Modal>
    </div>
  );
}
