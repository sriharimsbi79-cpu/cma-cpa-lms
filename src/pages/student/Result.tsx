import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, ChevronDown, ChevronLeft, CircleDashed, CircleDot, Flag, RotateCcw, XCircle } from 'lucide-react';
import QuestionView from '@/components/QuestionView';
import { ChipGroup, EmptyState, ProgressBar, SectionHeader } from '@/components/ui';
import { getAttempt, type ExamQuestion } from '@/data/exam';
import { gradeResponse, hasValue } from '@/lib/grading';
import { cx, formatDate, hoursMinutes, plural } from '@/lib/format';
import type { QuestionType } from '@/lib/types';
import { TYPE_LABEL } from './Exam';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = Record<string, any>;
type Status = 'correct' | 'partial' | 'incorrect' | 'unanswered';

const STATUS: Record<Status, { label: string; icon: typeof CheckCircle2; cls: string }> = {
  correct: { label: 'Correct', icon: CheckCircle2, cls: 'bg-ok-bg text-ok-fg' },
  partial: { label: 'Partly correct', icon: CircleDot, cls: 'bg-brand/10 text-brand' },
  incorrect: { label: 'Incorrect', icon: XCircle, cls: 'bg-warn-bg text-warn-fg' },
  unanswered: { label: 'Not answered', icon: CircleDashed, cls: 'bg-mist text-ink-2' },
};

const money = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n !== 0 ? n.toLocaleString('en-US') : '';
};

