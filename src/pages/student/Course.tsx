import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, Lock, LockOpen } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { EmptyState, ErrorState, PageLoader, ProgressBar } from '@/components/ui';
import { useCatalog, useCourseChapters } from '@/lib/api';
import { cx, formatDate, plural } from '@/lib/format';
import { parentHref } from '@/lib/programs';
import type { CatalogCourse, ChapterRow } from '@/lib/types';
import { ENROLL_NOTE } from './Courses';

function SiblingTabs({ course, siblings }: { course: CatalogCourse; siblings: CatalogCourse[] }) {
  if (siblings.length < 2) return null;
  const segmented = siblings.length <= 3;
  return (
    <>
      {/* phone */}
      <div
        role="group"
        aria-label={`Choose ${course.programName} course`}
        className={cx(
          'lg:hidden',
          segmented
            ? 'grid gap-1 rounded-[14px] bg-mist-2 p-1'
            : 'no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4',
        )}
        style={segmented ? { gridTemplateColumns: `repeat(${siblings.length}, minmax(0, 1fr))` } : undefined}
      >
        {siblings.map((s) => {
          const on = s.courseId === course.courseId;
          return (
            <Link
              key={s.courseId}
              to={`/courses/${s.courseId}`}
              aria-current={on ? 'page' : undefined}
              className={cx(
                'flex h-11 shrink-0 items-center justify-center gap-1 text-sm',
                segmented ? 'rounded-[11px]' : 'rounded-full border px-4',
                on
                  ? segmented
                    ? 'bg-white font-bold text-ink'
                    : 'border-brand bg-brand font-bold text-white'
                  : segmented
                    ? 'font-semibold text-ink-2'
                    : 'border-line-strong bg-white font-semibold text-ink-2',
              )}
            >
              {s.name}
              {!s.enrolled && <Lock aria-hidden className="size-3" />}
            </Link>
          );
        })}
      </div>
      {/* desktop */}
      <div className="hidden flex-wrap gap-2 lg:flex">
        {siblings.map((s) => {
          const on = s.courseId === course.courseId;
          return (
            <Link
              key={s.courseId}
              to={`/courses/${s.courseId}`}
              aria-current={on ? 'page' : undefined}
              className={cx(
                'inline-flex h-11 items-center gap-1.5 rounded-full px-5 text-sm font-bold',
                on ? 'bg-brand text-white' : 'bg-mist text-ink hover:bg-mist-2',
              )}
            >
              {s.name}
              {!s.enrolled && <Lock aria-hidden className="size-3.5" />}
            </Link>
          );
        })}
      </div>
    </>
  );
}

type PillTone = 'ok' | 'brand' | 'outline';
const pillCls: Record<PillTone, string> = {
  ok: 'bg-ok-bg text-ok-fg',
  brand: 'bg-brand/10 text-brand font-bold',
  outline: 'border border-line-strong text-ink-2',
};

function chapterPills(ch: ChapterRow, mobile: boolean): { text: string; tone: PillTone }[] {
  const inProgress = ch.recommended && !ch.complete;
  const videosDone = ch.videosDone >= ch.videosTotal && ch.videosTotal > 0;
  return [
    {
      text: mobile ? `${ch.videosDone}/${ch.videosTotal} videos` : `Videos ${ch.videosDone}/${ch.videosTotal}`,
      tone: videosDone ? 'ok' : ch.videosDone > 0 || inProgress ? 'brand' : 'outline',
    },
    {
      text: ch.ebooksDone > 0 ? 'eBook read' : inProgress && !mobile ? 'eBook not started' : 'eBook',
      tone: ch.ebooksDone > 0 ? 'ok' : 'outline',
    },
    {
      text: ch.testsDone > 0 ? `Test ${ch.bestTest !== null ? `${Math.round(ch.bestTest)}%` : 'done'}` : inProgress && !mobile ? 'Test not attempted' : 'Test',
      tone: ch.testsDone > 0 ? 'ok' : 'outline',
    },
  ];
}

function StatusCircle({ ch, size }: { ch: ChapterRow; size: 'sm' | 'lg' }) {
  const dim = size === 'lg' ? 'size-11 text-base' : 'size-10 text-[15px]';
  if (ch.complete)
    return (
      <span aria-label="Completed" className={cx('flex shrink-0 items-center justify-center rounded-full bg-ok-bg text-ok-fg', dim)}>
        <Check aria-hidden className="size-5" strokeWidth={2.6} />
      </span>
    );
  return (
    <span
      aria-label={ch.recommended ? 'Recommended next' : undefined}
      className={cx(
        'flex shrink-0 items-center justify-center rounded-full font-extrabold',
        dim,
        ch.recommended ? 'bg-brand text-white' : 'bg-mist text-ink-2',
      )}
    >
      {ch.position}
    </span>
  );
}

