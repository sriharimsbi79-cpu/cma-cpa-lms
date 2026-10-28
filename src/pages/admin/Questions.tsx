import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Pencil, Plus, Upload } from 'lucide-react';
import { ChipGroup, ErrorState, Pill, Skeleton } from '@/components/ui';
import { PAGE_SIZE, useCourseTree, useQuestionCounts, useQuestions } from '@/lib/api';
import { cx } from '@/lib/format';
import type { Difficulty, PublishStatus, QuestionFilters, QuestionRow } from '@/lib/types';
import { DIFFICULTY_LABEL, STATUS_LABEL, STATUS_TONE, typeInfo } from './questionTypes';

function TypeBadge({ q }: { q: QuestionRow }) {
  const t = typeInfo(q.type);
  return (
    <span className="flex flex-col items-start gap-0.5">
      <span
        className={cx(
          'rounded-md px-2 py-0.5 text-xs font-extrabold',
          t.badge === 'MCQ' && 'bg-mist text-ink-2',
          t.badge === 'TBS' && 'bg-brand/10 text-brand',
          t.badge === 'CBQ' && 'bg-navy text-white',
        )}
      >
        {t.badge}
      </span>
      {t.sub && <span className="text-xs text-ink-3">{t.sub}</span>}
    </span>
  );
}

const accText = (q: QuestionRow) => (q.percentCorrect === null ? '—' : `${Math.round(q.percentCorrect)}%`);
const accCls = (q: QuestionRow) => (q.percentCorrect !== null && q.percentCorrect < 50 ? 'text-warn-text' : 'text-ink');

