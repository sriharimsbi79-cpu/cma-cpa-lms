import { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Lock } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { EmptyState, ErrorState, PageLoader, ProgressBar } from '@/components/ui';
import { useAccount, useCatalog, useMockTests } from '@/lib/api';
import { cx, daysUntil, formatDate, plural } from '@/lib/format';
import { SKILLS_SLUG, summarizePrograms, type ProgramSummary } from '@/lib/programs';
import type { CatalogCourse, MockTest } from '@/lib/types';
import { ENROLL_NOTE, ProgramBadge } from './Courses';

const SOON_DAYS = 15;

/** A subject inside a program: progress, chapter count and one clear action. */
function SubjectCard({ c, onEnroll }: { c: CatalogCourse; onEnroll: () => void }) {
  const tag = c.kind === 'cpa_discipline' ? 'Discipline' : c.kind === 'cpa_core' ? 'Core' : null;
  const soon = c.daysLeft !== null && c.daysLeft <= SOON_DAYS;
  const action = c.progress >= 100 ? 'Review' : c.chaptersDone > 0 || c.progress > 0 ? 'Continue' : 'Start';

  const head = (
    <span className="flex items-start justify-between gap-2">
      <span className="flex min-w-0 flex-col">
        <span className="flex items-center gap-1.5 text-[17px] font-extrabold lg:text-lg">
          {c.name}
          {!c.enrolled && <Lock aria-hidden className="size-3.5 text-ink-3" />}
        </span>
        <span className="text-[13px] leading-snug text-ink-3">{c.fullName}</span>
      </span>
      {tag && (
        <span className={cx('shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold', tag === 'Discipline' ? 'bg-brand/10 text-brand' : 'bg-mist text-ink-3')}>
          {tag}
        </span>
      )}
    </span>
  );

  if (!c.enrolled) {
    return (
      <div className="flex min-h-[176px] flex-col gap-3 rounded-2xl border border-dashed border-line-dash bg-white p-4 lg:p-5">
        {head}
        <span className="text-[13px] text-ink-3">{plural(c.chaptersTotal, 'chapter')}</span>
        <span className="mt-auto flex items-center justify-between gap-3">
          <span className="text-xs text-ink-3">Not enrolled</span>
          <button type="button" onClick={onEnroll} className="btn-secondary h-10 w-[112px] text-[13px]" aria-label={`Enroll in ${c.name}`}>
            Enroll
          </button>
        </span>
      </div>
    );
  }

  return (
    <Link to={`/courses/${c.courseId}`} className="card flex min-h-[176px] flex-col gap-3 rounded-2xl p-4 hover:border-line-strong lg:p-5">
      {head}
      <span className="flex flex-col gap-1.5">
        <span className="flex justify-between text-[13px]">
          <span className="text-ink-3">
            {c.chaptersDone} of {plural(c.chaptersTotal, 'chapter')}
          </span>
          <span className="font-bold">{c.progress}%</span>
        </span>
        <ProgressBar value={c.progress} label={`${c.name} progress`} height="h-1.5" />
      </span>
      <span className="mt-auto flex items-center justify-between gap-3">
        <span className={cx('text-xs', soon ? 'font-semibold text-warn-text' : 'text-ink-3')}>
          {c.validUntil ? (soon ? `Ends in ${c.daysLeft} days` : `Till ${formatDate(c.validUntil)}`) : ''}
        </span>
        <span className={cx('h-10 w-[112px] text-[13px]', action === 'Continue' ? 'btn-primary' : 'btn-secondary')}>{action}</span>
      </span>
    </Link>
  );
}

