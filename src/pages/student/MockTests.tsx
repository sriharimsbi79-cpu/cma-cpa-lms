import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Monitor } from 'lucide-react';
import { ChipGroup, EmptyState, ErrorState, PageLoader, ProgressBar } from '@/components/ui';
import { useMockTests } from '@/lib/api';
import { cx, formatDate, hoursMinutes, plural } from '@/lib/format';
import type { MockTest } from '@/lib/types';

interface Group {
  courseId: string;
  label: string;
  short: string;
  format: string | null;
  isCma: boolean;
  tests: MockTest[];
}

function groupTests(tests: MockTest[]): Group[] {
  const map = new Map<string, Group>();
  for (const t of tests) {
    if (!map.has(t.courseId))
      map.set(t.courseId, {
        courseId: t.courseId,
        label: t.courseLabel,
        short: t.courseShort,
        format: t.examFormat,
        isCma: t.courseShort.startsWith('CMA'),
        tests: [],
      });
    map.get(t.courseId)!.tests.push(t);
  }
  return [...map.values()];
}

/** Every action button in a row has the same size, whatever its label. */
const ACTION_BTN = 'w-[104px] shrink-0 px-2 text-[13px] lg:w-[140px] lg:text-sm';

function practiceUnit(isCma: boolean) {
  return isCma ? 'cases' : 'simulations';
}

function TestRow({ t, isCma, first, last }: { t: MockTest; isCma: boolean; first: boolean; last: boolean }) {
  const href = `/tests/${t.testId}`;
  const isPractice = t.kind === 'practice_set';
  const attempted = t.attempts > 0;
  const progressPct = t.questionCount ? (100 * t.practiceDone) / t.questionCount : 0;
  const sub = isPractice
    ? `${plural(t.questionCount, isCma ? 'case' : 'simulation')} · ${t.practiceDone > 0 ? `${t.practiceDone} completed` : 'not started'}`
    : attempted
      ? `Attempted ${formatDate(t.lastSubmittedAt)}${t.lastTimeSpent ? ` · ${hoursMinutes(t.lastTimeSpent)}` : ''}`
      : t.inProgressAttemptId
        ? 'In progress'
        : 'Not attempted';
  const subShort = isPractice
    ? `${t.practiceDone} of ${t.questionCount} ${practiceUnit(isCma)}`
    : attempted
      ? `${formatDate(t.lastSubmittedAt)} · scored ${Math.round(t.lastPercent ?? 0)}%`
      : 'Not attempted';

  let action: { label: string; primary: boolean };
  if (t.inProgressAttemptId) action = { label: 'Continue', primary: true };
  else if (isPractice) action = { label: t.practiceDone > 0 ? 'Continue' : 'Start', primary: t.practiceDone > 0 };
  else if (attempted) action = { label: 'Review', primary: false };
  else action = { label: 'Start', primary: true };

  return (
    <li className={cx('flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-line-soft', first ? 'pt-3 lg:pt-3.5' : 'pt-2.5 lg:pt-3.5', last ? 'pb-0' : 'pb-2.5 lg:pb-3.5')}>
      <div className="min-w-0 flex-1 lg:flex-[1_1_260px]">
        <p className="text-sm font-bold lg:text-[15px]">{t.title}</p>
        <p className="mt-0.5 text-xs text-ink-3 lg:hidden">{subShort}</p>
        <p className="mt-0.5 hidden text-[13px] text-ink-3 lg:block">{sub}</p>
        {isPractice && (
          <ProgressBar value={progressPct} label={`${t.title} progress`} height="h-[5px]" className="mt-1.5 w-[70px] lg:hidden" />
        )}
      </div>
      <span className="hidden min-w-16 lg:block">
        {isPractice ? (
          <ProgressBar value={progressPct} label={`${t.title} progress`} height="h-1.5" className="w-[120px]" />
        ) : attempted ? (
          <span className="text-xl font-extrabold">{Math.round(t.lastPercent ?? 0)}%</span>
        ) : (
          <span className="text-sm text-ink-3">—</span>
        )}
      </span>
      <div className="ml-auto flex shrink-0 justify-end gap-2">
        {attempted && !isPractice && (
          <Link to={`/results/${t.lastAttemptId}`} className={cx('btn-secondary hidden lg:inline-flex', ACTION_BTN)}>
            Review answers
          </Link>
        )}
        <Link
          to={action.label === 'Review' ? `/results/${t.lastAttemptId}` : href}
          className={cx(ACTION_BTN, action.primary ? 'btn-primary' : 'btn-secondary', action.label === 'Review' && 'lg:hidden')}
        >
          {action.label}
        </Link>
        {attempted && !isPractice && (
          <Link to={href} className={cx('btn-secondary hidden lg:inline-flex', ACTION_BTN)}>
            Retake
          </Link>
        )}
      </div>
    </li>
  );
}