function ChapterItem({ ch }: { ch: ChapterRow }) {
  const label = ch.complete ? 'Review' : ch.recommended || ch.progress > 0 ? 'Continue' : 'Start';
  const meta = `${plural(ch.videosTotal, 'video')}${ch.ebooksTotal ? ' · eBook' : ''}${ch.testsTotal ? ' · Chapter test' : ''}`;
  return (
    <li>
      {/* phone */}
      <Link
        to={`/chapters/${ch.id}`}
        className={cx(
          'flex items-center gap-3 rounded-2xl bg-white lg:hidden',
          ch.recommended ? 'border-2 border-brand p-[13px]' : 'border border-line p-3.5',
        )}
      >
        <StatusCircle ch={ch} size="sm" />
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          {ch.recommended && <span className="self-start rounded-full bg-brand/10 px-2 py-0.5 text-xs font-bold text-brand">Recommended next</span>}
          <span className="text-sm font-bold leading-snug">
            {ch.position} · {ch.title}
          </span>
          <span className="flex flex-wrap gap-1.5">
            {chapterPills(ch, true).map((p) => (
              <span key={p.text} className={cx('rounded-full px-2 py-0.5 text-xs font-semibold', pillCls[p.tone])}>
                {p.text}
              </span>
            ))}
          </span>
        </span>
        <ChevronRight aria-hidden className="size-[18px] shrink-0 text-ink-3" />
      </Link>
      {/* desktop */}
      <div
        className={cx(
          'hidden flex-wrap items-center gap-x-6 gap-y-4 rounded-2xl bg-white lg:flex',
          ch.recommended ? 'border-2 border-brand px-[23px] py-[19px]' : 'border border-line px-6 py-5',
        )}
      >
        <StatusCircle ch={ch} size="lg" />
        <div className="min-w-0 flex-[1_1_280px]">
          {ch.recommended && <span className="mb-1.5 inline-flex rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-bold text-brand">Recommended next</span>}
          <h3 className="text-base font-bold">
            {ch.position} · {ch.title}
          </h3>
          <p className="mt-1 text-[13px] text-ink-3">{meta}</p>
        </div>
        <ul aria-label={`Chapter ${ch.position} steps`} className="flex flex-wrap gap-2">
          {chapterPills(ch, false).map((p) => (
            <li key={p.text} className={cx('rounded-full px-3 py-1.5 text-[13px] font-semibold', pillCls[p.tone])}>
              {p.text}
            </li>
          ))}
        </ul>
        <Link to={`/chapters/${ch.id}`} className={cx('w-32', label === 'Continue' ? 'btn-primary' : 'btn-secondary')}>
          {label}
        </Link>
      </div>
    </li>
  );
}

