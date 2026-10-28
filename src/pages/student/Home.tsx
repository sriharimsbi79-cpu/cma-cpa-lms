import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, CalendarDays, ChevronRight, ClipboardList, FileText, Play, Search } from 'lucide-react';
import Notifications from '@/components/Notifications';
import { Avatar, CourseIcon, ErrorState, PageLoader, ProgressBar } from '@/components/ui';
import { useAccount, useCatalog, useFocusAreas, useRecentResults, useResume } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  cx,
  daysUntil,
  firstName,
  formatDate,
  formatLongToday,
  formatRelative,
  greeting,
  minutesLabel,
  pct,
} from '@/lib/format';
import type { CatalogCourse, Resume } from '@/lib/types';

const SOON_DAYS = 15;

const lowerFirst = (s: string) =>
  /^(Today|Yesterday|Just now)/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : /ago$/.test(s) ? s : `on ${s}`;

export function courseTitle(c: Pick<CatalogCourse, 'kind' | 'programName' | 'name'>) {
  return c.kind === 'skill' ? c.name : `${c.programName} · ${c.name}`;
}

function Header() {
  const { me } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    navigate(q.trim() ? `/courses?q=${encodeURIComponent(q.trim())}` : '/courses');
  };
  return (
    <>
      {/* phone */}
      <header className="flex items-center justify-between gap-3 lg:hidden">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand text-sm font-extrabold text-white">YA</span>
          <div>
            <p className="text-[13px] text-ink-3">{greeting()}</p>
            <h1 className="text-[22px] font-extrabold leading-tight">{firstName(me?.fullName)}</h1>
          </div>
        </div>
        <Notifications />
      </header>
      {/* desktop */}
      <header className="hidden flex-wrap items-center justify-between gap-4 lg:flex">
        <div>
          <p className="text-sm text-ink-3">{formatLongToday()}</p>
          <h1 className="mt-1 text-[28px] font-extrabold leading-tight tracking-tight">
            {greeting()}, {firstName(me?.fullName)}
          </h1>
        </div>
        <div className="flex min-w-0 flex-[0_1_460px] items-center gap-3">
          <form onSubmit={onSearch} role="search" className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-white px-3.5 text-ink-3">
            <Search aria-hidden className="size-[18px] shrink-0" />
            <input
              type="search"
              aria-label="Search courses"
              placeholder="Search chapters, videos, mocks"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full min-w-0 bg-transparent text-sm text-ink outline-none"
            />
          </form>
          <Notifications />
          <Link to="/profile" aria-label="Open profile">
            <Avatar name={me?.fullName} size={44} className="bg-brand text-white" />
          </Link>
        </div>
      </header>
    </>
  );
}

function ExpiryBanner({ courses }: { courses: CatalogCourse[] }) {
  const soon = courses
    .filter((c) => c.enrolled && c.daysLeft !== null && c.daysLeft <= SOON_DAYS)
    .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0))[0];
  if (!soon) return null;
  const name = soon.kind === 'skill' ? soon.name : soon.programName;
  const days = soon.daysLeft === 0 ? 'today' : `in ${soon.daysLeft} day${soon.daysLeft === 1 ? '' : 's'}`;
  return (
    <div role="status" className="flex items-center gap-3 rounded-2xl border border-warn-line bg-warn-bg py-2.5 pl-3.5 pr-2.5 text-warn-fg lg:gap-4 lg:px-[18px] lg:py-3.5">
      <AlertTriangle aria-hidden className="size-5 shrink-0" />
      <p className="flex-1 text-[13px] leading-snug lg:text-sm">
        <strong className="block font-bold lg:inline">
          {name} access ends {days}
        </strong>
        <span className="lg:hidden">Valid till {formatDate(soon.validUntil)}</span>
        <span className="hidden lg:inline">
          {' '}
          ({formatDate(soon.validUntil)}). Renew now so your classes and mocks are not interrupted.
        </span>
      </p>
      <Link to="/profile" className="btn-warn shrink-0 px-3.5 text-[13px] lg:px-[18px] lg:text-sm">
        <span className="lg:hidden">Renew</span>
        <span className="hidden lg:inline">Renew access</span>
      </Link>
    </div>
  );
}