export default function MockTests() {
  const { data, isLoading, error, refetch } = useMockTests();
  const [filter, setFilter] = useState('all');
  const groups = useMemo(() => groupTests(data ?? []), [data]);

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;

  const tests = data ?? [];
  const mocks = tests.filter((t) => t.kind === 'full_mock');
  const attempted = mocks.filter((t) => t.attempts > 0);
  const avg = attempted.length ? Math.round(attempted.reduce((a, t) => a + (t.lastPercent ?? 0), 0) / attempted.length) : null;
  const practiceDone = tests.filter((t) => t.kind === 'practice_set').reduce((a, t) => a + t.practiceDone, 0);
  const shown = groups.filter((g) => filter === 'all' || g.courseId === filter);

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <header>
        <h1 className="text-[26px] font-extrabold leading-tight tracking-tight lg:text-[28px]">Mock tests</h1>
        <p className="mt-1 text-sm text-ink-3 lg:text-[15px]">
          <span className="lg:hidden">Exam-style tests in full-screen exam mode</span>
          <span className="hidden lg:inline">Full-length, exam-style tests for the courses you are enrolled in. Chapter tests are inside each chapter.</span>
        </p>
      </header>

      <div className="grid grid-cols-3 gap-2 lg:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] lg:gap-4">
        {[
          { v: String(attempted.length), l: 'Mocks attempted' },
          { v: avg === null ? '—' : `${avg}%`, l: 'Average mock score' },
          { v: String(practiceDone), l: 'Practice questions done' },
        ].map((s) => (
          <div key={s.l} className="flex flex-col rounded-[14px] border border-line bg-white p-3 lg:flex-col-reverse lg:rounded-2xl lg:px-5 lg:py-[18px]">
            <p className="text-[22px] font-extrabold leading-tight lg:mt-1 lg:text-[30px] lg:tracking-tight">{s.v}</p>
            <p className="mt-0.5 text-xs leading-tight text-ink-3 lg:mt-0 lg:text-[13px] lg:font-semibold">{s.l}</p>
          </div>
        ))}
      </div>

      {groups.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ChipGroup
            label="Filter by course"
            scroll
            value={filter}
            onChange={setFilter}
            options={[{ value: 'all', label: 'All courses' }, ...groups.map((g) => ({ value: g.courseId, label: g.short }))]}
          />
          <p className="hidden items-center gap-2 text-[13px] text-ink-3 lg:flex">
            <Monitor aria-hidden className="size-4" />
            Opens in full-screen exam mode: timer, flag for review, calculator, spreadsheet
          </p>
        </div>
      )}

      {groups.length === 0 ? (
        <EmptyState title="No mock tests yet" text="Mock tests for your courses will appear here once they are published." />
      ) : (
        shown.map((g) => {
          const nMocks = g.tests.filter((t) => t.kind === 'full_mock').length;
          const nSets = g.tests.filter((t) => t.kind === 'practice_set').length;
          const kindLabel = g.isCma ? 'CBQ' : 'TBS';
          return (
            <section key={g.courseId} aria-labelledby={`m-${g.courseId}`} className="card rounded-2xl px-4 pb-1 pt-4 lg:rounded-card lg:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-1 lg:pb-2">
                <div>
                  <h2 id={`m-${g.courseId}`} className="text-base font-extrabold lg:text-lg">
                    {g.label}
                  </h2>
                  <p className="mt-0.5 text-[13px] text-ink-3 lg:mt-1 lg:text-sm">
                    <span className="hidden lg:inline">Real exam format: </span>
                    {g.format ?? 'Exam-style timed test'}
                  </p>
                </div>
                <span
                  className={cx(
                    'hidden rounded-full px-3 py-1.5 text-[13px] font-bold lg:inline-flex',
                    g.isCma ? 'bg-brand/10 text-brand' : 'bg-mist-2 text-navy',
                  )}
                >
                  {plural(nMocks, 'full mock')}
                  {nSets ? ` · ${plural(nSets, `${kindLabel} practice set`)}` : ''}
                </span>
              </div>
              <ul className="pb-3 lg:pb-0">
                {g.tests.map((t, i) => (
                  <TestRow key={t.testId} t={t} isCma={g.isCma} first={i === 0} last={i === g.tests.length - 1} />
                ))}
              </ul>
            </section>
          );
        })
      )}

      <p className="flex items-center gap-2 text-xs text-ink-3 lg:hidden">
        <Monitor aria-hidden className="size-4 shrink-0" />
        Tip: full mocks work best on a laptop, like the real test centre.
      </p>
    </div>
  );
}