export default function Questions() {
  const [params] = useSearchParams();
  const [f, setF] = useState<QuestionFilters>({
    type: 'all',
    courseId: params.get('course') ?? '',
    chapterId: params.get('chapter') ?? '',
    difficulty: '',
    status: (params.get('status') as PublishStatus) ?? '',
    search: '',
    page: 0,
  });
  const set = (patch: Partial<QuestionFilters>) => setF((x) => ({ ...x, page: 0, ...patch }));
  const counts = useQuestionCounts();
  const tree = useCourseTree();
  const list = useQuestions(f);
  const courses = useMemo(() => (tree.data ?? []).flatMap((p) => p.courses.map((c) => ({ ...c, label: c.kind === 'skill' ? c.name : `${p.shortName ?? p.name} ${c.name}` }))), [tree.data]);
  const chapters = courses.find((c) => c.id === f.courseId)?.chapters ?? [];
  const rows = list.data ?? [];
  const total = rows[0]?.totalCount ?? 0;
  const from = total ? f.page * PAGE_SIZE + 1 : 0;
  const to = f.page * PAGE_SIZE + rows.length;
  const c = counts.data;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold leading-tight tracking-tight lg:text-[28px]">Question bank</h1>
          <p className="mt-1 text-sm text-ink-3">Every chapter test and mock test picks its questions from here</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link to="/admin/questions/upload" className="btn-secondary">
            <Upload aria-hidden className="size-4" />
            Bulk upload
          </Link>
          <Link to="/admin/questions/new" className="btn-primary">
            <Plus aria-hidden className="size-4" strokeWidth={2.4} />
            Add question
          </Link>
        </div>
      </header>

      <ChipGroup
        label="Question type"
        value={f.type}
        onChange={(type) => set({ type })}
        scroll
        options={[
          { value: 'all', label: 'All types', count: c?.all.toLocaleString('en-IN') },
          { value: 'mcq', label: 'MCQ', count: c?.mcq.toLocaleString('en-IN') },
          { value: 'tbs', label: 'TBS', count: c?.tbs.toLocaleString('en-IN') },
          { value: 'cbq', label: 'CBQ', count: c?.cbq.toLocaleString('en-IN') },
        ]}
      />

      <section aria-label="Filters" className="grid grid-cols-2 gap-3 rounded-2xl border border-line bg-white p-4 lg:grid-cols-5">
        <div className="flex flex-col gap-1">
          <label htmlFor="f-course" className="field-label">Course</label>
          <select id="f-course" className="field" value={f.courseId} onChange={(e) => set({ courseId: e.target.value, chapterId: '' })}>
            <option value="">All courses</option>
            {courses.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="f-chapter" className="field-label">Chapter</label>
          <select id="f-chapter" className="field" value={f.chapterId} onChange={(e) => set({ chapterId: e.target.value })} disabled={!f.courseId}>
            <option value="">All chapters</option>
            {chapters.map((x) => (
              <option key={x.id} value={x.id}>
                Ch {x.position} · {x.title}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="f-diff" className="field-label">Difficulty</label>
          <select id="f-diff" className="field" value={f.difficulty} onChange={(e) => set({ difficulty: e.target.value as Difficulty | '' })}>
            <option value="">Any</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="f-status" className="field-label">Status</label>
          <select id="f-status" className="field" value={f.status} onChange={(e) => set({ status: e.target.value as PublishStatus | '' })}>
            <option value="">Any</option>
            <option value="published">Published</option>
            <option value="in_review">In review</option>
            <option value="draft">Draft</option>
          </select>
        </div>
        <div className="col-span-2 flex flex-col gap-1 lg:col-span-1">
          <label htmlFor="f-search" className="field-label">Search</label>
          <input id="f-search" type="search" className="field" placeholder="ID or words in question" value={f.search} onChange={(e) => set({ search: e.target.value })} />
        </div>
      </section>

      {list.error ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : (
        <section aria-label="Questions" className="overflow-hidden rounded-card border border-line bg-white">
          {list.isLoading ? (
            <div className="flex flex-col gap-2 p-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-ink-3">No questions match these filters.</p>
          ) : (
            <>
              {/* desktop table */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[980px] border-collapse text-sm">
                  <thead className="bg-mist-4 text-left text-xs text-ink-3">
                    <tr>
                      <th scope="col" className="w-10 border-b border-line py-3 pl-5 pr-2">
                        <span className="sr-only">Select</span>
                      </th>
                      <th scope="col" className="border-b border-line px-3 py-3 font-bold">Question</th>
                      <th scope="col" className="w-[130px] border-b border-line px-3 py-3 font-bold">Type</th>
                      <th scope="col" className="border-b border-line px-3 py-3 font-bold">Course · chapter</th>
                      <th scope="col" className="w-[90px] border-b border-line px-3 py-3 font-bold">Difficulty</th>
                      <th scope="col" className="w-[90px] border-b border-line px-3 py-3 font-bold">Students correct</th>
                      <th scope="col" className="w-[110px] border-b border-line px-3 py-3 font-bold">Status</th>
                      <th scope="col" className="w-14 border-b border-line py-3 pr-5">
                        <span className="sr-only">Edit</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((q) => (
                      <tr key={q.id} className="border-b border-line-soft">
                        <td className="py-3 pl-5 pr-2 align-middle">
                          <input type="checkbox" aria-label={`Select ${q.code}`} className="size-[18px] accent-brand" />
                        </td>
                        <td className="px-3 py-3">
                          <span className="block text-xs font-bold text-ink-3">{q.code}</span>
                          <span className="line-clamp-2 font-semibold leading-snug">{q.stem}</span>
                        </td>
                        <td className="px-3 py-3">
                          <TypeBadge q={q} />
                        </td>
                        <td className="px-3 py-3 text-[13px] text-ink-2">
                          {q.courseLabel}
                          {q.chapterLabel ? ` · ${q.chapterLabel}` : ''}
                        </td>
                        <td className="px-3 py-3 text-[13px] text-ink-2">{DIFFICULTY_LABEL[q.difficulty]}</td>
                        <td className={cx('px-3 py-3 font-bold', accCls(q))}>{accText(q)}</td>
                        <td className="px-3 py-3">
                          <Pill tone={STATUS_TONE[q.status]}>{STATUS_LABEL[q.status]}</Pill>
                        </td>
                        <td className="py-3 pr-5">
                          <Link to={`/admin/questions/${q.id}`} aria-label={`Edit ${q.code}`} className="flex size-10 items-center justify-center rounded-lg text-ink-2 hover:bg-mist">
                            <Pencil aria-hidden className="size-4" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* phone cards */}
              <ul className="lg:hidden">
                {rows.map((q) => (
                  <li key={q.id} className="border-b border-line-soft">
                    <Link to={`/admin/questions/${q.id}`} className="flex flex-col gap-2 px-4 py-3.5">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-ink-3">{q.code}</span>
                        <Pill tone={STATUS_TONE[q.status]}>{STATUS_LABEL[q.status]}</Pill>
                      </span>
                      <span className="text-sm font-semibold leading-snug">{q.stem}</span>
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
                        <TypeBadge q={q} />
                        <span>{q.courseLabel}{q.chapterLabel ? ` · ${q.chapterLabel}` : ''}</span>
                        <span>{DIFFICULTY_LABEL[q.difficulty]}</span>
                        <span className={cx('font-bold', accCls(q))}>{accText(q)} correct</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <p className="text-[13px] text-ink-3">
              {total ? `Showing ${from}–${to} of ${total.toLocaleString('en-IN')}` : 'No results'} · a low “students correct” score can mean the question is too hard or has a mistake
            </p>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary h-10 px-3.5 text-[13px]" disabled={f.page === 0} onClick={() => setF({ ...f, page: f.page - 1 })}>
                Previous
              </button>
              <button type="button" className="btn-secondary h-10 px-3.5 text-[13px]" disabled={to >= total} onClick={() => setF({ ...f, page: f.page + 1 })}>
                Next
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