/** The correct answer written out, for every question type. */
function KeyView({ type, content, k }: { type: QuestionType; content: Json; k: Json | null | undefined }) {
  if (!k) return null;
  switch (type) {
    case 'mcq': {
      const o = (content.options ?? []).find((x: Json) => x.id === k.correct);
      return <p>{o ? `${o.id.toUpperCase()}. ${o.text}` : '—'}</p>;
    }
    case 'tbs_numeric':
      return (
        <ul className="flex flex-col gap-1">
          {(content.cells ?? []).map((c: Json) => (
            <li key={c.id}>
              {c.label}: <b className="tabular-nums">{Number(k.answers?.[c.id]?.value).toLocaleString('en-US')}</b>
            </li>
          ))}
        </ul>
      );
    case 'tbs_dropdown':
    case 'tbs_document_review':
      return (
        <ul className="flex flex-col gap-1">
          {((type === 'tbs_dropdown' ? content.blanks : content.spans) ?? []).map((b: Json) => (
            <li key={b.id}>
              {b.label ?? b.text} → <b>{k.answers?.[b.id]}</b>
            </li>
          ))}
        </ul>
      );
    case 'tbs_drag_drop':
      return (
        <ul className="flex flex-col gap-1">
          {(content.items ?? []).map((it: Json) => (
            <li key={it.id}>
              {it.text} → <b>{(content.targets ?? []).find((t: Json) => t.id === k.answers?.[it.id])?.text ?? '—'}</b>
            </li>
          ))}
        </ul>
      );
    case 'tbs_journal_entry':
      return (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[360px] text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-3">
                <th scope="col" className="py-1 pr-2 font-bold">Account</th>
                <th scope="col" className="px-2 py-1 text-right font-bold">Debit</th>
                <th scope="col" className="px-2 py-1 text-right font-bold">Credit</th>
              </tr>
            </thead>
            <tbody>
              {(k.lines ?? []).map((l: Json, i: number) => (
                <tr key={i} className="border-t border-ok-fg/15">
                  <td className={cx('py-1.5 pr-2 font-semibold', Number(l.credit) > 0 && 'pl-6')}>{l.account}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{money(l.debit)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{money(l.credit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'tbs_research':
      return <p className="font-mono">{(k.citations ?? []).join(' or ')}</p>;
    case 'cbq':
      return (
        <ol className="flex flex-col gap-2.5">
          {(content.parts ?? []).map((p: Json, i: number) => (
            <li key={p.id}>
              <p className="text-xs font-bold text-ok-fg/80">Part {i + 1}</p>
              <KeyView type={p.type} content={p} k={k.parts?.[p.id]?.key} />
            </li>
          ))}
        </ol>
      );
  }
}

interface Graded {
  q: ExamQuestion;
  n: number;
  response: Json;
  score: number;
  status: Status;
  flagged: boolean;
}

function ReviewItem({ g }: { g: Graded }) {
  const [open, setOpen] = useState(false);
  const s = STATUS[g.status];
  const panelId = `rv-${g.q.id}`;
  return (
    <li className="card overflow-hidden rounded-2xl">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-mist-4 sm:items-center sm:px-5"
      >
        <span className={cx('flex size-9 shrink-0 items-center justify-center rounded-full', s.cls)}>
          <s.icon aria-hidden className="size-[18px]" />
          <span className="sr-only">{s.label}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 text-xs font-bold text-ink-3">
            Question {g.n} · {TYPE_LABEL[g.q.type]}
            {g.flagged && (
              <span className="inline-flex items-center gap-1 text-warn-fg">
                <Flag aria-hidden className="size-3" />
                Flagged
              </span>
            )}
          </span>
          <span className="mt-0.5 line-clamp-2 block text-sm font-semibold sm:line-clamp-1">{g.q.stem.split('\n')[0]}</span>
        </span>
        <span className="hidden shrink-0 text-sm font-bold tabular-nums sm:block">
          {Math.round(g.score * g.q.points * 100) / 100}/{g.q.points}
        </span>
        <ChevronDown aria-hidden className={cx('mt-2 size-5 shrink-0 text-ink-3 transition-transform sm:mt-0', open && 'rotate-180')} />
      </button>
      {open && (
        <div id={panelId} className="flex flex-col gap-4 border-t border-line-soft px-4 py-5 sm:px-5">
          <p className="text-xs font-bold text-ink-3">
            {s.label} · {Math.round(g.score * g.q.points * 100) / 100} of {plural(g.q.points, 'point')} · {g.q.topic}
          </p>
          <QuestionView
            idPrefix={`rv-${g.q.id}`}
            type={g.q.type}
            stem={g.q.stem}
            content={g.q.content}
            exhibits={g.q.exhibits}
            value={g.response}
            readOnly
            reviewKey={g.q.answerKey}
          />
          {g.q.type !== 'mcq' && (
            <div className="rounded-xl border border-ok-fg/20 bg-ok-bg px-4 py-3 text-sm text-ok-fg">
              <p className="mb-1.5 text-xs font-extrabold uppercase tracking-wide">Correct answer</p>
              <KeyView type={g.q.type} content={g.q.content} k={g.q.answerKey} />
            </div>
          )}
          <div className="rounded-xl bg-mist px-4 py-3 text-sm">
            <p className="mb-1 text-xs font-extrabold uppercase tracking-wide text-ink-3">Explanation</p>
            <p className="whitespace-pre-line leading-relaxed text-ink-2">{g.q.explanation}</p>
          </div>
        </div>
      )}
    </li>
  );
}

export default function Result() {
  const { attemptId = '' } = useParams();
  const a = useMemo(() => getAttempt(attemptId), [attemptId]);
  const [filter, setFilter] = useState<'all' | 'wrong' | 'correct' | 'flagged'>('all');

  const graded: Graded[] = useMemo(
    () =>
      (a?.questions ?? []).map((q, i) => {
        const response = a!.responses[q.id] ?? {};
        const answered = hasValue(response);
        const score = answered ? gradeResponse(q.type, q.answerKey, response) : 0;
        const status: Status = !answered ? 'unanswered' : score >= 0.999 ? 'correct' : score > 0 ? 'partial' : 'incorrect';
        return { q, n: i + 1, response, score, status, flagged: a!.flagged.includes(q.id) };
      }),
    [a],
  );

  if (!a) {
    return (
      <EmptyState
        title="Result not found"
        text="This result is not available on this device."
        action={
          <Link to="/mock-tests" className="btn-primary">
            Mock tests
          </Link>
        }
      />
    );
  }

  const totalPts = graded.reduce((s, g) => s + g.q.points, 0);
  const earned = graded.reduce((s, g) => s + g.score * g.q.points, 0);
  const percent = totalPts ? Math.round((100 * earned) / totalPts) : 0;
  const count = (st: Status) => graded.filter((g) => g.status === st).length;

  const sections = (['mcq', 'task'] as const)
    .map((sec) => {
      const items = graded.filter((g) => g.q.section === sec);
      const pts = items.reduce((s, g) => s + g.q.points, 0);
      const got = items.reduce((s, g) => s + g.score * g.q.points, 0);
      return { sec, items, percent: pts ? Math.round((100 * got) / pts) : 0, correct: items.filter((g) => g.status === 'correct').length };
    })
    .filter((s) => s.items.length > 0);

  const topicMap = new Map<string, { pts: number; got: number; n: number }>();
  for (const g of graded) {
    const t = topicMap.get(g.q.topic) ?? { pts: 0, got: 0, n: 0 };
    t.pts += g.q.points;
    t.got += g.score * g.q.points;
    t.n += 1;
    topicMap.set(g.q.topic, t);
  }
  const topics = [...topicMap.entries()]
    .map(([topic, t]) => ({ topic, n: t.n, percent: Math.round((100 * t.got) / t.pts) }))
    .sort((x, y) => x.percent - y.percent);

  const shown = graded.filter((g) =>
    filter === 'all' ? true : filter === 'correct' ? g.status === 'correct' : filter === 'flagged' ? g.flagged : g.status !== 'correct',
  );
  const isChapter = a.testId.endsWith('-test');
  const back = isChapter ? `/chapters/${a.testId.replace(/-test$/, '')}` : '/mock-tests';

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <Link to={back} className="inline-flex h-11 items-center gap-1 self-start text-sm font-bold text-ink-2">
        <ChevronLeft aria-hidden className="size-[18px]" />
        {isChapter ? 'Back to chapter' : 'Mock tests'}
      </Link>

      <header className="-mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ink-3">{a.courseLabel} · Result</p>
          <h1 className="mt-1 text-[26px] font-extrabold leading-tight tracking-tight lg:text-[28px]">{a.title}</h1>
          <p className="mt-1 text-sm text-ink-3">
            Submitted {formatDate(a.submittedAt)}
            {a.timeSpentSeconds ? ` · Time taken ${hoursMinutes(a.timeSpentSeconds)}` : ''}
          </p>
        </div>
        <Link to={`/tests/${a.testId}`} className="btn-secondary">
          <RotateCcw aria-hidden className="size-4" />
          Retake test
        </Link>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr] lg:gap-5">
        <section aria-label="Score" className="card flex flex-col gap-5 p-5 lg:p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-ink-3">Your score</p>
              <p className="text-[52px] font-extrabold leading-none tracking-tight lg:text-[60px]">{percent}%</p>
            </div>
            <p className="pb-1 text-right text-sm text-ink-3">
              <b className="text-ink">{Math.round(earned * 100) / 100}</b> of {plural(totalPts, 'point')}
            </p>
          </div>
          <ProgressBar value={percent} label="Score" height="h-2.5" barClassName={percent >= 75 ? 'bg-ok-fg' : 'bg-brand'} />
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(['correct', 'partial', 'incorrect', 'unanswered'] as Status[]).map((st) => {
              const S = STATUS[st];
              return (
                <div key={st} className="rounded-xl bg-mist-4 px-3 py-2.5">
                  <dt className="flex items-center gap-1.5 text-xs font-semibold text-ink-3">
                    <S.icon aria-hidden className={cx('size-3.5', S.cls.split(' ').find((c) => c.startsWith('text-')))} />
                    {S.label}
                  </dt>
                  <dd className="mt-0.5 text-xl font-extrabold">{count(st)}</dd>
                </div>
              );
            })}
          </dl>
          <div className="flex flex-col gap-3 border-t border-line-soft pt-4">
            {sections.map((s) => (
              <div key={s.sec} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-bold">{s.sec === 'mcq' ? 'Multiple choice' : 'Task-based and case questions'}</span>
                  <span className="text-ink-3">
                    {s.correct} of {s.items.length} fully correct · <b className="text-ink">{s.percent}%</b>
                  </span>
                </div>
                <ProgressBar value={s.percent} label={`${s.sec} score`} height="h-1.5" />
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="topics-h" className="card flex flex-col gap-4 p-5 lg:p-6">
          <div>
            <h2 id="topics-h" className="text-lg font-extrabold">
              By topic
            </h2>
            <p className="mt-0.5 text-[13px] text-ink-3">Weakest first. Revise topics below 60% before your next mock.</p>
          </div>
          <ul className="flex flex-col gap-3.5">
            {topics.map((t) => (
              <li key={t.topic} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-semibold">{t.topic}</span>
                    {t.percent < 60 && <span className="shrink-0 rounded-full bg-warn-bg px-2 py-0.5 text-[11px] font-bold text-warn-fg">Needs work</span>}
                  </span>
                  <span className="shrink-0 font-bold tabular-nums">{t.percent}%</span>
                </div>
                <ProgressBar value={t.percent} label={`${t.topic} score`} height="h-1.5" barClassName={t.percent < 60 ? 'bg-warn-strong' : 'bg-brand'} />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-labelledby="review-h" className="flex flex-col gap-3">
        <SectionHeader id="review-h" title="Answer review" subtitle="Open a question to see your answer, the correct answer and the explanation." />
        <ChipGroup
          label="Show questions"
          scroll
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All', count: graded.length },
            { value: 'wrong', label: 'Incorrect or partly', count: graded.filter((g) => g.status !== 'correct').length },
            { value: 'correct', label: 'Correct', count: count('correct') },
            { value: 'flagged', label: 'Flagged', count: graded.filter((g) => g.flagged).length },
          ]}
        />
        {shown.length === 0 ? (
          <EmptyState title="No questions here" />
        ) : (
          <ul className="flex flex-col gap-2.5">
            {shown.map((g) => (
              <ReviewItem key={g.q.id} g={g} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
