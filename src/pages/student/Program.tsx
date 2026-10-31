import { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { EmptyState, ErrorState, PageLoader, ProgressBar } from '@/components/ui';
import { useCatalog } from '@/lib/api';
import { formatDate, plural } from '@/lib/format';
import { SKILLS_SLUG, summarizePrograms } from '@/lib/programs';
import { ENROLL_NOTE, ProgramBadge, RowCard, SectionCard } from './Courses';

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
  const core = program.subjects.filter((s) => s.kind !== 'cpa_discipline');
  const disciplines = program.subjects.filter((s) => s.kind === 'cpa_discipline');

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

      {isCpa ? (
        <>
          <section aria-labelledby="core-h" className="flex flex-col gap-2.5">
            <h2 id="core-h" className="text-[17px] font-extrabold">
              Core subjects
            </h2>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:gap-4">
              {core.map((c) => (
                <SectionCard key={c.courseId} c={c} onEnroll={enroll} />
              ))}
            </div>
          </section>
          {disciplines.length > 0 && (
            <section aria-labelledby="disc-h" className="flex flex-col gap-2.5">
              <div>
                <h2 id="disc-h" className="text-[17px] font-extrabold">
                  Discipline subjects
                </h2>
                <p className="mt-0.5 text-[13px] text-ink-3">Choose one discipline for the CPA exam.</p>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:gap-4">
                {disciplines.map((c) => (
                  <SectionCard key={c.courseId} c={c} onEnroll={enroll} />
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <section aria-labelledby="subj-h" className="flex flex-col gap-2.5">
          <h2 id="subj-h" className="text-[17px] font-extrabold">
            {unit === 'part' ? 'Parts' : 'Subjects'}
          </h2>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:gap-4">
            {program.subjects.map((c) => (
              <RowCard key={c.courseId} c={c} onEnroll={enroll} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
