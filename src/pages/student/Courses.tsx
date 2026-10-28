import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, Layers, Lock, X } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { ErrorState, PageLoader, ProgressBar } from '@/components/ui';
import { useCatalog } from '@/lib/api';
import { cx, formatDate } from '@/lib/format';
import type { CatalogCourse } from '@/lib/types';

const SOON_DAYS = 15;

export const ENROLL_NOTE = 'Online enrolment opens here once payments are connected. Please contact the academy to enroll.';

function groupValidity(courses: CatalogCourse[]) {
  const mine = courses.filter((c) => c.enrolled && c.validUntil);
  if (mine.length === 0) return null;
  const first = [...mine].sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0))[0];
  return first;
}

function ProgramBadge({ slug, short }: { slug: string; short: string }) {
  if (slug === 'technical-skills') {
    return (
      <span aria-hidden className="flex size-8 items-center justify-center rounded-[9px] bg-mist-2 text-navy">
        <Layers className="size-4" />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cx(
        'flex size-8 items-center justify-center rounded-[9px] text-[11px] font-extrabold',
        slug === 'cma-usa' ? 'bg-brand/10 text-brand' : 'bg-mist-2 text-navy',
      )}
    >
      {short}
    </span>
  );
}

function RowCard({ c, onEnroll }: { c: CatalogCourse; onEnroll: () => void }) {
  if (!c.enrolled) {
    return (
      <div className="flex items-center gap-3.5 rounded-2xl border border-dashed border-line-dash bg-white px-4 py-3.5">
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-mist text-ink-3">
          <Lock className="size-[18px]" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[15px] font-bold">{c.name}</span>
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
        <span className="text-[15px] font-bold">{c.name}</span>
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

function SectionCard({ c, onEnroll }: { c: CatalogCourse; onEnroll: () => void }) {
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

export default function Courses() {
  const { data, isLoading, error, refetch } = useCatalog();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const q = (params.get('q') ?? '').trim().toLowerCase();

  const groups = useMemo(() => {
    const list = (data ?? []).filter(
      (c) => !q || [c.name, c.fullName, c.programName, c.code].some((v) => (v ?? '').toLowerCase().includes(q)),
    );
    const map = new Map<string, { slug: string; name: string; short: string; courses: CatalogCourse[] }>();
    for (const c of list) {
      if (!map.has(c.programId)) map.set(c.programId, { slug: c.programSlug, name: c.programName, short: c.programShort, courses: [] });
      map.get(c.programId)!.courses.push(c);
    }
    return [...map.values()];
  }, [data, q]);

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;

  const enroll = () => toast.show(ENROLL_NOTE, 'info');

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-[26px] font-extrabold leading-tight tracking-tight lg:text-[28px]">Courses</h1>
        <p className="mt-1 text-sm text-ink-3">All chapters are open. Study in any order.</p>
      </header>

      {q && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-ink-3">
            Showing results for <strong className="text-ink">“{params.get('q')}”</strong>
          </span>
          <button type="button" onClick={() => setParams({})} className="inline-flex h-9 items-center gap-1 rounded-lg px-2 font-bold text-brand hover:bg-brand/10">
            <X aria-hidden className="size-4" />
            Clear
          </button>
        </div>
      )}

      {groups.length === 0 && <p className="card p-6 text-sm text-ink-3">No courses match your search.</p>}

      {groups.map((g) => {
        const v = groupValidity(g.courses);
        const isCpa = g.slug === 'cpa-usa';
        return (
          <section key={g.slug} aria-labelledby={`g-${g.slug}`} className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              <ProgramBadge slug={g.slug} short={g.short} />
              <h2 id={`g-${g.slug}`} className="text-[17px] font-extrabold">
                {g.name}
              </h2>
              {v && g.slug !== 'technical-skills' && (
                <span className={cx('ml-auto text-xs', (v.daysLeft ?? 99) <= SOON_DAYS ? 'font-bold text-warn-text' : 'text-ink-3')}>
                  {(v.daysLeft ?? 99) <= SOON_DAYS ? `Ends in ${v.daysLeft} days` : `Till ${formatDate(v.validUntil)}`}
                </span>
              )}
            </div>
            {isCpa ? (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
                {g.courses.map((c) => (
                  <SectionCard key={c.courseId} c={c} onEnroll={enroll} />
                ))}
              </div>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {g.courses.map((c) => (
                  <RowCard key={c.courseId} c={c} onEnroll={enroll} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
