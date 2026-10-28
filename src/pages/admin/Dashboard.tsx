import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CreditCard, HelpCircle, Play, Search, ShieldAlert, Smartphone, Upload, UserCheck } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { ErrorState, PageLoader } from '@/components/ui';
import { useDashboardStats, useEndingSoon, useRecentActivity, useSendReminders } from '@/lib/api';
import { cx, formatDayMonth, formatLongToday, formatRelative, inr, whatsappLink } from '@/lib/format';
import { BRAND_NAME } from '@/components/ui';
import { isDemo } from '@/lib/supabase';
import type { Activity, DashboardStats } from '@/lib/types';

function programColor(program: string) {
  if (/cma/i.test(program)) return 'bg-brand';
  if (/cpa/i.test(program)) return 'bg-navy';
  return 'bg-navy-dim';
}

function describe(a: Activity): { icon: typeof Play; tone: string; who: string; text: string; meta: string } {
  const d = a.details as Record<string, unknown>;
  const where = [a.courseLabel, a.chapterLabel].filter(Boolean).join(' · ');
  const count = typeof d.count === 'number' ? d.count : 1;
  const staff = a.actorRole && a.actorRole !== 'student' ? `${a.actorRole === 'faculty' ? 'Faculty' : 'Admin'} · ${a.actorName ?? ''}` : a.actorName ?? 'Someone';
  const when = formatRelative(a.createdAt);
  switch (a.action) {
    case 'video_uploaded':
      return {
        icon: Play,
        tone: 'bg-brand/10 text-brand',
        who: staff,
        text: count > 1 ? `uploaded ${count} videos to ${where}` : `uploaded ${a.title ?? 'a video'}${where ? ` to ${where}` : ''}`,
        meta: `${when}${d.processing ? ` · ${d.processing} still processing` : ''}`,
      };
    case 'question_created':
      return {
        icon: HelpCircle,
        tone: 'bg-mist-2 text-navy',
        who: staff,
        text:
          count > 1
            ? `added ${count} ${d.kind ?? ''} questions to ${a.courseLabel ?? ''}${d.topic ? ` · ${d.topic}` : ''}`.replace(/\s+/g, ' ')
            : `added ${a.code ?? 'a question'}${where ? ` to ${where}` : ''}`,
        meta: `${when}${d.status === 'in_review' ? ' · waiting for review' : ''}`,
      };
    case 'enrolled':
      return {
        icon: CreditCard,
        tone: 'bg-ok-bg text-ok-fg',
        who: a.subjectName ?? a.actorName ?? 'A student',
        text: `enrolled in ${a.courseLabel ?? 'a course'}`,
        meta: `${when}${d.via ? ` · paid via ${d.via}` : ''}`,
      };
    case 'enrollment_granted':
    case 'enrollment_extended':
      return {
        icon: UserCheck,
        tone: 'bg-ok-bg text-ok-fg',
        who: staff,
        text: `${a.action === 'enrollment_granted' ? 'gave' : 'extended'} ${a.subjectName ?? 'a student'} access${a.courseLabel ? ` to ${a.courseLabel}` : ''}${d.days ? ` for ${d.days} days` : ''}`,
        meta: when,
      };
    case 'device_blocked':
      return {
        icon: Smartphone,
        tone: 'bg-warn-bg text-warn-fg',
        who: a.actorName ?? 'A student',
        text: `tried to log in on an extra device${d.device_name ? ` (${d.device_name})` : ''}`,
        meta: `${when} · blocked by device limit`,
      };
    case 'devices_reset':
      return { icon: Smartphone, tone: 'bg-mist-2 text-navy', who: staff, text: `reset devices for ${a.subjectName ?? 'a student'}`, meta: when };
    default:
      return {
        icon: ShieldAlert,
        tone: 'bg-mist-2 text-navy',
        who: staff,
        text: a.action.replace(/_/g, ' ') + (a.subjectName ? ` · ${a.subjectName}` : ''),
        meta: when,
      };
  }
}