export default function Course() {
  const { courseId } = useParams();
  const toast = useToast();
  const catalog = useCatalog();
  const course = catalog.data?.find((c) => c.courseId === courseId);
  const chapters = useCourseChapters(course?.enrolled ? courseId : undefined);
  const siblings = useMemo(
    () => (catalog.data ?? []).filter((c) => c.programId === course?.programId && c.kind !== 'skill'),
    [catalog.data, course?.programId],
  );

  if (catalog.isLoading || (course?.enrolled && chapters.isLoading)) return <PageLoader />;
  if (catalog.error) return <ErrorState error={catalog.error} onRetry={() => catalog.refetch()} />;
  if (!course) return <EmptyState title="Course not found" text="This course may have been removed." action={<Link to="/courses" className="btn-primary">All courses</Link>} />;
  if (chapters.error) return <ErrorState error={chapters.error} onRetry={() => chapters.refetch()} />;

  const rows = chapters.data ?? [];
  const title = course.kind === 'skill' ? course.name : `${course.programName} · ${course.name}`;
  const unit = course.kind === 'skill' ? 'module' : 'chapter';
  const totals = rows.reduce(
    (a, r) => ({ v: a.v + r.videosTotal, e: a.e + r.ebooksTotal, t: a.t + r.testsTotal }),
    { v: 0, e: 0, t: 0 },
  );

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      {/* phone header */}
      <div className="-mt-2 grid grid-cols-[44px_1fr_44px] items-center lg:hidden">
        <Link to={parentHref(course)} aria-label={course.kind === 'skill' ? 'Back to courses' : `Back to ${course.programName}`} className="flex size-11 items-center justify-center rounded-xl">
          <ChevronLeft aria-hidden className="size-[22px]" />
        </Link>
        <p className="text-center text-[15px] font-bold">{course.kind === 'skill' ? 'Technical skills' : course.programName}</p>
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
          {course.kind !== 'skill' && (
            <>
              <li aria-hidden>/</li>
              <li>
                <Link to={parentHref(course)} className="hover:text-ink">{course.programName}</Link>
              </li>
            </>
          )}
          <li aria-hidden>/</li>
          <li aria-current="page" className="font-semibold text-ink">{course.name}</li>
        </ol>
      </nav>

      <section className="flex flex-col gap-3 lg:card lg:flex-row lg:flex-wrap lg:items-end lg:justify-between lg:gap-6 lg:p-7">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-[1_1_460px] lg:gap-3.5">
          <SiblingTabs course={course} siblings={siblings} />
          <h1 className="text-[21px] font-extrabold leading-tight tracking-tight lg:text-[30px]">{course.fullName ?? course.name}</h1>
          <p className="hidden text-sm text-ink-3 lg:block">
            {title} · {plural(rows.length || course.chaptersTotal, unit)}
            {course.enrolled && ` · ${plural(totals.v, 'video')} · ${plural(totals.e, 'eBook')} · ${plural(totals.t, `${unit} test`)}`}
          </p>
        </div>
        {course.enrolled && (
          <div className="flex flex-col gap-2 lg:max-w-[380px] lg:flex-[1_1_280px] lg:gap-2.5">
            <div className="hidden justify-between text-sm lg:flex">
              <span className="text-ink-3">{course.name} progress</span>
              <span className="font-extrabold">{course.progress}%</span>
            </div>
            <div className="flex items-center gap-2.5">
              <ProgressBar value={course.progress} label={`${course.name} progress`} className="flex-1 lg:h-2.5" />
              <span className="text-sm font-extrabold lg:hidden">{course.progress}%</span>
            </div>
            <div className="flex flex-wrap justify-between gap-2 text-[13px] text-ink-3">
              <span>
                {course.chaptersDone} of {plural(course.chaptersTotal, unit)} done
              </span>
              <span>Access till {formatDate(course.validUntil)}</span>
            </div>
          </div>
        )}
      </section>

      {!course.enrolled ? (
        <section className="card flex flex-col items-start gap-3 p-6">
          <span className="flex items-center gap-2 text-base font-extrabold">
            <Lock aria-hidden className="size-5 text-ink-3" />
            You are not enrolled in {title}
          </span>
          <p className="text-sm text-ink-3">
            {course.examFormat ? `Exam format: ${course.examFormat}. ` : ''}Enroll to unlock the videos, eBooks, chapter tests and mock tests.
          </p>
          <button type="button" className="btn-primary" onClick={() => toast.show(ENROLL_NOTE, 'info')}>
            Enroll
          </button>
        </section>
      ) : (
        <>
          <div className="hidden items-center gap-3 rounded-2xl bg-brand/10 px-[18px] py-3.5 text-sm text-ink-2 lg:flex">
            <LockOpen aria-hidden className="size-5 shrink-0 text-brand" />
            <p>
              <strong className="font-bold">All {unit}s are open.</strong> Study in any order. We highlight the {unit} we suggest next.
            </p>
          </div>

          <section aria-labelledby="ch-h" className="flex flex-col gap-3">
            <h2 id="ch-h" className="sr-only text-xl font-extrabold lg:not-sr-only lg:mt-2">
              {unit === 'module' ? 'Modules' : 'Chapters'}
            </h2>
            {rows.length === 0 ? (
              <p className="card p-6 text-sm text-ink-3">No {unit}s are published yet.</p>
            ) : (
              <ol className="flex flex-col gap-2.5 lg:gap-3">
                {rows.map((ch) => (
                  <ChapterItem key={ch.id} ch={ch} />
                ))}
              </ol>
            )}
          </section>

          {course.kind !== 'skill' && (
            <Link
              to="/mock-tests"
              className="flex flex-wrap items-center gap-4 rounded-card bg-navy p-4 text-white lg:justify-between lg:px-7 lg:py-6"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[15px] font-bold lg:text-lg lg:font-extrabold">
                  <span className="lg:hidden">{course.name} full-length mocks</span>
                  <span className="hidden lg:inline">Ready for a full-length {course.name} mock?</span>
                </span>
                <span className="mt-0.5 text-[13px] text-navy-text lg:mt-1.5 lg:text-sm">
                  {course.examFormat ?? 'Exam-style timed test'}
                  <span className="hidden lg:inline">, same format as the real exam.</span>
                </span>
              </span>
              <span className="hidden h-11 items-center rounded-[10px] bg-white px-5 text-sm font-bold text-navy lg:inline-flex">Go to mock tests</span>
              <ChevronRight aria-hidden className="size-[18px] lg:hidden" />
            </Link>
          )}
        </>
      )}
    </div>
  );
}
