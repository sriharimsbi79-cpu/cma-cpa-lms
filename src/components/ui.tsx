import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Lock, RefreshCw, X } from 'lucide-react';
import { cx, initials } from '@/lib/format';
import type { AccessStatus, CourseKind } from '@/lib/types';

export const BRAND_NAME = '[Your Academy]';
export const BRAND_INITIALS = 'YA';

export function Logo({ dark = true, subtitle = 'CMA · CPA · Technical skills', badge }: { dark?: boolean; subtitle?: string; badge?: ReactNode }) {
  return (
    <Link to="/" className="flex items-center gap-3 px-2">
      <span
        className={cx(
          'flex size-10 shrink-0 items-center justify-center rounded-xl text-[14px] font-extrabold text-white',
          dark ? 'bg-brand' : 'bg-navy',
        )}
      >
        {BRAND_INITIALS}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className={cx('text-base font-bold leading-tight', dark ? 'text-white' : 'text-ink')}>{BRAND_NAME}</span>
        {badge ?? <span className={cx('text-xs', dark ? 'text-navy-muted' : 'text-ink-3')}>{subtitle}</span>}
      </span>
    </Link>
  );
}

export function Avatar({ name, size = 36, className }: { name: string | null | undefined; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.max(12, Math.round(size * 0.36)) }}
      className={cx('flex shrink-0 items-center justify-center rounded-full font-bold', className ?? 'bg-mist-2 text-navy')}
    >
      {initials(name)}
    </span>
  );
}

export function ProgressBar({
  value,
  label,
  className,
  barClassName = 'bg-brand',
  trackClassName = 'bg-mist-3',
  height = 'h-2',
}: {
  value: number;
  label: string;
  className?: string;
  barClassName?: string;
  trackClassName?: string;
  height?: string;
}) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cx('overflow-hidden rounded-full', height, trackClassName, className)}
    >
      <div className={cx('h-full rounded-full', barClassName)} style={{ width: `${v}%` }} />
    </div>
  );
}

export function CourseIcon({ kind, code, size = 44 }: { kind: CourseKind; code: string; size?: number }) {
  const isCma = kind === 'cma_part';
  const label = isCma ? 'CMA' : kind === 'skill' ? (code === 'EXCEL' ? 'XL' : code.slice(0, 3)) : 'CPA';
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={cx(
        'flex shrink-0 items-center justify-center rounded-xl text-[13px] font-extrabold',
        isCma ? 'bg-brand/10 text-brand' : 'bg-mist-2 text-navy',
      )}
    >
      {label}
    </span>
  );
}

const ACCESS_STYLES: Record<AccessStatus | 'none', string> = {
  active: 'bg-ok-bg text-ok-fg',
  ending: 'bg-warn-bg text-warn-fg',
  expired: 'bg-mist text-ink-2',
  none: 'bg-mist text-ink-2',
};

export function Pill({ tone = 'none', children, className }: { tone?: AccessStatus | 'none' | 'brand' | 'dark'; children: ReactNode; className?: string }) {
  const style =
    tone === 'brand' ? 'bg-brand/10 text-brand' : tone === 'dark' ? 'bg-navy text-white' : ACCESS_STYLES[tone];
  return <span className={cx('inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold', style, className)}>{children}</span>;
}

export function LockIcon({ className }: { className?: string }) {
  return <Lock aria-hidden className={cx('size-3.5', className)} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx('animate-pulse rounded-xl bg-mist-2', className)} />;
}

export function PageLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="flex flex-col gap-4">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-40 w-full" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg = error instanceof Error ? error.message : 'Something went wrong.';
  return (
    <div role="alert" className="card flex flex-col items-start gap-3 p-6">
      <div className="flex items-center gap-2 font-bold text-warn-fg">
        <AlertTriangle aria-hidden className="size-5" />
        Could not load this page
      </div>
      <p className="text-sm text-ink-3">{msg}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary">
          <RefreshCw aria-hidden className="size-4" />
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 p-8 text-center">
      <p className="text-base font-bold">{title}</p>
      {text && <p className="max-w-md text-sm text-ink-3">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => {
      const first = ref.current?.querySelector<HTMLElement>('input, select, textarea, button:not([data-close])');
      (first ?? ref.current)?.focus();
    }, 0);
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/50 sm:items-center sm:p-6" onMouseDown={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
        className={cx(
          'flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[20px] bg-white sm:rounded-[20px]',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-md',
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line-soft px-5 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-extrabold">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-ink-3">{description}</p>}
          </div>
          <button
            type="button"
            data-close
            aria-label="Close"
            onClick={onClose}
            className="-mr-2 flex size-10 items-center justify-center rounded-lg text-ink-3 hover:bg-mist"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line-soft px-5 py-3 pb-safe">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, htmlFor, children, hint }: { label: string; htmlFor: string; children: ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="field-label">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

export function SectionHeader({ id, title, action, subtitle }: { id?: string; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 id={id} className="text-lg font-extrabold lg:text-xl">
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-[13px] text-ink-3">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** Segmented control / chip filter used on several screens. */
export function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  scroll = false,
}: {
  label: string;
  options: { value: T; label: string; count?: number | string }[];
  value: T;
  onChange: (v: T) => void;
  scroll?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cx('flex gap-2', scroll ? 'no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0' : 'flex-wrap')}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={cx(
              'inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm font-bold transition-colors',
              on ? 'border-brand bg-brand text-white' : 'border-line-strong bg-white text-ink hover:bg-mist-4',
            )}
          >
            {o.label}
            {o.count !== undefined && <span className="text-xs font-semibold opacity-85">{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function DemoBanner() {
  return (
    <div className="border-b border-warn-line bg-warn-bg px-4 py-2 text-center text-xs font-semibold text-warn-fg">
      Demo mode with sample data. To use your database, add your Supabase URL and anon key to the .env file.
    </div>
  );
}
