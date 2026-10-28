import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Bell, ChevronRight, Download, FileText, Lock, LogOut, MessageCircle, Monitor, Pencil, Smartphone } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { Avatar, ErrorState, Field, Modal, PageLoader, Pill } from '@/components/ui';
import { useAccount, useCatalog, useNotifications, useRemoveDevice, useUpdateProfile } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { getDeviceId } from '@/lib/device';
import { formatDate, formatRelative, inr } from '@/lib/format';
import { isDemo } from '@/lib/supabase';
import type { Account, AccessGroup } from '@/lib/types';

export const SUPPORT_CONTACT = '[YOUR SUPPORT EMAIL / WHATSAPP NUMBER]';
const RENEW_NOTE = 'Online renewal opens here once payments are connected. Please contact the academy to renew.';

function accessBadge(a: AccessGroup) {
  if (a.status === 'expired') return <Pill tone="expired">Expired</Pill>;
  if (a.status === 'ending') return <Pill tone="ending">Ends in {a.daysLeft} days</Pill>;
  return <Pill tone="active">Active · {a.daysLeft} days left</Pill>;
}

function EditProfileModal({ open, onClose, account }: { open: boolean; onClose: () => void; account: Account }) {
  const toast = useToast();
  const { data: catalog } = useCatalog();
  const update = useUpdateProfile();
  const p = account.profile;
  const [form, setForm] = useState({ fullName: p.fullName, phone: p.phone ?? '', course: p.targetCourseId ?? '', date: p.targetExamDate ?? '' });
  const [err, setErr] = useState('');
  useEffect(() => {
    if (open) {
      setForm({ fullName: p.fullName, phone: p.phone ?? '', course: p.targetCourseId ?? '', date: p.targetExamDate ?? '' });
      setErr('');
    }
  }, [open, p.fullName, p.phone, p.targetCourseId, p.targetExamDate]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) return setErr('Enter your full name');
    if (form.phone && form.phone.replace(/\D/g, '').length < 10) return setErr('Enter a valid mobile number');
    update.mutate(
      { id: p.id, fullName: form.fullName, phone: form.phone, targetCourseId: form.course || null, targetExamDate: form.date || null },
      {
        onSuccess: () => {
          toast.show('Details saved');
          onClose();
        },
        onError: (e) => {
          toast.error(e);
          if (isDemo) onClose();
        },
      },
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit details"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="edit-profile" className="btn-primary" disabled={update.isPending}>
            Save
          </button>
        </>
      }
    >
      <form id="edit-profile" onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label="Full name" htmlFor="pf-name">
          <input id="pf-name" className="field" value={form.fullName} onChange={(e) => { setForm({ ...form, fullName: e.target.value }); setErr(''); }} autoComplete="name" />
        </Field>
        <Field label="Mobile number" htmlFor="pf-phone">
          <input id="pf-phone" className="field" inputMode="tel" value={form.phone} onChange={(e) => { setForm({ ...form, phone: e.target.value }); setErr(''); }} autoComplete="tel" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Target exam" htmlFor="pf-course">
            <select id="pf-course" className="field" value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })}>
              <option value="">Not set</option>
              {(catalog ?? [])
                .filter((c) => c.enrolled && c.kind !== 'skill')
                .map((c) => (
                  <option key={c.courseId} value={c.courseId}>
                    {c.programShort} {c.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Exam date" htmlFor="pf-date">
            <input id="pf-date" type="date" className="field" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
        </div>
        <p className="text-xs text-ink-3">To change your email, contact support.</p>
        {err && <p role="alert" className="text-[13px] font-semibold text-warn-text">{err}</p>}
      </form>
    </Modal>
  );
}

function PasswordForm({ onDone }: { onDone?: () => void }) {
  const { updatePassword } = useAuth();
  const toast = useToast();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return setErr('Use at least 8 characters');
    if (pw !== pw2) return setErr('The two passwords do not match');
    if (isDemo) {
      toast.show('Demo mode: connect Supabase to change passwords.', 'info');
      return onDone?.();
    }
    setBusy(true);
    try {
      await updatePassword(pw);
      toast.show('Password changed');
      setPw('');
      setPw2('');
      onDone?.();
    } catch (e2) {
      toast.error(e2);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      <Field label="New password" htmlFor="pw1">
        <input id="pw1" type="password" className="field" value={pw} onChange={(e) => { setPw(e.target.value); setErr(''); }} autoComplete="new-password" />
      </Field>
      <Field label="Type it again" htmlFor="pw2">
        <input id="pw2" type="password" className="field" value={pw2} onChange={(e) => { setPw2(e.target.value); setErr(''); }} autoComplete="new-password" />
      </Field>
      {err && <p role="alert" className="text-[13px] font-semibold text-warn-text">{err}</p>}
      <button type="submit" className="btn-primary self-start" disabled={busy}>
        Change password
      </button>
    </form>
  );
}

function DevicesList({ account }: { account: Account }) {
  const toast = useToast();
  const remove = useRemoveDevice();
  const mine = isDemo ? 'this-device' : getDeviceId();
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-sm font-bold">
        Active devices <span className="font-medium text-ink-3">· {account.devices.length} of {account.maxDevices} allowed</span>
      </p>
      <ul className="flex flex-col gap-2.5">
        {account.devices.map((d) => {
          const isThis = d.deviceId === mine;
          const Icon = d.platform === 'web' ? Monitor : Smartphone;
          return (
            <li key={d.id} className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-mist text-ink-2">
                <Icon aria-hidden className="size-[18px]" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-bold">{d.deviceName ?? 'Device'}</span>
                <span className="text-[13px] text-ink-3">{isThis ? 'This device' : `Last active ${formatRelative(d.lastActiveAt).toLowerCase()}`}</span>
              </span>
              {!isThis && (
                <button
                  type="button"
                  className="btn-secondary h-11 px-3.5"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(d.id, { onSuccess: () => toast.show('Device removed'), onError: toast.error })}
                >
                  Remove
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PaymentsList({ account }: { account: Account }) {
  const toast = useToast();
  if (account.payments.length === 0) return <p className="text-sm text-ink-3">No payments yet.</p>;
  return (
    <ul className="flex flex-col">
      {account.payments.map((p, i) => (
        <li key={p.id} className={`flex items-center gap-3 py-2.5 ${i < account.payments.length - 1 ? 'border-b border-line-soft' : ''}`}>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-sm font-bold">{p.packageName}</span>
            <span className="text-[13px] text-ink-3">
              {formatDate(p.paidAt)} · {p.amountInr === null ? '[AMOUNT]' : inr(p.amountInr)}
            </span>
          </span>
          <button
            type="button"
            aria-label={`Download invoice for ${p.packageName}`}
            onClick={() => toast.show('Invoice PDFs will be available here once billing is set up.', 'info')}
            className="flex size-11 items-center justify-center rounded-[10px] border border-line-strong bg-white hover:bg-mist-4"
          >
            <Download aria-hidden className="size-[18px]" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function NotificationsList() {
  const { data } = useNotifications();
  if (!data?.length) return <p className="text-sm text-ink-3">You are all caught up.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {data.map((n) => (
        <li key={n.id} className="flex flex-col gap-0.5">
          <span className="text-sm font-bold">{n.title}</span>
          {n.body && <span className="text-[13px] text-ink-3">{n.body}</span>}
          <span className="text-xs text-ink-3">{formatRelative(n.createdAt)}</span>
        </li>
      ))}
    </ul>
  );
}

type Sheet = null | 'password' | 'devices' | 'payments' | 'notifications' | 'help';

function SettingsRow({ icon, label, extra, onClick, last }: { icon: ReactNode; label: string; extra?: string; onClick: () => void; last?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`flex min-h-[52px] w-full items-center gap-3 px-4 text-left ${last ? '' : 'border-b border-line-soft'}`}>
      <span className="text-ink-2">{icon}</span>
      <span className="flex-1 text-sm font-semibold">{label}</span>
      {extra && <span className="text-[13px] text-ink-3">{extra}</span>}
      <ChevronRight aria-hidden className="size-4 text-ink-3" />
    </button>
  );
}

export default function Profile() {
  const { data: account, isLoading, error, refetch } = useAccount();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [sheet, setSheet] = useState<Sheet>(null);
  const editOpen = params.get('edit') === '1';
  const setEdit = (on: boolean) => setParams(on ? { edit: '1' } : {}, { replace: true });

  if (isLoading) return <PageLoader />;
  if (error || !account) return <ErrorState error={error} onRetry={() => refetch()} />;
  const p = account.profile;

  const logout = async (everywhere: boolean) => {
    if (isDemo) return toast.show('Demo mode: there is no real sign-in to end.', 'info');
    await signOut(everywhere);
    navigate('/login');
  };
  const renew = () => toast.show(RENEW_NOTE, 'info');
  const examText = p.targetExamDate ? `${p.targetCourseLabel ?? 'Exam'} · ${formatDate(`${p.targetExamDate}T00:00:00`)}` : 'Not set';

  const sheetTitle: Record<Exclude<Sheet, null>, string> = {
    password: 'Change password',
    devices: 'Active devices',
    payments: 'Payments and invoices',
    notifications: 'Notifications',
    help: 'Help and support',
  };

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <header>
        <h1 className="text-[26px] font-extrabold leading-tight tracking-tight lg:text-[28px]">Profile</h1>
        <p className="mt-1 hidden text-[15px] text-ink-3 lg:block">Your details, course access and devices.</p>
      </header>

      {/* details */}
      <section aria-labelledby="me-h" className="card flex flex-wrap items-center justify-between gap-x-7 gap-y-3.5 p-[18px] lg:gap-y-5 lg:p-7">
        <div className="flex min-w-0 flex-1 items-center gap-3.5 lg:flex-[1_1_280px] lg:gap-[18px]">
          <Avatar name={p.fullName} size={60} className="bg-brand text-white lg:hidden" />
          <Avatar name={p.fullName} size={72} className="hidden bg-brand text-white lg:flex" />
          <div className="min-w-0 flex-1">
            <h2 id="me-h" className="text-lg font-extrabold lg:text-[22px]">
              {p.fullName || 'Your name'}
            </h2>
            <p className="text-[13px] text-ink-3 lg:text-sm">Student since {formatDate(p.createdAt)}</p>
          </div>
          <button type="button" aria-label="Edit details" onClick={() => setEdit(true)} className="flex size-11 items-center justify-center rounded-xl border border-line-strong bg-white lg:hidden">
            <Pencil aria-hidden className="size-[18px]" />
          </button>
        </div>
        <button type="button" onClick={() => setEdit(true)} className="btn-secondary hidden lg:inline-flex">
          Edit details
        </button>
        <dl className="grid w-full gap-0 border-t border-line-soft lg:grid-cols-[repeat(auto-fit,minmax(220px,1fr))] lg:gap-x-6 lg:gap-y-4 lg:pt-5">
          {[
            ['Full name', p.fullName || '—', 'hidden lg:block'],
            ['Mobile', p.phone ?? '—', ''],
            ['Email', p.email ?? '—', ''],
            ['Target exam', examText, ''],
          ].map(([k, v, cls], i) => (
            <div key={k} className={`flex justify-between gap-3 border-b border-line-soft py-2.5 last:border-0 lg:block lg:border-0 lg:py-0 ${cls}`}>
              <dt className="text-[13px] font-semibold text-ink-3">{k === 'Mobile' ? <><span className="lg:hidden">Mobile</span><span className="hidden lg:inline">Mobile number</span></> : k}</dt>
              <dd className="flex flex-wrap items-center justify-end gap-2 text-right text-sm font-semibold [overflow-wrap:anywhere] lg:mt-1 lg:justify-start lg:text-left lg:text-[15px]">
                {v}
                {i === 1 && p.phoneVerified && <Pill tone="active">Verified</Pill>}
              </dd>
            </div>
          ))}
        </dl>
        <p className="-mt-1.5 hidden w-full text-[13px] text-ink-3 lg:block">Name, mobile and email come from your sign-up.</p>
      </section>

      {/* access */}
      <section aria-labelledby="access-h" className="flex flex-col gap-2 lg:card lg:gap-3 lg:px-7 lg:py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="access-h" className="px-0.5 text-base font-extrabold lg:text-lg">
            My courses and validity
          </h2>
          <Link to="/courses" className="link-brand hidden lg:inline-flex">
            Explore more courses
          </Link>
        </div>
        {account.access.length === 0 ? (
          <p className="card p-4 text-sm text-ink-3 lg:border-0 lg:p-0">You have no course access yet.</p>
        ) : (
          <>
            <ul className="card px-4 lg:hidden">
              {account.access.map((a, i) => (
                <li key={`${a.program}-${a.validUntil}`} className={`flex items-center gap-3 py-3 ${i < account.access.length - 1 ? 'border-b border-line-soft' : ''}`}>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-bold">{a.program}</span>
                    <span className="text-xs text-ink-3">
                      {a.courses} · till {formatDate(a.validUntil)}
                    </span>
                    {a.status === 'ending' && <span className="text-xs font-bold text-warn-text">Ends in {a.daysLeft} days</span>}
                    {a.status === 'expired' && <span className="text-xs font-bold text-ink-2">Expired</span>}
                  </span>
                  {a.status === 'active' ? (
                    <Pill tone="active">{a.daysLeft} days</Pill>
                  ) : (
                    <button type="button" onClick={renew} className="btn-warn h-11 px-3.5 text-[13px]">
                      Renew
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[680px] border-collapse text-sm">
                <thead>
                  <tr className="text-left text-[13px] text-ink-3">
                    <th scope="col" className="border-b border-line py-2.5 pr-3 font-semibold">Course</th>
                    <th scope="col" className="border-b border-line px-3 py-2.5 font-semibold">Includes</th>
                    <th scope="col" className="border-b border-line px-3 py-2.5 font-semibold">Valid till</th>
                    <th scope="col" className="border-b border-line px-3 py-2.5 font-semibold">Status</th>
                    <th scope="col" className="border-b border-line py-2.5">
                      <span className="sr-only">Action</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {account.access.map((a, i) => {
                    const b = i < account.access.length - 1 ? 'border-b border-line-soft' : '';
                    return (
                      <tr key={`${a.program}-${a.validUntil}`}>
                        <td className={`py-3.5 pr-3 font-bold ${b}`}>{a.program}</td>
                        <td className={`px-3 py-3.5 text-ink-2 ${b}`}>{a.courses}</td>
                        <td className={`px-3 py-3.5 text-ink-2 ${b}`}>{formatDate(a.validUntil)}</td>
                        <td className={`px-3 py-3.5 ${b}`}>{accessBadge(a)}</td>
                        <td className={`py-1.5 text-right ${b}`}>
                          {a.status === 'active' ? (
                            <Link to="/courses" className="link-brand">Open</Link>
                          ) : (
                            <button type="button" onClick={renew} className="btn-warn h-11 px-4">
                              Renew
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* desktop: login & devices + payments */}
      <div className="hidden flex-wrap gap-6 lg:flex">
        <section aria-labelledby="sec-h" className="card flex min-w-0 flex-[1_1_380px] flex-col gap-3.5 p-6">
          <h2 id="sec-h" className="text-lg font-extrabold">
            Login and devices
          </h2>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft pb-3.5">
            <div>
              <p className="text-[15px] font-bold">Password</p>
              <p className="mt-0.5 text-[13px] text-ink-3">Use at least 8 characters</p>
            </div>
            <button type="button" className="btn-secondary" onClick={() => setSheet('password')}>
              Change password
            </button>
          </div>
          <DevicesList account={account} />
        </section>
        <section aria-labelledby="pay-h" className="card flex min-w-0 flex-[1_1_380px] flex-col gap-3.5 p-6">
          <h2 id="pay-h" className="text-lg font-extrabold">
            Payments
          </h2>
          <PaymentsList account={account} />
        </section>
      </div>

      {/* phone: settings rows */}
      <section aria-label="Settings" className="card py-1 lg:hidden">
        <SettingsRow icon={<Lock aria-hidden className="size-[18px]" />} label="Change password" onClick={() => setSheet('password')} />
        <SettingsRow icon={<Smartphone aria-hidden className="size-[18px]" />} label="Active devices" extra={`${account.devices.length} of ${account.maxDevices}`} onClick={() => setSheet('devices')} />
        <SettingsRow icon={<FileText aria-hidden className="size-[18px]" />} label="Payments and invoices" onClick={() => setSheet('payments')} />
        <SettingsRow icon={<Bell aria-hidden className="size-[18px]" />} label="Notifications" onClick={() => setSheet('notifications')} />
        <SettingsRow icon={<MessageCircle aria-hidden className="size-[18px]" />} label="Help and support" onClick={() => setSheet('help')} last />
      </section>

      {/* log out */}
      <section aria-labelledby="out-h" className="flex flex-col gap-1 lg:card lg:flex-row lg:flex-wrap lg:items-center lg:justify-between lg:gap-4 lg:px-7 lg:py-[22px]">
        <div className="hidden min-w-0 lg:block lg:flex-[1_1_320px]">
          <h2 id="out-h" className="text-lg font-extrabold">
            Log out
          </h2>
          <p className="mt-1 text-sm text-ink-3">Sign out on this device, or on every device at once.</p>
        </div>
        <div className="flex flex-col gap-1 lg:flex-row-reverse lg:flex-wrap lg:gap-2.5">
          <button type="button" onClick={() => logout(false)} className="btn-secondary h-12 rounded-xl text-[15px] lg:btn-dark lg:h-11 lg:rounded-[10px] lg:text-sm">
            <LogOut aria-hidden className="size-[18px]" />
            Log out
          </button>
          <button type="button" onClick={() => logout(true)} className="btn h-11 text-[13px] font-semibold text-ink-3 lg:btn-secondary lg:text-sm lg:text-ink">
            Log out of all devices
          </button>
        </div>
      </section>

      <EditProfileModal open={editOpen} onClose={() => setEdit(false)} account={account} />
      <Modal open={sheet !== null} onClose={() => setSheet(null)} title={sheet ? sheetTitle[sheet] : ''}>
        {sheet === 'password' && <PasswordForm onDone={() => setSheet(null)} />}
        {sheet === 'devices' && <DevicesList account={account} />}
        {sheet === 'payments' && <PaymentsList account={account} />}
        {sheet === 'notifications' && <NotificationsList />}
        {sheet === 'help' && (
          <p className="text-sm text-ink-2">
            Write to us at <strong>{SUPPORT_CONTACT}</strong>. Include your registered email so we can find your account quickly.
          </p>
        )}
      </Modal>
    </div>
  );
}