function stepState(done: number, total: number) {
  if (total === 0) return { text: 'Not added yet', started: false, complete: false };
  if (done >= total) return { text: 'Done', started: true, complete: true };
  if (done > 0) return { text: `${done} of ${total}`, started: true, complete: false };
  return { text: 'Not started', started: false, complete: false };
}

function ContinueCard({ r }: { r: Resume }) {
  const v = stepState(r.videosDone, r.videosTotal);
  const e = stepState(r.ebooksDone, r.ebooksTotal);
  const t = stepState(r.testsDone, r.testsTotal);
  const current = !v.complete ? 'videos' : !e.complete ? 'ebook' : 'test';
  const steps = [
    { key: 'videos', n: 1, label: 'Videos', short: 'Videos', icon: Play, s: v, detail: v.started && !v.complete ? `In progress · ${v.text}` : v.text, mobile: v.text },
    { key: 'ebook', n: 2, label: 'eBook', short: 'eBook', icon: FileText, s: e, detail: e.complete ? 'Read' : e.text, mobile: e.complete ? 'Read' : e.text },
    { key: 'test', n: 3, label: 'Chapter test', short: 'Test', icon: ClipboardList, s: t, detail: t.complete ? 'Done' : t.text, mobile: t.complete ? 'Done' : t.text },
  ];
  const nv = r.nextVideo;
  const vNum = nv?.title.match(/^\d+(\.\d+)*/)?.[0];
  const resumeHref = nv ? `/chapters/${r.chapterId}?v=${nv.id}` : `/chapters/${r.chapterId}`;

  return (
    <section aria-labelledby="continue-h" className="card flex min-w-0 flex-[2_1_480px] flex-col gap-4 p-[18px] lg:gap-5 lg:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full bg-brand/10 px-3 py-1.5 text-xs font-bold text-brand lg:text-[13px]">Continue learning</span>
        {r.lastActivityAt && (
          <span className="text-xs text-ink-3 lg:text-[13px]">
            <span className="lg:hidden">{formatRelative(r.lastActivityAt, true)}</span>
            <span className="hidden lg:inline">Last studied {lowerFirst(formatRelative(r.lastActivityAt, true))}</span>
          </span>
        )}
      </div>
      <div>
        <p className="text-[13px] font-semibold text-ink-3 lg:text-sm">{r.courseLabel}</p>
        <h2 id="continue-h" className="mt-1 text-[19px] font-extrabold leading-tight lg:text-2xl">
          Chapter {r.chapterPosition} · {r.chapterTitle}
        </h2>
      </div>
      <ol aria-label="Chapter steps" className="grid grid-cols-3 gap-2 lg:grid-cols-[repeat(auto-fit,minmax(150px,1fr))] lg:gap-3">
        {steps.map((s) => {
          const on = s.key === current;
          return (
            <li
              key={s.key}
              className={cx(
                'flex flex-col gap-0.5 rounded-xl p-2.5 lg:gap-1 lg:p-3.5',
                on ? 'bg-brand/10' : 'border border-line',
              )}
            >
              <span className={cx('flex items-center gap-1.5 text-[13px] font-bold lg:gap-2 lg:text-sm', on ? 'text-brand' : 'text-ink')}>
                <s.icon aria-hidden className="size-3.5 lg:size-4" />
                <span className="lg:hidden">{s.short}</span>
                <span className="hidden lg:inline">
                  {s.n} · {s.label}
                </span>
              </span>
              <span className={cx('text-xs lg:text-[13px]', on ? 'text-ink-2' : 'text-ink-3')}>
                <span className="lg:hidden">{s.mobile}</span>
                <span className="hidden lg:inline">{s.detail}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-xs text-ink-3 lg:text-[13px]">
          <span>Chapter progress</span>
          <span className="font-bold text-ink">{r.progress}%</span>
        </div>
        <ProgressBar value={r.progress} label="Chapter progress" className="lg:h-2" height="h-1.5" />
      </div>

      {/* desktop: next up + two buttons */}
      <div className="hidden flex-wrap items-center justify-between gap-4 lg:flex">
        {nv ? (
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-navy text-white">
              <Play aria-hidden className="size-5 fill-current" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-[13px] text-ink-3">Next up</span>
              <span className="text-[15px] font-bold">
                Video {nv.title}
                {nv.durationSeconds ? ` · ${minutesLabel(nv.durationSeconds)}` : ''}
              </span>
            </span>
          </div>
        ) : (
          <p className="text-sm text-ink-3">All videos in this chapter are watched.</p>
        )}
        <div className="flex flex-wrap gap-2.5">
          <Link to={`/courses/${r.courseId}`} className="btn-secondary">
            All chapters
          </Link>
          <Link to={resumeHref} className="btn-primary px-5">
            {nv ? 'Resume video' : 'Open chapter'}
            <ChevronRight aria-hidden className="size-4" />
          </Link>
        </div>
      </div>
      {/* phone: one big button */}
      <Link to={resumeHref} className="btn-primary h-12 rounded-xl text-[15px] lg:hidden">
        <Play aria-hidden className="size-4 fill-current" />
        {nv ? `Resume video${vNum ? ` ${vNum}` : ''}` : 'Open chapter'}
      </Link>
    </section>
  );
}

function StartCard({ hasCourses }: { hasCourses: boolean }) {
  return (
    <section className="card flex flex-[2_1_480px] flex-col items-start gap-3 p-7">
      <span className="rounded-full bg-brand/10 px-3 py-1.5 text-[13px] font-bold text-brand">Get started</span>
      <h2 className="text-2xl font-extrabold">{hasCourses ? 'Start your first chapter' : 'You are not enrolled in a course yet'}</h2>
      <p className="text-sm text-ink-3">
        {hasCourses ? 'Open a course and begin with chapter 1.' : 'Pick a course to see its chapters, videos and mock tests.'}
      </p>
      <Link to="/courses" className="btn-primary">
        {hasCourses ? 'Go to my courses' : 'Explore courses'}
      </Link>
    </section>
  );
}

function ExamCard({ courses }: { courses: CatalogCourse[] }) {
  const { data: account } = useAccount();
  const p = account?.profile;
  const days = daysUntil(p?.targetExamDate ? `${p.targetExamDate}T00:00:00` : null);
  const course = courses.find((c) => c.courseId === p?.targetCourseId);
  const label = course ? courseTitle(course) : p?.targetCourseLabel;

  if (!p?.targetExamDate || days === null) {
    return (
      <section aria-labelledby="exam-h" className="flex flex-[1_1_260px] flex-col gap-3 rounded-card bg-navy p-5 text-white lg:p-7">
        <h2 id="exam-h" className="flex items-center gap-2 text-[13px] font-semibold text-navy-text">
          <CalendarDays aria-hidden className="size-4" />
          Your next exam
        </h2>
        <p className="text-lg font-bold">Add your exam date to see a countdown here.</p>
        <Link to="/profile?edit=1" className="btn mt-auto border border-navy-4 text-white hover:bg-navy-2">
          Add exam date
        </Link>
      </section>
    );
  }

  return (
    <>
      {/* phone */}
      <section aria-label="Your next exam" className="flex w-full items-center gap-4 rounded-card bg-navy p-4 text-white lg:hidden">
        <div className="flex size-20 shrink-0 flex-col items-center justify-center rounded-2xl bg-navy-2">
          <span className="text-[30px] font-extrabold leading-none">{days}</span>
          <span className="text-xs text-navy-text">days left</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold">{course ? `${course.programShort} ${course.name}` : label} exam</p>
          <p className="mb-2.5 mt-0.5 text-[13px] text-navy-text">
            {formatDate(`${p.targetExamDate}T00:00:00`)}
            {course ? ` · ${course.progress}% of ${course.name} done` : ''}
          </p>
          {course && <ProgressBar value={course.progress} label="Course completed" barClassName="bg-white" trackClassName="bg-navy-3" height="h-1.5" />}
        </div>
      </section>
      {/* desktop */}
      <section aria-labelledby="exam-h" className="hidden min-w-0 flex-[1_1_260px] flex-col gap-4 rounded-card bg-navy p-7 text-white lg:flex">
        <h2 id="exam-h" className="flex items-center gap-2 text-[13px] font-semibold text-navy-text">
          <CalendarDays aria-hidden className="size-4" />
          Your next exam
        </h2>
        <div>
          <p className="text-[15px] font-semibold text-navy-text">{label}</p>
          <p className="mt-1.5 flex items-baseline gap-2">
            <span className="text-[56px] font-extrabold leading-none tracking-tight">{days}</span>
            <span className="text-base font-semibold text-navy-text">days to go</span>
          </p>
          <p className="mt-2.5 text-sm text-navy-text">Exam date: {formatDate(`${p.targetExamDate}T00:00:00`)}</p>
        </div>
        {course && (
          <div className="mt-auto flex flex-col gap-2">
            <div className="flex justify-between text-[13px] text-navy-text">
              <span>{course.name} completed</span>
              <span className="font-bold text-white">{course.progress}%</span>
            </div>
            <ProgressBar value={course.progress} label={`${course.name} completed`} barClassName="bg-white" trackClassName="bg-navy-3" />
          </div>
        )}
        <Link to="/profile?edit=1" className={cx('btn border border-navy-4 text-white hover:bg-navy-2', !course && 'mt-auto')}>
          Change exam date
        </Link>
      </section>
    </>
  );
}

function MyCourses({ courses }: { courses: CatalogCourse[] }) {
  const mine = courses.filter((c) => c.enrolled);
  return (
    <section aria-labelledby="courses-h" className="flex flex-col gap-2 lg:gap-4">
      <div className="flex items-center justify-between">
        <h2 id="courses-h" className="text-[17px] font-extrabold lg:text-xl">
          My courses
        </h2>
        <Link to="/courses" className="link-brand">
          <span className="lg:hidden">See all</span>
          <span className="hidden lg:inline">View all</span>
        </Link>
      </div>
      {mine.length === 0 ? (
        <p className="card p-5 text-sm text-ink-3">No active courses. Explore courses to enroll.</p>
      ) : (
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-[repeat(auto-fit,minmax(240px,1fr))] sm:gap-4 sm:overflow-visible sm:px-0">
          {mine.map((c) => {
            const unit = c.kind === 'skill' ? 'modules' : 'chapters';
            const soon = c.daysLeft !== null && c.daysLeft <= SOON_DAYS;
            return (
              <Link
                key={c.courseId}
                to={`/courses/${c.courseId}`}
                className="card flex w-[200px] shrink-0 flex-col gap-2.5 rounded-2xl p-3.5 hover:border-line-strong sm:w-auto sm:gap-3.5 sm:p-5"
              >
                <span className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
                  <CourseIcon kind={c.kind} code={c.code} size={40} />
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm font-bold sm:text-[15px]">{courseTitle(c)}</span>
                    <span className="text-xs text-ink-3 sm:hidden">
                      {c.chaptersDone} of {c.chaptersTotal} {unit}
                    </span>
                    <span className="hidden text-[13px] leading-snug text-ink-3 sm:block">{c.kind === 'skill' ? 'Technical skills' : c.fullName}</span>
                  </span>
                </span>
                <span className="flex flex-col gap-1.5">
                  <span className="hidden justify-between text-[13px] sm:flex">
                    <span className="text-ink-3">
                      {c.chaptersDone} of {c.chaptersTotal} {unit}
                    </span>
                    <span className="font-bold">{c.progress}%</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <ProgressBar value={c.progress} label={`${courseTitle(c)} progress`} height="h-1.5" className="flex-1" />
                    <span className="text-xs font-bold sm:hidden">{c.progress}%</span>
                  </span>
                </span>
                <span className="mt-auto hidden items-center justify-between text-[13px] sm:flex">
                  {soon ? (
                    <span className="font-semibold text-warn-text">Ends in {c.daysLeft} days</span>
                  ) : (
                    <span className="text-ink-3">Valid till {formatDate(c.validUntil)}</span>
                  )}
                  <span className="font-bold text-brand">Continue</span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

function RecentResults() {
  const { data } = useRecentResults(5);
  const rows = data ?? [];
  return (
    <section aria-labelledby="results-h" className="card flex min-w-0 flex-[2_1_480px] flex-col px-[18px] pb-2 pt-1.5 lg:gap-2 lg:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id="results-h" className="text-[17px] font-extrabold lg:text-lg">
          <span className="lg:hidden">Recent results</span>
          <span className="hidden lg:inline">Recent test results</span>
        </h2>
        <Link to="/mock-tests" className="link-brand">
          <span className="lg:hidden">All tests</span>
          <span className="hidden lg:inline">All mock tests</span>
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="pb-4 text-sm text-ink-3">No test results yet. Take a chapter test to see your scores here.</p>
      ) : (
        <>
          <ul className="lg:hidden">
            {rows.map((r) => (
              <li key={r.attemptId} className="flex items-center justify-between gap-3 border-t border-line-soft py-2.5">
                <span className="flex flex-col">
                  <span className="text-sm font-bold">{r.title}</span>
                  <span className="text-xs text-ink-3">
                    {r.courseLabel} · {formatDate(r.submittedAt)}
                  </span>
                </span>
                <span className="text-[17px] font-extrabold">{pct(r.percent)}</span>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-[13px] text-ink-3">
                  <th scope="col" className="border-b border-line py-2.5 pr-3 font-semibold">Test</th>
                  <th scope="col" className="border-b border-line px-3 py-2.5 font-semibold">Course</th>
                  <th scope="col" className="border-b border-line px-3 py-2.5 font-semibold">Date</th>
                  <th scope="col" className="border-b border-line px-3 py-2.5 font-semibold">Score</th>
                  <th scope="col" className="border-b border-line py-2.5">
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.attemptId}>
                    <td className={cx('py-2.5 pr-3 font-semibold', i < rows.length - 1 && 'border-b border-line-soft')}>{r.title}</td>
                    <td className={cx('px-3 py-2.5 text-ink-2', i < rows.length - 1 && 'border-b border-line-soft')}>{r.courseLabel}</td>
                    <td className={cx('px-3 py-2.5 text-ink-2', i < rows.length - 1 && 'border-b border-line-soft')}>{formatDate(r.submittedAt)}</td>
                    <td className={cx('px-3 py-2.5 font-extrabold', i < rows.length - 1 && 'border-b border-line-soft')}>{pct(r.percent)}</td>
                    <td className={cx('text-right', i < rows.length - 1 && 'border-b border-line-soft')}>
                      <Link to={`/results/${r.attemptId}`} className="link-brand">
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function FocusAreas() {
  const { data } = useFocusAreas(3);
  const rows = data ?? [];
  return (
    <section aria-labelledby="focus-h" className="card flex min-w-0 flex-[1_1_260px] flex-col gap-3.5 p-[18px] lg:p-6">
      <div>
        <h2 id="focus-h" className="text-[17px] font-extrabold lg:text-lg">
          Focus areas
        </h2>
        <p className="mt-1 text-[13px] text-ink-3">Topics where your test scores are lowest</p>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-ink-3">Take a test to see the topics to work on.</p>
      ) : (
        <ul className="flex flex-col gap-3.5">
          {rows.map((f) => {
            const weak = f.percent < 60;
            return (
              <li key={`${f.label}-${f.courseLabel}`} className="flex flex-col gap-1.5">
                <span className="flex justify-between gap-2 text-sm">
                  <span className="font-semibold">{f.label}</span>
                  <span className="font-extrabold">{pct(f.percent)}</span>
                </span>
                <ProgressBar
                  value={f.percent}
                  label={`${f.label} score`}
                  height="h-1.5"
                  barClassName={weak ? 'bg-warn-strong' : 'bg-brand'}
                  trackClassName={weak ? 'bg-warn-track' : 'bg-mist-3'}
                />
                <span className="text-xs text-ink-3">
                  {f.courseLabel}
                  {f.chapterLabel ? ` · ${f.chapterLabel}` : ''}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default function Home() {
  const catalog = useCatalog();
  const resume = useResume();
  const courses = useMemo(() => catalog.data ?? [], [catalog.data]);

  if (catalog.isLoading || resume.isLoading) return <PageLoader />;
  if (catalog.error) return <ErrorState error={catalog.error} onRetry={() => catalog.refetch()} />;

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <Header />
      <ExpiryBanner courses={courses} />
      <div className="flex flex-wrap gap-4 lg:gap-6">
        {resume.data ? <ContinueCard r={resume.data} /> : <StartCard hasCourses={courses.some((c) => c.enrolled)} />}
        <ExamCard courses={courses} />
      </div>
      <MyCourses courses={courses} />
      <div className="flex flex-wrap gap-4 lg:gap-6">
        <RecentResults />
        <FocusAreas />
      </div>
    </div>
  );
}
