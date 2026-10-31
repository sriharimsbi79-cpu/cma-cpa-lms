import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, Layers, Lock, X } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { ErrorState, PageLoader, ProgressBar } from '@/components/ui';
import { useCatalog } from '@/lib/api';
import { cx, formatDate } from '@/lib/format';
import { programHref, SKILLS_SLUG, summarizePrograms, type ProgramSummary } from '@/lib/programs';
import type { CatalogCourse } from '@/lib/types';

const SOON_DAYS = 15;

export const ENROLL_NOTE = 'Online enrolment opens here once payments are connected. Please contact the academy to enroll.';

export function ProgramBadge({ slug, short, size = 'sm' }: { slug: string; short: string; size?: 'sm' | 'lg' }) {
  const dim = size === 'lg' ? 'size-11 rounded-xl text-[13px]' : 'size-8 rounded-[9px] text-[11px]';
  if (slug === SKILLS_SLUG) {
    return (
      <span aria-hidden className={cx('flex shrink-0 items-center justify-center bg-mist-2 text-navy', dim)}>
        <Layers className={size === 'lg' ? 'size-5' : 'size-4'} />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cx(
        'flex shrink-0 items-center justify-center font-extrabold',
        dim,
        slug === 'cma-usa' ? 'bg-brand/10 text-brand' : 'bg-mist-2 text-navy',
      )}
    >
      {short}
    </span>
  );
}

export function RowCard({ c, onEnroll, showProgram }: { c: CatalogCourse; onEnroll: () => void; showProgram?: boolean }) {
  const name = showProgram && c.programSlug !== SKILLS_SLUG ? `${c.programName} · ${c.name}` : c.name;
  if (!c.enrolled) {
    return (
      <div className="flex items-center gap-3.5 rounded-2xl border border-dashed border-line-dash bg-white px-4 py-3.5">
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-mist text-ink-3">
          <Lock className="size-[18px]" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[15px] font-bold">{name}</span>
          <span className="text-xs text-ink-3">Not enrolled</span>
        </span>
        <button type="button" onClick={onEnroll} className="btn-primary px-4">
          Enroll
        </button>
      </div>
    );
  }
  const unit = c.kind === 'skill' ? 'modules' : 'chapters';
  return (
    <Link to={`/courses/${c.courseId}`} className="card flex items-center gap-3.5 rounded-2xl px-4 py-3.5 hover:border-line-strong">
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="text-[15px] font-bold">{name}</span>
        <span className="text-xs text-ink-3">
          {c.kind === 'skill' ? `${c.chaptersDone} of ${c.chaptersTotal} ${unit} · till ${formatDate(c.validUntil)}` : c.fullName}
        </span>
        <span className="flex items-center gap-2">
          <ProgressBar value={c.progress} label={`${c.name} progress`} height="h-1.5" className="flex-1" />
          <span className="text-xs font-bold">{c.progress}%</span>
        </span>
      </span>
      <ChevronRight aria-hidden className="size-[18px] text-ink-3" />
    </Link>
  );
}

export function SectionCard({ c, onEnroll }: { c: CatalogCourse; onEnroll: () => void }) {
  const tag = c.kind === 'cpa_discipline' ? 'DISCIPLINE' : 'CORE';
  const body = (
    <>
      <span className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-base font-extrabold">
          {c.name}
          {!c.enrolled && <Lock aria-hidden className="size-3.5 text-ink-3" />}
        </span>
        <span
          className={cx(
            'rounded-md px-1.5 py-0.5 text-[10px] font-bold',
            tag === 'DISCIPLINE' ? 'bg-brand/10 text-brand' : 'bg-mist text-ink-3',
          )}
        >
          {tag}
        </span>
      </span>
      <span className="text-xs leading-snug text-ink-3">{c.fullName}</span>
      {c.enrolled ? (
        <span className="mt-auto flex items-center gap-1.5">
          <ProgressBar value={c.progress} label={`${c.name} progress`} height="h-[5px]" className="flex-1" />
          <span className="text-xs font-bold">{c.progress}%</span>
        </span>
      ) : (
        <span className="mt-auto text-xs font-bold text-brand">Enroll</span>
      )}
    </>
  );
  return c.enrolled ? (
    <Link to={`/courses/${c.courseId}`} className="card flex min-h-[124px] flex-col gap-2 rounded-2xl p-3.5 hover:border-line-strong">
      {body}
    </Link>
  ) : (
    <button
      type="button"
      onClick={onEnroll}
      aria-label={`${c.name}, not enrolled. Enroll`}
      className="flex min-h-[124px] flex-col gap-2 rounded-2xl border border-dashed border-line-dash bg-white p-3.5 text-left"
    >
      {body}
    </button>
  );
}

