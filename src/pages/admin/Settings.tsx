import { useMemo, useState, type ReactNode } from 'react';
import { ImagePlus, Plus } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { Avatar, BRAND_INITIALS, BRAND_NAME, Field, Modal, NOT_CONNECTED, SampleNotice, Switch } from '@/components/ui';
import { staffAccounts, type StaffAccount } from '@/data/adminDemo';
import { cx, formatRelative } from '@/lib/format';
import type { Role } from '@/lib/types';

const PRESETS = ['#2348C9', '#0F766E', '#7C3AED', '#B45309', '#BE123C', '#0E7490'];
const REMINDER_DAYS = [30, 15, 7, 3, 1];
const ROLE_INFO: Record<Exclude<Role, 'student'>, { label: string; text: string }> = {
  faculty: { label: 'Faculty', text: 'Adds videos, eBooks and questions. Cannot publish questions unless they are the reviewer.' },
  admin: { label: 'Admin', text: 'Everything faculty can do, plus students, payments and publishing.' },
  super_admin: { label: 'Super admin', text: 'Everything, including settings and staff accounts.' },
};

function Section({ id, title, text, children }: { id: string; title: string; text?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="card grid gap-5 p-5 lg:grid-cols-[260px_1fr] lg:gap-8 lg:p-6">
      <div>
        <h2 id={id} className="text-lg font-extrabold">
          {title}
        </h2>
        {text && <p className="mt-1 text-[13px] text-ink-3">{text}</p>}
      </div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  );
}

