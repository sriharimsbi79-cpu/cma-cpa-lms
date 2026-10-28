import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronRight, Download, Pencil, Plus, Search } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { ChipGroup, EmptyState, Field, Modal, NOT_CONNECTED, Pill, ProgressBar, SampleNotice, Switch } from '@/components/ui';
import { coupons as demoCoupons, packages as demoPackages, payments as demoPayments, courseOptions, type AdminPayment, type CoursePackage, type PaymentStatus } from '@/data/adminDemo';
import { cx, formatDate, formatRelative, inr } from '@/lib/format';

const STATUS: Record<PaymentStatus, { label: string; tone: 'active' | 'ending' | 'none' }> = {
  paid: { label: 'Paid', tone: 'active' },
  failed: { label: 'Failed', tone: 'ending' },
  refunded: { label: 'Refunded', tone: 'none' },
};
const GST = 0.18;

type Tab = 'payments' | 'packages' | 'coupons';

// ---------- payments ----------
function PaymentsTab() {
  const toast = useToast();
  const all = useMemo(() => demoPayments(), []);
  const pkgs = useMemo(() => demoPackages(), []);
  const [status, setStatus] = useState<'all' | PaymentStatus>('all');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<AdminPayment | null>(null);
  const [manual, setManual] = useState(false);

  const monthAgo = Date.now() - 30 * 86_400_000;
  const recent = all.filter((p) => new Date(p.createdAt).getTime() >= monthAgo);
  const paid = recent.filter((p) => p.status === 'paid');
  const s = search.trim().toLowerCase();
  const rows = all.filter((p) => (status === 'all' || p.status === status) && (!s || `${p.studentName} ${p.email} ${p.invoiceNumber ?? ''} ${p.packageName}`.toLowerCase().includes(s)));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { l: 'Revenue, last 30 days', v: inr(paid.reduce((a, p) => a + p.amountInr, 0)) },
          { l: 'Successful payments', v: String(paid.length) },
          { l: 'Failed payments', v: String(recent.filter((p) => p.status === 'failed').length) },
          { l: 'Refunds', v: String(recent.filter((p) => p.status === 'refunded').length) },
        ].map((x) => (
          <div key={x.l} className="rounded-2xl border border-line bg-white px-4 py-3.5 lg:px-5">
            <p className="text-[13px] font-semibold text-ink-3">{x.l}</p>
            <p className="mt-0.5 text-2xl font-extrabold tracking-tight lg:text-[28px]">{x.v}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <ChipGroup
          label="Filter by status"
          scroll
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'All' },
            { value: 'paid', label: 'Paid' },
            { value: 'failed', label: 'Failed' },
            { value: 'refunded', label: 'Refunded' },
          ]}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative w-full lg:w-72">
            <span className="sr-only">Search payments</span>
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
            <input className="field pl-9" placeholder="Name, email or invoice" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <button type="button" className="btn-secondary" onClick={() => setManual(true)}>
            <Plus aria-hidden className="size-4" />
            Record manual payment
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No payments found" text="Try another filter or search." />
      ) : (
        <>
          <div className="card hidden overflow-hidden lg:block">
            <table className="w-full text-sm">
              <thead className="bg-mist-4 text-left text-xs text-ink-3">
                <tr>
                  <th scope="col" className="px-5 py-3 font-bold">Date</th>
                  <th scope="col" className="px-3 py-3 font-bold">Student</th>
                  <th scope="col" className="px-3 py-3 font-bold">Package</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold">Amount</th>
                  <th scope="col" className="px-3 py-3 font-bold">Method</th>
                  <th scope="col" className="px-3 py-3 font-bold">Status</th>
                  <th scope="col" className="px-5 py-3">
                    <span className="sr-only">Details</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-t border-line-soft hover:bg-mist-4">
                    <td className="whitespace-nowrap px-5 py-3.5 text-ink-2">{formatRelative(p.createdAt, true)}</td>
                    <td className="px-3 py-3.5">
                      <p className="font-bold">{p.studentName}</p>
                      <p className="text-xs text-ink-3">{p.email}</p>
                    </td>
                    <td className="px-3 py-3.5">
                      <p className="font-semibold">{p.packageName}</p>
                      {p.coupon && <p className="text-xs text-ink-3">Coupon {p.coupon}</p>}
                    </td>
                    <td className="px-3 py-3.5 text-right font-bold tabular-nums">{inr(p.amountInr)}</td>
                    <td className="px-3 py-3.5 text-ink-2">{p.method}</td>
                    <td className="px-3 py-3.5">
                      <Pill tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Pill>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button type="button" className="link-brand" onClick={() => setOpen(p)}>
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="flex flex-col gap-2.5 lg:hidden">
            {rows.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => setOpen(p)} className="card flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-bold">{p.studentName}</p>
                      <p className="shrink-0 font-extrabold tabular-nums">{inr(p.amountInr)}</p>
                    </div>
                    <p className="mt-0.5 truncate text-[13px] text-ink-2">{p.packageName}</p>
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-ink-3">
                      <Pill tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Pill>
                      {p.method} · {formatRelative(p.createdAt)}
                    </div>
                  </div>
                  <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-3" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <Modal
        open={!!open}
        onClose={() => setOpen(null)}
        title={open ? `${inr(open.amountInr)} · ${STATUS[open.status].label}` : ''}
        description={open ? `${open.studentName} · ${formatDate(open.createdAt)}` : undefined}
        footer={
          open && (
            <>
              {open.status === 'paid' && (
                <button type="button" className="btn-secondary" onClick={() => toast.show(NOT_CONNECTED, 'info')}>
                  Refund
                </button>
              )}
              {open.invoiceNumber && (
                <button type="button" className="btn-primary" onClick={() => toast.show(NOT_CONNECTED, 'info')}>
                  <Download aria-hidden className="size-4" />
                  Download invoice
                </button>
              )}
            </>
          )
        }
      >
        {open && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-sm">
            {[
              ['Package', open.packageName],
              ['Price before GST', inr(Math.round(open.amountInr / (1 + GST)))],
              ['GST (18%)', inr(open.amountInr - Math.round(open.amountInr / (1 + GST)))],
              ['Total paid', inr(open.amountInr)],
              ['Coupon', open.coupon ?? '—'],
              ['Method', open.method],
              ['Payment ID', open.gatewayId],
              ['Invoice', open.invoiceNumber ?? '—'],
              ['Email', open.email],
              ['Phone', open.phone],
            ].map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-ink-3">{k}</dt>
                <dd className={cx('font-semibold', k === 'Payment ID' && 'font-mono text-[13px]')}>{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </Modal>

      <Modal
        open={manual}
        onClose={() => setManual(false)}
        title="Record manual payment"
        description="For UPI or bank transfers you received directly. The student gets access to the package."
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setManual(false)}>
              Cancel
            </button>
            <button type="submit" form="manual-pay" className="btn-primary">
              Save payment
            </button>
          </>
        }
      >
        <form
          id="manual-pay"
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setManual(false);
            toast.show(NOT_CONNECTED, 'info');
          }}
        >
          <Field label="Student email" htmlFor="mp-email">
            <input id="mp-email" type="email" required className="field" placeholder="student@example.com" />
          </Field>
          <Field label="Package" htmlFor="mp-pkg">
            <select id="mp-pkg" className="field">
              {pkgs.map((p) => (
                <option key={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount received (₹)" htmlFor="mp-amt">
              <input id="mp-amt" type="number" min={0} required className="field" />
            </Field>
            <Field label="Method" htmlFor="mp-method">
              <select id="mp-method" className="field">
                <option>UPI</option>
                <option>Bank transfer</option>
                <option>Cash</option>
              </select>
            </Field>
          </div>
          <Field label="Reference number (optional)" htmlFor="mp-ref">
            <input id="mp-ref" className="field" placeholder="UPI or bank reference" />
          </Field>
        </form>
      </Modal>
    </div>
  );
}

// ---------- packages ----------
function PackagesTab() {
  const toast = useToast();
  const courses = useMemo(() => courseOptions(), []);
  const [list, setList] = useState(() => demoPackages());
  const [edit, setEdit] = useState<CoursePackage | 'new' | null>(null);
  const current = edit === 'new' ? null : edit;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-3">What students can buy. Each package gives access to one or more courses for a set time.</p>
        <button type="button" className="btn-primary" onClick={() => setEdit('new')}>
          <Plus aria-hidden className="size-4" />
          New package
        </button>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((p) => (
          <li key={p.id} className={cx('card flex flex-col gap-3 p-5', !p.active && 'opacity-70')}>
            <div className="flex items-start justify-between gap-3">
              <p className="font-extrabold">{p.name}</p>
              <button type="button" aria-label={`Edit ${p.name}`} onClick={() => setEdit(p)} className="-m-2 flex size-10 shrink-0 items-center justify-center rounded-lg text-ink-3 hover:bg-mist">
                <Pencil aria-hidden className="size-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {p.courses.map((c) => (
                <span key={c} className="rounded-full bg-mist px-2.5 py-0.5 text-xs font-semibold text-ink-2">
                  {c}
                </span>
              ))}
            </div>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-2xl font-extrabold tracking-tight">{inr(p.priceInr)}</p>
                <p className="text-xs text-ink-3">incl. GST · {p.validityMonths} months access</p>
              </div>
              <p className="text-xs text-ink-3">{p.sold} sold</p>
            </div>
            <div className="border-t border-line-soft pt-2">
              <Switch checked={p.active} onChange={(v) => setList((xs) => xs.map((x) => (x.id === p.id ? { ...x, active: v } : x)))} label="On sale" />
            </div>
          </li>
        ))}
      </ul>

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={current ? 'Edit package' : 'New package'}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setEdit(null)}>
              Cancel
            </button>
            <button type="submit" form="pkg-form" className="btn-primary">
              Save package
            </button>
          </>
        }
      >
        <form
          id="pkg-form"
          key={current?.id ?? 'new'}
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setEdit(null);
            toast.show(NOT_CONNECTED, 'info');
          }}
        >
          <Field label="Package name" htmlFor="pk-name">
            <input id="pk-name" required className="field" defaultValue={current?.name} placeholder="e.g. CMA USA · Part 1 + Part 2" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Price incl. GST (₹)" htmlFor="pk-price">
              <input id="pk-price" type="number" min={0} required className="field" defaultValue={current?.priceInr} />
            </Field>
            <Field label="Access (months)" htmlFor="pk-months">
              <input id="pk-months" type="number" min={1} required className="field" defaultValue={current?.validityMonths ?? 12} />
            </Field>
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="field-label mb-1">Courses included</legend>
            <div className="grid gap-1 sm:grid-cols-2">
              {courses.map((c) => (
                <label key={c.id} className="flex min-h-10 items-center gap-2.5 text-sm">
                  <input type="checkbox" className="size-[18px] accent-brand" defaultChecked={current?.courses.some((x) => c.label.endsWith(x))} />
                  {c.label}
                </label>
              ))}
            </div>
          </fieldset>
        </form>
      </Modal>
    </div>
  );
}