/** Exam countdown for this program: big card on desktop, one-line strip on phone. */
function ExamCountdown({ program, variant }: { program: ProgramSummary; variant: 'card' | 'strip' }) {
  const { data: account } = useAccount();
  const p = account?.profile;
  const target = program.subjects.find((s) => s.courseId === p?.targetCourseId);
  const days = target ? daysUntil(p?.targetExamDate ? `${p.targetExamDate}T00:00:00` : null) : null;

  if (variant === 'strip') {
    return (
      <Link to="/profile?edit=1" className="flex min-h-12 items-center gap-3 rounded-2xl bg-navy px-4 py-2.5 text-white lg:hidden">
        <CalendarDays aria-hidden className="size-[18px] shrink-0 text-navy-text" />
        <span className="flex-1 text-sm font-semibold">
          {target && days !== null ? (
            <>
              {program.short} {target.name} exam · <strong className="font-extrabold">{days} days left</strong>
            </>
          ) : (
            `Add your ${program.name} exam date`
          )}
        </span>
        <ChevronRight aria-hidden className="size-[18px] text-navy-text" />
      </Link>
    );
  }

  return (
    <section aria-labelledby="exam-h" className="flex flex-col gap-4 rounded-card bg-navy p-6 text-white">
      <h2 id="exam-h" className="flex items-center gap-2 text-[13px] font-semibold text-navy-text">
        <CalendarDays aria-hidden className="size-4" />
        Your next exam
      </h2>
      {target && days !== null && p?.targetExamDate ? (
        <>
          <div>
            <p className="text-[15px] font-semibold text-navy-text">
              {program.name} · {target.name}
            </p>
            <p className="mt-1.5 flex items-baseline gap-2">
              <span className="text-[52px] font-extrabold leading-none tracking-tight">{days}</span>
              <span className="text-base font-semibold text-navy-text">days to go</span>
            </p>
            <p className="mt-2 text-sm text-navy-text">Exam date: {formatDate(`${p.targetExamDate}T00:00:00`)}</p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-[13px] text-navy-text">
              <span>{target.name} completed</span>
              <span className="font-bold text-white">{target.progress}%</span>
            </div>
            <ProgressBar value={target.progress} label={`${target.name} completed`} barClassName="bg-white" trackClassName="bg-navy-3" />
          </div>
          <Link to="/profile?edit=1" className="btn border border-navy-4 text-white hover:bg-navy-2">
            Change exam date
          </Link>
        </>
      ) : (
        <>
          <p className="text-lg font-bold">Add your {program.name} exam date to see a countdown here.</p>
          <Link to="/profile?edit=1" className="btn border border-navy-4 text-white hover:bg-navy-2">
            Add exam date
          </Link>
        </>
      )}
    </section>
  );
}

/** Mock test summary for the subjects in this program. */
function MockSummary({ program }: { program: ProgramSummary }) {
  const { data } = useMockTests();
  const ids = new Set(program.subjects.map((s) => s.courseId));
  const tests: MockTest[] = (data ?? []).filter((t) => ids.has(t.courseId));
  if (tests.length === 0) return null;
  const mocks = tests.filter((t) => t.kind === 'full_mock');
  const attempted = mocks.filter((t) => t.attempts > 0);
  const avg = attempted.length ? Math.round(attempted.reduce((a, t) => a + (t.lastPercent ?? 0), 0) / attempted.length) : null;
  const subjects = new Set(tests.map((t) => t.courseShort.replace(/^(CMA|CPA)\s*/, ''))).size;

  const stats = [
    { v: String(mocks.length), l: 'Full mocks' },
    { v: String(attempted.length), l: 'Attempted' },
    { v: avg === null ? '—' : `${avg}%`, l: 'Average score' },
  ];

  return (
    <section aria-labelledby="mocks-h" className="card flex flex-col gap-4 p-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between lg:gap-6 lg:p-6">
      <div className="flex min-w-0 items-center gap-3 lg:flex-[1_1_240px]">
        <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <ClipboardList className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 id="mocks-h" className="text-base font-extrabold lg:text-lg">
            {program.name} mock tests
          </h2>
          <p className="text-[13px] text-ink-3">Full-length, exam-style tests for {plural(subjects, program.slug === 'cma-usa' ? 'part' : 'subject')}</p>
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-2 lg:flex lg:gap-8">
        {stats.map((s) => (
          <div key={s.l} className="flex flex-col rounded-xl bg-mist-4 px-3 py-2 lg:bg-transparent lg:p-0">
            <dt className="order-2 text-xs text-ink-3">{s.l}</dt>
            <dd className="order-1 text-xl font-extrabold">{s.v}</dd>
          </div>
        ))}
      </dl>
      <Link to="/mock-tests" className="btn-primary w-full lg:w-[160px]">
        Go to mock tests
      </Link>
    </section>
  );
}