export function ProgramCard({ p }: { p: ProgramSummary }) {
  const soon = p.daysLeft !== null && p.daysLeft <= SOON_DAYS;
  const unit = p.slug === 'cma-usa' ? 'part' : 'subject';
  return (
    <Link
      to={programHref(p.slug)}
      className="card flex flex-col gap-3.5 rounded-2xl p-4 hover:border-line-strong lg:p-5"
    >
      <span className="flex items-center gap-3">
        <ProgramBadge slug={p.slug} short={p.short} size="lg" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-base font-extrabold lg:text-lg">{p.name}</span>
          <span className="text-[13px] text-ink-3">
            {p.subjects.length} {unit}s{p.enrolledCount ? ` · ${p.enrolledCount} enrolled` : ' · not enrolled'}
          </span>
        </span>
        <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-3" />
      </span>
      <span className="flex flex-wrap gap-1.5">
        {p.subjects.map((s) => (
          <span
            key={s.courseId}
            className={cx(
              'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold',
              s.enrolled ? 'bg-mist text-ink-2' : 'border border-dashed border-line-dash text-ink-3',
            )}
          >
            {s.name}
            {!s.enrolled && <Lock aria-hidden className="size-3" />}
          </span>
        ))}
      </span>
      {p.enrolledCount > 0 && (
        <span className="flex flex-col gap-1.5">
          <span className="flex justify-between text-[13px]">
            <span className="text-ink-3">
              {p.chaptersDone} of {p.chaptersTotal} chapters
            </span>
            <span className="font-bold">{p.progress}%</span>
          </span>
          <ProgressBar value={p.progress} label={`${p.name} progress`} height="h-1.5" />
          {p.validUntil && (
            <span className={cx('text-xs', soon ? 'font-semibold text-warn-text' : 'text-ink-3')}>
              {soon ? `Ends in ${p.daysLeft} days` : `Valid till ${formatDate(p.validUntil)}`}
            </span>
          )}
        </span>
      )}
    </Link>
  );
}

export default function Courses() {
  const { data, isLoading, error, refetch } = useCatalog();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const q = (params.get('q') ?? '').trim().toLowerCase();

  const programs = useMemo(() => summarizePrograms(data ?? []), [data]);
  const matches = useMemo(
    () =>
      q
        ? (data ?? []).filter((c) => [c.name, c.fullName, c.programName, c.code].some((v) => (v ?? '').toLowerCase().includes(q)))
        : [],
    [data, q],
  );

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;

  const enroll = () => toast.show(ENROLL_NOTE, 'info');
  const exams = programs.filter((p) => p.slug !== SKILLS_SLUG);
  const skills = programs.find((p) => p.slug === SKILLS_SLUG);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-[26px] font-extrabold leading-tight tracking-tight lg:text-[28px]">Courses</h1>
        <p className="mt-1 text-sm text-ink-3">Open a course to see its subjects, then pick a subject to see its chapters.</p>
      </header>

      {q ? (
        <>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-ink-3">
              Showing results for <strong className="text-ink">“{params.get('q')}”</strong>
            </span>
            <button type="button" onClick={() => setParams({})} className="inline-flex h-9 items-center gap-1 rounded-lg px-2 font-bold text-brand hover:bg-brand/10">
              <X aria-hidden className="size-4" />
              Clear
            </button>
          </div>
          {matches.length === 0 ? (
            <p className="card p-6 text-sm text-ink-3">No courses match your search.</p>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {matches.map((c) => (
                <RowCard key={c.courseId} c={c} onEnroll={enroll} showProgram />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {exams.length > 0 && (
            <section aria-labelledby="exam-courses-h" className="flex flex-col gap-2.5">
              <h2 id="exam-courses-h" className="text-[17px] font-extrabold">
                Exam courses
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:gap-4">
                {exams.map((p) => (
                  <ProgramCard key={p.slug} p={p} />
                ))}
              </div>
            </section>
          )}
          {skills && (
            <section aria-labelledby="skills-h" className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2.5">
                <ProgramBadge slug={skills.slug} short={skills.short} />
                <h2 id="skills-h" className="text-[17px] font-extrabold">
                  {skills.name}
                </h2>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {skills.subjects.map((c) => (
                  <RowCard key={c.courseId} c={c} onEnroll={enroll} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
