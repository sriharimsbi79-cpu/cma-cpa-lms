import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Plus, Search } from 'lucide-react';
import { ChipGroup, EmptyState, Pill, SampleNotice } from '@/components/ui';
import { adminMocks, courseOptions, type AdminMock } from '@/data/adminDemo';
import { cx, durationLabel, num } from '@/lib/format';
import type { PublishStatus } from '@/lib/types';

export const STATUS_LABEL: Record<PublishStatus, string> = { draft: 'Draft', in_review: 'In review', published: 'Published', archived: 'Archived' };
export const statusTone = (s: PublishStatus) => (s === 'published' ? 'active' : s === 'in_review' ? 'ending' : 'none') as 'active' | 'ending' | 'none';
const KIND_LABEL = { full_mock: 'Full mock', practice_set: 'Practice set' } as const;

function mix(t: AdminMock) {
  const parts = [t.counts.mcq && `${t.counts.mcq} MCQ`, t.counts.tbs && `${t.counts.tbs} TBS`, t.counts.cbq && `${t.counts.cbq} CBQ`].filter(Boolean);
  return parts.join(' + ');
}

export default function MockTests() {
  const courses = useMemo(() => courseOptions(), []);
  const all = useMemo(() => adminMocks(), []);
  const [course, setCourse] = useState('all');
  const [search, setSearch] = useState('');

  const label = (id: string) => courses.find((c) => c.id === id)?.label ?? id;
  const used = courses.filter((c) => all.some((t) => t.courseId === c.id));
  const rows = all.filter((t) => (course === 'all' || t.courseId === course) && (!search.trim() || `${t.title} ${label(t.courseId)}`.toLowerCase().includes(search.trim().toLowerCase())));

  const published = all.filter((t) => t.status === 'published').length;
  const attempts = all.reduce((s, t) => s + t.attempts, 0);
  const scored = all.filter((t) => t.avgPercent !== null);
  const avg = scored.length ? Math.round(scored.reduce((s, t) => s + (t.avgPercent ?? 0), 0) / scored.length) : null;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold leading-tight tracking-tight lg:text-[28px]">Mock tests</h1>
          <p className="mt-1 text-sm text-ink-3">Full-length mocks and practice sets. Chapter tests are set up inside each chapter.</p>
        </div>
        <Link to="/admin/mock-tests/new" className="btn-primary">
          <Plus aria-hidden className="size-4" />
          New mock test
        </Link>
      </header>
      <SampleNotice />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { v: String(all.length), l: 'Mock tests' },
          { v: String(published), l: 'Published' },
          { v: num(attempts).toLocaleString('en-IN'), l: 'Attempts by students' },
          { v: avg === null ? '—' : `${avg}%`, l: 'Average score' },
        ].map((s) => (
          <div key={s.l} className="rounded-2xl border border-line bg-white px-4 py-3.5 lg:px-5">
            <p className="text-[13px] font-semibold text-ink-3">{s.l}</p>
            <p className="mt-0.5 text-2xl font-extrabold tracking-tight lg:text-[28px]">{s.v}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <ChipGroup label="Filter by course" scroll value={course} onChange={setCourse} options={[{ value: 'all', label: 'All courses' }, ...used.map((c) => ({ value: c.id, label: c.label }))]} />
        <label className="relative w-full lg:w-72">
          <span className="sr-only">Search mock tests</span>
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <input className="field pl-9" placeholder="Search by name" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No mock tests found" text="Try another course or search, or create a new mock test." />
      ) : (
        <>
          {/* desktop table */}
          <div className="card hidden overflow-hidden lg:block">
            <table className="w-full text-sm">
              <thead className="bg-mist-4 text-left text-xs text-ink-3">
                <tr>
                  <th scope="col" className="px-5 py-3 font-bold">Test</th>
                  <th scope="col" className="px-3 py-3 font-bold">Questions</th>
                  <th scope="col" className="px-3 py-3 font-bold">Time</th>
                  <th scope="col" className="px-3 py-3 font-bold">Attempts</th>
                  <th scope="col" className="px-3 py-3 font-bold">Avg score</th>
                  <th scope="col" className="px-3 py-3 font-bold">Status</th>
                  <th scope="col" className="px-5 py-3">
                    <span className="sr-only">Edit</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} className="border-t border-line-soft hover:bg-mist-4">
                    <td className="px-5 py-3.5">
                      <p className="font-bold">{t.title}</p>
                      <p className="text-xs text-ink-3">
                        {label(t.courseId)} · {KIND_LABEL[t.kind]} · {t.selection === 'random' ? 'Random from bank' : 'Fixed questions'}
                      </p>
                    </td>
                    <td className="px-3 py-3.5">
                      <p className="font-semibold">{t.questionCount}</p>
                      <p className="text-xs text-ink-3">{mix(t)}</p>
                    </td>
                    <td className="px-3 py-3.5 text-ink-2">{durationLabel(t.durationMinutes)}</td>
                    <td className="px-3 py-3.5 text-ink-2">{t.attempts.toLocaleString('en-IN')}</td>
                    <td className="px-3 py-3.5 font-bold">{t.avgPercent === null ? '—' : `${t.avgPercent}%`}</td>
                    <td className="px-3 py-3.5">
                      <Pill tone={statusTone(t.status)}>{STATUS_LABEL[t.status]}</Pill>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link to={`/admin/mock-tests/${t.id}`} className="link-brand">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* phone cards */}
          <ul className="flex flex-col gap-2.5 lg:hidden">
            {rows.map((t) => (
              <li key={t.id}>
                <Link to={`/admin/mock-tests/${t.id}`} className="card flex items-center gap-3 rounded-2xl px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold">{t.title}</p>
                      <Pill tone={statusTone(t.status)}>{STATUS_LABEL[t.status]}</Pill>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-3">
                      {label(t.courseId)} · {KIND_LABEL[t.kind]}
                    </p>
                    <p className={cx('mt-1.5 text-[13px] text-ink-2')}>
                      {t.questionCount} questions · {durationLabel(t.durationMinutes)} · {t.attempts} attempts
                      {t.avgPercent !== null && ` · avg ${t.avgPercent}%`}
                    </p>
                  </div>
                  <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-3" />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
