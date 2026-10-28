import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Copy, Download, Plus, Search } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { Avatar, ChipGroup, ErrorState, Field, Modal, Pill, Skeleton } from '@/components/ui';
import {
  PAGE_SIZE,
  useCourseTree,
  useExtendAccess,
  useGrantAccess,
  useResetDevices,
  useSendLoginLink,
  useSetBlocked,
  useStudent,
  useStudents,
} from '@/lib/api';
import { cx, formatDate, formatRelative, whatsappLink } from '@/lib/format';
import { BRAND_NAME } from '@/components/ui';
import { isDemo } from '@/lib/supabase';
import type { AccessGroup, StudentDetail, StudentRow } from '@/lib/types';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'ending', label: 'Ending in 15 days' },
  { value: 'expired', label: 'Expired' },
] as const;

const STATUS_NOTE = (s: StudentRow) =>
  s.status === 'ending' ? (s.validUntil ? `Ends in ${Math.max(0, Math.ceil((new Date(s.validUntil).getTime() - Date.now()) / 86_400_000))} days` : 'Ending') : s.status === 'expired' ? 'Expired' : s.status === 'none' ? 'No course' : 'Active';

function toCsv(rows: StudentRow[]) {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['Name', 'Mobile', 'Email', 'Courses', 'Access till', 'Status', 'Progress %', 'Last active', 'Joined'];
  const lines = rows.map((r) => [r.fullName, r.phone, r.email, r.courses, formatDate(r.validUntil), STATUS_NOTE(r), r.progress, formatDate(r.lastActiveAt), formatDate(r.createdAt)].map(esc).join(','));
  return [head.join(','), ...lines].join('\n');
}

function ExtendControl({ group }: { group: AccessGroup }) {
  const toast = useToast();
  const extend = useExtendAccess();
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState(90);
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-primary h-10 px-3 text-[13px]">
        Extend
      </button>
    );
  return (
    <div className="flex items-center gap-1.5">
      <select aria-label="Extend by" className="field h-10 w-[104px] px-2 text-[13px]" value={days} onChange={(e) => setDays(Number(e.target.value))}>
        {[30, 90, 180, 365].map((d) => (
          <option key={d} value={d}>
            +{d} days
          </option>
        ))}
      </select>
      <button
        type="button"
        className="btn-primary h-10 px-3 text-[13px]"
        disabled={extend.isPending}
        onClick={() =>
          extend.mutate(
            { enrollmentIds: group.enrollmentIds, days },
            {
              onSuccess: () => {
                toast.show(`${group.program} extended by ${days} days`);
                setOpen(false);
              },
              onError: (e) => {
                toast.error(e);
                setOpen(false);
              },
            },
          )
        }
      >
        Save
      </button>
    </div>
  );
}