// ---------- coupons ----------
function CouponsTab() {
  const toast = useToast();
  const [list, setList] = useState(() => demoCoupons());
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-3">Discount codes students enter at checkout.</p>
        <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
          <Plus aria-hidden className="size-4" />
          New coupon
        </button>
      </div>
      <ul className="flex flex-col gap-2.5">
        {list.map((c) => {
          const expired = !!c.validUntil && new Date(c.validUntil).getTime() < Date.now();
          return (
            <li key={c.id} className="card flex flex-col gap-3 rounded-2xl px-4 py-4 sm:flex-row sm:items-center sm:gap-5 sm:px-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-mono text-base font-extrabold">{c.code}</p>
                  <Pill tone={c.active && !expired ? 'active' : 'none'}>{expired ? 'Expired' : c.active ? 'Active' : 'Off'}</Pill>
                </div>
                <p className="mt-0.5 text-[13px] text-ink-3">
                  {c.kind === 'percent' ? `${c.value}% off` : `${inr(c.value)} off`} · {c.validUntil ? `${expired ? 'ended' : 'valid till'} ${formatDate(c.validUntil)}` : 'no end date'}
                </p>
              </div>
              <div className="w-full sm:w-44">
                <p className="text-xs text-ink-3">
                  Used <b className="text-ink">{c.used}</b>
                  {c.limit ? ` of ${c.limit}` : ' times'}
                </p>
                {c.limit && <ProgressBar value={(100 * c.used) / c.limit} label={`${c.code} usage`} height="h-1.5" className="mt-1" />}
              </div>
              <div className="sm:w-28">
                <Switch checked={c.active} onChange={(v) => setList((xs) => xs.map((x) => (x.id === c.id ? { ...x, active: v } : x)))} label="Active" />
              </div>
            </li>
          );
        })}
      </ul>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="New coupon"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setCreating(false)}>
              Cancel
            </button>
            <button type="submit" form="coupon-form" className="btn-primary">
              Create coupon
            </button>
          </>
        }
      >
        <form
          id="coupon-form"
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setCreating(false);
            toast.show(NOT_CONNECTED, 'info');
          }}
        >
          <Field label="Code" htmlFor="cp-code" hint="Capital letters and numbers, e.g. NEWYEAR15">
            <input id="cp-code" required className="field font-mono uppercase" onChange={(e) => (e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Discount type" htmlFor="cp-kind">
              <select id="cp-kind" className="field">
                <option value="percent">Percent off</option>
                <option value="flat">Flat ₹ off</option>
              </select>
            </Field>
            <Field label="Discount value" htmlFor="cp-value">
              <input id="cp-value" type="number" min={1} required className="field" />
            </Field>
            <Field label="Usage limit (optional)" htmlFor="cp-limit">
              <input id="cp-limit" type="number" min={1} className="field" placeholder="Unlimited" />
            </Field>
            <Field label="Valid till (optional)" htmlFor="cp-until">
              <input id="cp-until" type="date" className="field" />
            </Field>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function Payments() {
  const [params, setParams] = useSearchParams();
  const tab = (['payments', 'packages', 'coupons'].includes(params.get('tab') ?? '') ? params.get('tab') : 'payments') as Tab;
  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-[26px] font-extrabold leading-tight tracking-tight lg:text-[28px]">Payments & coupons</h1>
        <p className="mt-1 text-sm text-ink-3">Payments from Razorpay and manual entries, course packages and discount codes.</p>
      </header>
      <SampleNotice />
      <ChipGroup
        label="Section"
        scroll
        value={tab}
        onChange={(v) => setParams(v === 'payments' ? {} : { tab: v }, { replace: true })}
        options={[
          { value: 'payments', label: 'Payments' },
          { value: 'packages', label: 'Packages & prices' },
          { value: 'coupons', label: 'Coupons' },
        ]}
      />
      {tab === 'payments' ? <PaymentsTab /> : tab === 'packages' ? <PackagesTab /> : <CouponsTab />}
    </div>
  );
}