function StatTiles({ s }: { s: DashboardStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-[repeat(auto-fit,minmax(220px,1fr))] lg:gap-4">
      <div className="card rounded-2xl p-4 lg:p-5">
        <p className="text-[13px] font-semibold text-ink-3">Active students</p>
        <p className="mt-1.5 text-[26px] font-extrabold leading-tight tracking-tight lg:text-[30px]">{s.activeStudents.toLocaleString('en-IN')}</p>
        <p className="mt-1.5 text-[13px] text-ink-3">With a valid course</p>
      </div>
      <div className="card rounded-2xl p-4 lg:p-5">
        <p className="text-[13px] font-semibold text-ink-3">New enrolments · {new Date().toLocaleDateString('en-GB', { month: 'long' })}</p>
        <p className="mt-1.5 text-[26px] font-extrabold leading-tight tracking-tight lg:text-[30px]">{s.newEnrollmentsThisMonth}</p>
        <p className="mt-1.5 text-[13px] text-ink-3">{s.newEnrollmentsByProgram.map((p) => `${p.program} ${p.count}`).join(' · ') || 'None yet'}</p>
      </div>
      <div className="card rounded-2xl p-4 lg:p-5">
        <p className="text-[13px] font-semibold text-ink-3">Revenue · {new Date().toLocaleDateString('en-GB', { month: 'long' })}</p>
        <p className="mt-1.5 text-[26px] font-extrabold leading-tight tracking-tight lg:text-[30px]">{inr(s.revenueThisMonthInr)}</p>
        <p className="mt-1.5 text-[13px] text-ink-3">From Razorpay payments</p>
      </div>
      <div className="rounded-2xl border border-warn-line bg-warn-bg p-4 text-warn-fg lg:p-5">
        <p className="text-[13px] font-semibold">Access ending in 15 days</p>
        <p className="mt-1.5 text-[26px] font-extrabold leading-tight tracking-tight lg:text-[30px]">{s.endingSoon}</p>
        <Link to="/admin/students?filter=ending" className="-mb-2 mt-0.5 inline-flex min-h-11 items-center text-[13px] font-bold underline">
          See students
        </Link>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const stats = useDashboardStats();
  const ending = useEndingSoon(4);
  const activity = useRecentActivity(6);
  const sendAll = useSendReminders();
  const toast = useToast();
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  if (stats.isLoading) return <PageLoader />;
  if (stats.error || !stats.data) return <ErrorState error={stats.error} onRetry={() => stats.refetch()} />;
  const s = stats.data;
  const max = Math.max(1, ...s.enrollmentsByCourse.map((c) => c.active));
  const programs = [...new Set(s.enrollmentsByCourse.map((c) => c.program))];
  const totalEnding = ending.data?.[0]?.totalCount ?? s.endingSoon;

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    navigate(`/admin/students${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
  };

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold leading-tight tracking-tight lg:text-[28px]">Dashboard</h1>
          <p className="mt-1 text-sm text-ink-3">{formatLongToday()} {new Date().getFullYear()}</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <form role="search" onSubmit={onSearch} className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-white px-3.5 text-ink-3 sm:w-[280px] sm:flex-none">
            <Search aria-hidden className="size-[18px] shrink-0" />
            <input
              type="search"
              aria-label="Search students"
              placeholder="Search students by name, mobile, email"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full min-w-0 bg-transparent text-sm text-ink outline-none"
            />
          </form>
          <Link to="/admin/content" className="btn-primary">
            <Upload aria-hidden className="size-4" />
            Upload content
          </Link>
        </div>
      </header>

      <StatTiles s={s} />

      <div className="flex flex-wrap gap-5 lg:gap-6">
        <section aria-labelledby="enr-h" className="card flex min-w-0 flex-[2_1_480px] flex-col gap-4 p-5 lg:p-6">
          <div>
            <h2 id="enr-h" className="text-lg font-extrabold">
              Active enrolments by course
            </h2>
            <p className="mt-0.5 text-[13px] text-ink-3">One student can be in more than one course</p>
          </div>
          <ul className="flex flex-col gap-3">
            {s.enrollmentsByCourse.map((c) => (
              <li key={c.courseId} className="grid grid-cols-[110px_minmax(0,1fr)_44px] items-center gap-3 text-sm sm:grid-cols-[130px_minmax(0,1fr)_48px]">
                <span className="truncate font-semibold">{c.course}</span>
                <span className="h-3 overflow-hidden rounded-md bg-line-soft" aria-hidden>
                  <span className={cx('block h-full', programColor(c.program))} style={{ width: `${(100 * c.active) / max}%` }} />
                </span>
                <span className="text-right font-bold">{c.active.toLocaleString('en-IN')}</span>
              </li>
            ))}
          </ul>
          <p className="flex flex-wrap gap-4 text-xs text-ink-3">
            {programs.map((p) => (
              <span key={p} className="flex items-center gap-1.5">
                <span className={cx('size-2.5 rounded-[3px]', programColor(p))} />
                {p}
              </span>
            ))}
          </p>
        </section>

        <section aria-labelledby="end-h" className="card flex min-w-0 flex-[1_1_320px] flex-col gap-2.5 p-5 lg:p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 id="end-h" className="text-lg font-extrabold">
              Access ending soon
            </h2>
            <Link to="/admin/students?filter=ending" className="link-brand">
              View all
            </Link>
          </div>
          {(ending.data ?? []).length === 0 ? (
            <p className="text-sm text-ink-3">No access ends in the next 15 days.</p>
          ) : (
            <ul>
              {ending.data!.map((r) => {
                const wa = whatsappLink(
                  r.phone,
                  `Hi ${r.fullName.split(' ')[0]}, your ${r.program} access at ${BRAND_NAME} ends on ${formatDayMonth(r.validUntil)}. Renew to keep your videos and mock tests.`,
                );
                return (
                  <li key={`${r.userId}-${r.program}`} className="flex items-center gap-3 border-t border-line-soft py-2.5">
                    <Link to={`/admin/students?student=${r.userId}`} className="flex min-h-11 min-w-0 flex-1 flex-col justify-center">
                      <span className="text-sm font-bold">{r.fullName}</span>
                      <span className="text-xs text-ink-3">
                        {r.program} · ends {formatDayMonth(r.validUntil)}
                      </span>
                    </Link>
                    {wa ? (
                      <a href={wa} target="_blank" rel="noreferrer" className="btn-secondary h-11 px-3 text-[13px]">
                        Remind
                      </a>
                    ) : isDemo ? (
                      <button type="button" className="btn-secondary h-11 px-3 text-[13px]" onClick={() => toast.show('Demo mode: this opens WhatsApp with a ready reminder message.', 'info')}>
                        Remind
                      </button>
                    ) : (
                      <span className="text-xs text-ink-3">No mobile</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <button
            type="button"
            className="btn-dark mt-auto"
            disabled={sendAll.isPending || totalEnding === 0}
            onClick={() =>
              sendAll.mutate(undefined, {
                onSuccess: (n) => toast.show(n ? `Reminder sent to ${n} students in the app` : 'Everyone was already reminded in the last 3 days'),
                onError: toast.error,
              })
            }
          >
            Send reminder to all {totalEnding}
          </button>
        </section>
      </div>

      <div className="flex flex-wrap gap-5 lg:gap-6">
        <section aria-labelledby="lib-h" className="card flex min-w-0 flex-[1_1_320px] flex-col gap-3.5 p-5 lg:p-6">
          <h2 id="lib-h" className="text-lg font-extrabold">
            Content library
          </h2>
          <dl className="grid grid-cols-2 gap-3">
            {[
              ['Videos', s.videosReady.toLocaleString('en-IN'), s.videosProcessing ? `${s.videosProcessing} processing` : 'All ready'],
              ['eBooks', String(s.ebooks), 'Watermarked'],
              ['MCQs', (s.questionsByType.mcq ?? 0).toLocaleString('en-IN'), 'CMA + CPA'],
              ['TBS · CBQ', `${s.questionsByType.tbs ?? 0} · ${s.questionsByType.cbq ?? 0}`, `${s.questionsInReview} waiting for review`],
            ].map(([k, v, sub]) => (
              <div key={k} className="rounded-xl bg-page p-3.5">
                <dt className="text-[13px] text-ink-3">{k}</dt>
                <dd className="mt-0.5 text-[22px] font-extrabold">{v}</dd>
                <dd className="text-xs text-ink-3">{sub}</dd>
              </div>
            ))}
          </dl>
          <Link to="/admin/questions?status=in_review" className="btn-secondary">
            Review {s.questionsInReview} drafts
          </Link>
        </section>

        <section aria-labelledby="act-h" className="card flex min-w-0 flex-[2_1_480px] flex-col gap-2 p-5 lg:p-6">
          <h2 id="act-h" className="mb-1 text-lg font-extrabold">
            Recent activity
          </h2>
          {(activity.data ?? []).length === 0 ? (
            <p className="text-sm text-ink-3">Nothing yet.</p>
          ) : (
            <ul>
              {activity.data!.map((a) => {
                const x = describe(a);
                return (
                  <li key={a.id} className="flex gap-3.5 border-t border-line-soft py-3">
                    <span className={cx('flex size-9 shrink-0 items-center justify-center rounded-[10px]', x.tone)}>
                      <x.icon aria-hidden className="size-4" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-sm">
                        <strong className="font-bold">{x.who}</strong> {x.text}
                      </span>
                      <span className="text-xs text-ink-3">{x.meta}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