export default function Program() {
  const { slug } = useParams();
  const toast = useToast();
  const catalog = useCatalog();
  const program = useMemo(() => summarizePrograms(catalog.data ?? []).find((p) => p.slug === slug), [catalog.data, slug]);

  if (catalog.isLoading) return <PageLoader />;
  if (catalog.error) return <ErrorState error={catalog.error} onRetry={() => catalog.refetch()} />;
  if (slug === SKILLS_SLUG) return <Navigate to="/courses" replace />;
  if (!program)
    return (
      <EmptyState
        title="Course not found"
        text="This course may have been removed."
        action={
          <Link to="/courses" className="btn-primary">
            All courses
          </Link>
        }
      />
    );

  const enroll = () => toast.show(ENROLL_NOTE, 'info');
  const isCpa = program.slug === 'cpa-usa';
  const unit = program.slug === 'cma-usa' ? 'part' : 'subject';
  const groups = isCpa
    ? [
        { key: 'core', title: 'Core subjects', note: null as string | null, items: program.subjects.filter((s) => s.kind !== 'cpa_discipline') },
        { key: 'disc', title: 'Discipline subjects', note: 'Choose one discipline for the CPA exam.', items: program.subjects.filter((s) => s.kind === 'cpa_discipline') },
      ].filter((g) => g.items.length > 0)
    : [{ key: 'all', title: unit === 'part' ? 'Parts' : 'Subjects', note: null, items: program.subjects }];

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      {/* phone header */}
      <div className="-mt-2 grid grid-cols-[44px_1fr_44px] items-center lg:hidden">
        <Link to="/courses" aria-label="Back to courses" className="flex size-11 items-center justify-center rounded-xl">
          <ChevronLeft aria-hidden className="size-[22px]" />
        </Link>
        <p className="text-center text-[15px] font-bold">Courses</p>
      </div>

      <nav aria-label="Breadcrumb" className="hidden text-sm text-ink-3 lg:block">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link to="/" className="hover:text-ink">Home</Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link to="/courses" className="hover:text-ink">Courses</Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="font-semibold text-ink">{program.name}</li>
        </ol>
      </nav>

      {/* phone: exam countdown as one line */}
      <ExamCountdown program={program} variant="strip" />

      <section className="card flex flex-col gap-4 p-[18px] lg:flex-row lg:flex-wrap lg:items-end lg:justify-between lg:gap-6 lg:p-7">
        <div className="flex min-w-0 items-center gap-3.5 lg:flex-[1_1_420px]">
          <ProgramBadge slug={program.slug} short={program.short} size="lg" />
          <div className="min-w-0">
            <h1 className="text-[22px] font-extrabold leading-tight tracking-tight lg:text-[30px]">{program.name}</h1>
            <p className="mt-0.5 text-[13px] text-ink-3 lg:text-sm">
              {plural(program.subjects.length, unit)} · {program.enrolledCount ? `${program.enrolledCount} enrolled` : 'not enrolled yet'}
            </p>
          </div>
        </div>
        {program.enrolledCount > 0 && (
          <div className="flex flex-col gap-2 lg:max-w-[380px] lg:flex-[1_1_280px]">
            <div className="flex justify-between text-sm">
              <span className="text-ink-3">Overall progress</span>
              <span className="font-extrabold">{program.progress}%</span>
            </div>
            <ProgressBar value={program.progress} label={`${program.name} progress`} className="lg:h-2.5" />
            <div className="flex flex-wrap justify-between gap-2 text-[13px] text-ink-3">
              <span>
                {program.chaptersDone} of {plural(program.chaptersTotal, 'chapter')} done
              </span>
              {program.validUntil && <span>Access till {formatDate(program.validUntil)}</span>}
            </div>
          </div>
        )}
      </section>

      {/* desktop: subjects on the left, exam countdown on the right */}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6">
        <div className="flex flex-col gap-5">
          {groups.map((g) => (
            <section key={g.key} aria-labelledby={`g-${g.key}`} className="flex flex-col gap-2.5">
              <div>
                <h2 id={`g-${g.key}`} className="text-[17px] font-extrabold lg:text-lg">
                  {g.title}
                </h2>
                {g.note && <p className="mt-0.5 text-[13px] text-ink-3">{g.note}</p>}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:gap-4">
                {g.items.map((c) => (
                  <SubjectCard key={c.courseId} c={c} onEnroll={enroll} />
                ))}
              </div>
            </section>
          ))}
        </div>
        <aside className="hidden lg:sticky lg:top-8 lg:mt-[38px] lg:block">
          <ExamCountdown program={program} variant="card" />
        </aside>
      </div>

      <MockSummary program={program} />
    </div>
  );
}