export default function Settings() {
  const toast = useToast();
  const [name, setName] = useState(BRAND_NAME);
  const [initials, setInitials] = useState(BRAND_INITIALS);
  const [color, setColor] = useState(PRESETS[0]);
  const [supportEmail, setSupportEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [devices, setDevices] = useState(2);
  const [watchedAt, setWatchedAt] = useState(90);
  const [reminders, setReminders] = useState<number[]>([15, 7, 1]);
  const [watermark, setWatermark] = useState(true);
  const [ebookDownload, setEbookDownload] = useState(false);
  const [staff, setStaff] = useState<StaffAccount[]>(() => staffAccounts());
  const [inviting, setInviting] = useState(false);
  const validColor = useMemo(() => /^#[0-9a-f]{6}$/i.test(color), [color]);

  const save = () => toast.show(NOT_CONNECTED, 'info');
  const toggleReminder = (d: number) => setReminders((r) => (r.includes(d) ? r.filter((x) => x !== d) : [...r, d].sort((a, b) => b - a)));

  return (
    <div className="flex flex-col gap-5 pb-20 lg:pb-0">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold leading-tight tracking-tight lg:text-[28px]">Settings</h1>
          <p className="mt-1 text-sm text-ink-3">Branding, student access rules and staff accounts.</p>
        </div>
        <button type="button" className="btn-primary hidden lg:inline-flex" onClick={save}>
          Save changes
        </button>
      </header>
      <SampleNotice />

      <Section id="st-brand" title="Academy and branding" text="Shown on the login page, the student app, invoices and emails.">
        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <Field label="Academy name" htmlFor="st-name">
            <input id="st-name" className="field" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Short initials" htmlFor="st-initials" hint="Used when there is no logo">
            <input id="st-initials" maxLength={3} className="field uppercase" value={initials} onChange={(e) => setInitials(e.target.value.toUpperCase())} />
          </Field>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="field-label">Logo</span>
          <button
            type="button"
            onClick={save}
            className="flex items-center gap-3 rounded-xl border-2 border-dashed border-line-dash px-4 py-4 text-left hover:bg-mist-4"
          >
            <ImagePlus aria-hidden className="size-6 shrink-0 text-ink-3" />
            <span>
              <span className="block text-sm font-bold">Upload logo</span>
              <span className="block text-xs text-ink-3">PNG or SVG, square, at least 256 × 256 px</span>
            </span>
          </button>
        </div>
        <div className="flex flex-col gap-2">
          <span className="field-label" id="st-color-label">
            Brand colour
          </span>
          <div role="group" aria-labelledby="st-color-label" className="flex flex-wrap items-center gap-2">
            {PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Use colour ${c}`}
                aria-pressed={color.toLowerCase() === c.toLowerCase()}
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={cx('size-10 rounded-full', color.toLowerCase() === c.toLowerCase() && 'ring-2 ring-ink ring-offset-2')}
              />
            ))}
            <label className="flex items-center gap-2">
              <span className="sr-only">Custom colour code</span>
              <input className={cx('field w-28 font-mono', !validColor && 'border-warn-strong')} value={color} onChange={(e) => setColor(e.target.value)} />
            </label>
          </div>
        </div>
        <div className="flex flex-col gap-2 rounded-2xl bg-mist-4 p-4">
          <p className="text-xs font-bold text-ink-3">Preview</p>
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-2.5">
              <span className="flex size-10 items-center justify-center rounded-xl text-sm font-extrabold text-white" style={{ backgroundColor: validColor ? color : PRESETS[0] }}>
                {initials || 'YA'}
              </span>
              <span className="text-[15px] font-bold">{name || 'Academy name'}</span>
            </span>
            <span className="inline-flex h-10 items-center rounded-[10px] px-4 text-sm font-bold text-white" style={{ backgroundColor: validColor ? color : PRESETS[0] }}>
              Resume video
            </span>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Support email" htmlFor="st-email">
            <input id="st-email" type="email" className="field" placeholder="support@youracademy.com" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} />
          </Field>
          <Field label="Support WhatsApp number" htmlFor="st-wa" hint="Students see a WhatsApp button on their profile">
            <input id="st-wa" inputMode="tel" className="field" placeholder="+91 98765 43210" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section id="st-access" title="Student access" text="Rules that protect your videos and decide when a chapter counts as done.">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold" id="st-devices-label">
              Devices per student
            </p>
            <p className="text-xs text-ink-3">Logging in on a new device beyond this is blocked until a device is removed.</p>
          </div>
          <div role="group" aria-labelledby="st-devices-label" className="flex items-center rounded-xl border border-line-strong">
            <button type="button" aria-label="Fewer devices" disabled={devices <= 1} onClick={() => setDevices((d) => d - 1)} className="flex size-11 items-center justify-center text-lg font-bold disabled:opacity-30">
              −
            </button>
            <output aria-live="polite" className="w-10 text-center text-base font-extrabold">
              {devices}
            </output>
            <button type="button" aria-label="More devices" disabled={devices >= 5} onClick={() => setDevices((d) => d + 1)} className="flex size-11 items-center justify-center text-lg font-bold disabled:opacity-30">
              +
            </button>
          </div>
        </div>
        <Field label="A video counts as watched after" htmlFor="st-watched">
          <select id="st-watched" className="field sm:w-60" value={watchedAt} onChange={(e) => setWatchedAt(Number(e.target.value))}>
            {[70, 80, 90, 95].map((p) => (
              <option key={p} value={p}>
                {p}% of the video
              </option>
            ))}
          </select>
        </Field>
        <div className="flex flex-col gap-2">
          <p className="field-label" id="st-rem-label">
            Remind students before access ends
          </p>
          <div role="group" aria-labelledby="st-rem-label" className="flex flex-wrap gap-2">
            {REMINDER_DAYS.map((d) => {
              const on = reminders.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleReminder(d)}
                  className={cx('h-10 rounded-full border px-4 text-sm font-bold', on ? 'border-brand bg-brand text-white' : 'border-line-strong bg-white')}
                >
                  {d === 1 ? '1 day' : `${d} days`}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col gap-1 border-t border-line-soft pt-3">
          <Switch checked={watermark} onChange={setWatermark} label="Watermark videos and eBooks" hint="Shows the student's phone number on screen to stop recording and sharing." />
          <Switch checked={ebookDownload} onChange={setEbookDownload} label="Allow eBook download" hint="Off: students can only read eBooks inside the app." />
        </div>
      </Section>

      <Section id="st-staff" title="Staff and roles" text="Faculty and admins who can sign in to this admin panel.">
        <ul className="flex flex-col divide-y divide-line-soft rounded-xl border border-line">
          {staff.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Avatar name={s.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{s.name}</p>
                <p className="truncate text-xs text-ink-3">
                  {s.email} · active {formatRelative(s.lastActive).toLowerCase()}
                </p>
              </div>
              <label className="w-full sm:w-40">
                <span className="sr-only">Role for {s.name}</span>
                <select
                  className="field"
                  value={s.role}
                  disabled={s.role === 'super_admin' && staff.filter((x) => x.role === 'super_admin').length === 1}
                  onChange={(e) => setStaff((xs) => xs.map((x) => (x.id === s.id ? { ...x, role: e.target.value as Role } : x)))}
                >
                  {Object.entries(ROLE_INFO).map(([r, info]) => (
                    <option key={r} value={r}>
                      {info.label}
                    </option>
                  ))}
                </select>
              </label>
            </li>
          ))}
        </ul>
        <button type="button" className="btn-secondary self-start" onClick={() => setInviting(true)}>
          <Plus aria-hidden className="size-4" />
          Add staff member
        </button>
        <dl className="flex flex-col gap-1.5 rounded-xl bg-mist-4 px-4 py-3 text-[13px]">
          {Object.values(ROLE_INFO).map((r) => (
            <div key={r.label}>
              <dt className="inline font-bold">{r.label}: </dt>
              <dd className="inline text-ink-2">{r.text}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white px-4 py-2.5 pb-safe lg:hidden">
        <button type="button" className="btn-primary w-full" onClick={save}>
          Save changes
        </button>
      </div>

      <Modal
        open={inviting}
        onClose={() => setInviting(false)}
        title="Add staff member"
        description="They get an email with a link to set their password."
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setInviting(false)}>
              Cancel
            </button>
            <button type="submit" form="invite-form" className="btn-primary">
              Send invite
            </button>
          </>
        }
      >
        <form
          id="invite-form"
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setInviting(false);
            toast.show(NOT_CONNECTED, 'info');
          }}
        >
          <Field label="Full name" htmlFor="inv-name">
            <input id="inv-name" required className="field" />
          </Field>
          <Field label="Email" htmlFor="inv-email">
            <input id="inv-email" type="email" required className="field" />
          </Field>
          <Field label="Role" htmlFor="inv-role">
            <select id="inv-role" className="field" defaultValue="faculty">
              {Object.entries(ROLE_INFO).map(([r, info]) => (
                <option key={r} value={r}>
                  {info.label}
                </option>
              ))}
            </select>
          </Field>
        </form>
      </Modal>
    </div>
  );
}