function GrantAccess({ student }: { student: StudentDetail }) {
  const toast = useToast();
  const tree = useCourseTree();
  const grant = useGrantAccess();
  const [programId, setProgramId] = useState('');
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [days, setDays] = useState(365);
  const program = tree.data?.find((p) => p.id === programId);
  return (
    <details className="group rounded-xl border border-line">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 text-[13px] font-bold text-brand">
        <Plus aria-hidden className="size-3.5" strokeWidth={2.6} />
        Give course access
      </summary>
      <div className="flex flex-col gap-3 border-t border-line-soft p-3">
        <p className="text-xs text-ink-3">For students who paid offline or need free access.</p>
        <Field label="Program" htmlFor="g-program">
          <select
            id="g-program"
            className="field"
            value={programId}
            onChange={(e) => {
              setProgramId(e.target.value);
              setCourseIds([]);
            }}
          >
            <option value="">Choose…</option>
            {(tree.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        {program && (
          <fieldset className="flex flex-wrap gap-x-4 gap-y-1">
            <legend className="mb-1 text-xs font-bold text-ink-2">Courses</legend>
            {program.courses.map((c) => (
              <label key={c.id} className="flex min-h-10 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-[18px] accent-brand"
                  checked={courseIds.includes(c.id)}
                  onChange={(e) => setCourseIds(e.target.checked ? [...courseIds, c.id] : courseIds.filter((x) => x !== c.id))}
                />
                {c.name}
              </label>
            ))}
          </fieldset>
        )}
        <div className="flex items-end gap-2">
          <Field label="Access for" htmlFor="g-days">
            <select id="g-days" className="field w-[130px]" value={days} onChange={(e) => setDays(Number(e.target.value))}>
              {[30, 90, 180, 365, 730].map((d) => (
                <option key={d} value={d}>
                  {d} days
                </option>
              ))}
            </select>
          </Field>
          <button
            type="button"
            className="btn-primary"
            disabled={grant.isPending || courseIds.length === 0}
            onClick={() =>
              grant.mutate(
                { userId: student.id, courseIds, days },
                {
                  onSuccess: () => {
                    toast.show('Access given');
                    setCourseIds([]);
                  },
                  onError: toast.error,
                },
              )
            }
          >
            Give access
          </button>
        </div>
      </div>
    </details>
  );
}

function DetailPanel({ id }: { id: string }) {
  const toast = useToast();
  const { data: s, isLoading, error, refetch } = useStudent(id);
  const loginLink = useSendLoginLink();
  const reset = useResetDevices();
  const block = useSetBlocked();

  if (isLoading)
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-14" />
        <Skeleton className="h-40" />
      </div>
    );
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (!s) return <p className="text-sm text-ink-3">Student not found.</p>;

  const ending = s.access.find((a) => a.status !== 'active') ?? s.access[0];
  const wa = whatsappLink(
    s.phone,
    ending
      ? `Hi ${s.fullName.split(' ')[0]}, your ${ending.program} access at ${BRAND_NAME} ${ending.status === 'expired' ? 'has ended' : `ends on ${formatDate(ending.validUntil)}`}. Renew to keep your videos and mock tests.`
      : `Hi ${s.fullName.split(' ')[0]}, this is ${BRAND_NAME}.`,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3.5">
        <Avatar name={s.fullName} size={56} className="bg-brand text-white" />
        <div className="min-w-0">
          <h2 id="sd-h" className="text-lg font-extrabold">
            {s.fullName}
          </h2>
          <p className="text-[13px] text-ink-3">Joined {formatDate(s.createdAt)}</p>
        </div>
        {s.isBlocked && <Pill tone="ending" className="ml-auto">Blocked</Pill>}
      </div>
      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-ink-3">Mobile</dt>
          <dd className="font-semibold">{s.phone ?? '—'}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-3">Email</dt>
          <dd className="text-right font-semibold [overflow-wrap:anywhere]">{s.email ?? '—'}</dd>
        </div>
      </dl>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="btn-secondary px-2 text-[13px]"
          disabled={!s.email || loginLink.isPending}
          onClick={() => s.email && loginLink.mutate(s.email, { onSuccess: () => toast.show(`Login link sent to ${s.email}`), onError: toast.error })}
        >
          Send login link
        </button>
        {wa ? (
          <a href={wa} target="_blank" rel="noreferrer" className="btn-secondary px-2 text-[13px]">
            WhatsApp reminder
          </a>
        ) : isDemo ? (
          <button type="button" className="btn-secondary px-2 text-[13px]" onClick={() => toast.show('Demo mode: this opens WhatsApp with a ready reminder message.', 'info')}>
            WhatsApp reminder
          </button>
        ) : (
          <button type="button" disabled className="btn-secondary px-2 text-[13px]">
            No mobile number
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-line-soft pt-3.5">
        <h3 className="text-sm font-extrabold">Course access</h3>
        {s.access.length === 0 ? (
          <p className="text-sm text-ink-3">No courses yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {s.access.map((a) => (
              <li key={`${a.program}-${a.validUntil}`} className="flex items-center gap-2.5 rounded-xl border border-line px-3 py-2.5">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[13px] font-bold">
                    {a.program} · {a.courses}
                  </span>
                  <span className="text-xs text-ink-3">Till {formatDate(a.validUntil)}</span>
                  <span className="mt-1">
                    <Pill tone={a.status}>{a.status === 'active' ? `${a.daysLeft} days left` : a.status === 'ending' ? `Ends in ${a.daysLeft} days` : 'Expired'}</Pill>
                  </span>
                </span>
                <ExtendControl group={a} />
              </li>
            ))}
          </ul>
        )}
        <GrantAccess student={s} />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line-soft pt-3.5">
        <div>
          <h3 className="text-sm font-extrabold">Devices</h3>
          <p className="text-[13px] text-ink-3">
            {s.devicesInUse} of {s.maxDevices} devices in use
            {s.blockedAttemptsToday ? ` · ${s.blockedAttemptsToday} blocked attempt today` : ''}
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary px-3.5 text-[13px]"
          disabled={reset.isPending || s.devicesInUse === 0}
          onClick={() => reset.mutate(s.id, { onSuccess: () => toast.show('Devices reset. The student can log in on new devices.'), onError: toast.error })}
        >
          Reset devices
        </button>
      </div>
      <button
        type="button"
        disabled={block.isPending}
        onClick={() => block.mutate({ userId: s.id, blocked: !s.isBlocked }, { onSuccess: () => toast.show(s.isBlocked ? 'Student unblocked' : 'Student blocked'), onError: toast.error })}
        className="h-10 self-start text-[13px] font-bold text-warn-text underline"
      >
        {s.isBlocked ? 'Unblock this student' : 'Block this student'}
      </button>
    </div>
  );
}

export default function Students() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const filter = params.get('filter') ?? 'all';
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [debounced, setDebounced] = useState(search);
  const [page, setPage] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => {
    setPage(0);
  }, [filter, debounced]);

  const { data, isLoading, error, refetch } = useStudents(filter, debounced, page);
  const rows = useMemo(() => data ?? [], [data]);
  const total = rows[0]?.totalCount ?? 0;
  const selected = params.get('student') ?? rows[0]?.id ?? null;

  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v === null || v === '' || (k === 'filter' && v === 'all')) next.delete(k);
    else next.set(k, v);
    setParams(next, { replace: true });
  };
  const pick = (id: string) => {
    setParam('student', id);
    if (window.matchMedia('(max-width: 1023px)').matches) setSheet(true);
  };
  const exportCsv = () => {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `students-${filter}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const signupUrl = `${window.location.origin}/signup`;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold leading-tight tracking-tight lg:text-[28px]">Students</h1>
          <p className="mt-1 text-sm text-ink-3">{total.toLocaleString('en-IN')} shown · click a student to manage access</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button type="button" className="btn-secondary" onClick={exportCsv} disabled={rows.length === 0}>
            <Download aria-hidden className="size-4" />
            Export to Excel
          </button>
          <button type="button" className="btn-primary" onClick={() => setAddOpen(true)}>
            <Plus aria-hidden className="size-4" strokeWidth={2.4} />
            Add student
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-11 min-w-0 flex-[1_1_280px] items-center gap-2 rounded-xl border border-line-strong bg-white px-3.5 text-ink-3 sm:max-w-[420px]">
          <Search aria-hidden className="size-[18px] shrink-0" />
          <input type="search" aria-label="Search students" placeholder="Name, mobile or email" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full min-w-0 bg-transparent text-sm text-ink outline-none" />
        </div>
        <ChipGroup label="Filter by access" scroll value={filter} onChange={(v) => setParam('filter', v)} options={FILTERS.map((f) => ({ ...f }))} />
      </div>

      <div className="flex flex-wrap items-start gap-5 lg:gap-6">
        <section aria-label="Student list" className="min-w-0 flex-[999_1_560px] overflow-hidden rounded-card border border-line bg-white">
          {error ? (
            <div className="p-4">
              <ErrorState error={error} onRetry={() => refetch()} />
            </div>
          ) : isLoading ? (
            <div className="flex flex-col gap-2 p-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-ink-3">No students match.</p>
          ) : (
            <>
              <div aria-hidden className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1.6fr)_130px_70px_90px] gap-3.5 border-b border-line bg-mist-4 px-5 py-3 text-xs font-bold text-ink-3 md:grid">
                <span>Student</span>
                <span>Courses</span>
                <span>Access till</span>
                <span>Progress</span>
                <span>Last active</span>
              </div>
              <ul>
                {rows.map((s) => {
                  const on = s.id === selected;
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => pick(s.id)}
                        className={cx(
                          'grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3.5 border-b border-line-soft px-4 py-3 text-left md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.6fr)_130px_70px_90px] md:px-5',
                          on ? 'bg-brand/10' : 'bg-white hover:bg-mist-4',
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <Avatar name={s.fullName} />
                          <span className="flex min-w-0 flex-col">
                            <span className="text-sm font-bold">{s.fullName || 'Unnamed'}</span>
                            <span className="truncate text-xs text-ink-3">{s.phone ?? s.email}</span>
                            <span className="truncate text-xs text-ink-3 md:hidden">{s.courses ?? 'No course'}</span>
                          </span>
                        </span>
                        <span className="hidden text-[13px] text-ink-2 md:block">{s.courses ?? '—'}</span>
                        <span className="flex flex-col items-end md:items-start">
                          <span className="hidden text-[13px] font-semibold md:block">{formatDate(s.validUntil)}</span>
                          <Pill tone={s.status === 'none' ? 'none' : s.status} className="mt-0.5 text-[11px]">
                            {STATUS_NOTE(s)}
                          </Pill>
                        </span>
                        <span className="hidden text-sm font-bold md:block">{s.progress}%</span>
                        <span className="hidden text-[13px] text-ink-3 md:block">{formatRelative(s.lastActiveAt)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <p className="text-[13px] text-ink-3">
              {total ? `Showing ${page * PAGE_SIZE + 1}–${page * PAGE_SIZE + rows.length} of ${total.toLocaleString('en-IN')}` : ''}
            </p>
            {total > PAGE_SIZE && (
              <div className="flex gap-2">
                <button type="button" className="btn-secondary h-10 px-3.5 text-[13px]" disabled={page === 0} onClick={() => setPage(page - 1)}>
                  Previous
                </button>
                <button type="button" className="btn-secondary h-10 px-3.5 text-[13px]" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage(page + 1)}>
                  Next
                </button>
              </div>
            )}
          </div>
        </section>

        {selected && (
          <aside aria-labelledby="sd-h" className="card hidden min-w-0 flex-[1_1_320px] p-[22px] lg:block">
            <DetailPanel id={selected} />
          </aside>
        )}
      </div>

      <Modal open={sheet && !!selected} onClose={() => setSheet(false)} title="Student">
        {selected && <DetailPanel id={selected} />}
      </Modal>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add a student"
        footer={
          <button type="button" className="btn-primary" onClick={() => setAddOpen(false)}>
            Done
          </button>
        }
      >
        <div className="flex flex-col gap-3 text-sm text-ink-2">
          <p>Students create their own account, so their mobile and email are verified by them. Send them this sign-up link:</p>
          <div className="flex gap-2">
            <input readOnly aria-label="Sign-up link" value={signupUrl} className="field font-mono text-[13px]" onFocus={(e) => e.target.select()} />
            <button
              type="button"
              aria-label="Copy link"
              className="btn-secondary px-3"
              onClick={() => navigator.clipboard?.writeText(signupUrl).then(() => toast.show('Link copied'), () => toast.show('Copy the link from the box', 'info'))}
            >
              <Copy aria-hidden className="size-4" />
            </button>
          </div>
          <p>After they sign up, they appear in this list. Open them and use <strong>Give course access</strong> if they paid offline.</p>
        </div>
      </Modal>
    </div>
  );
}
