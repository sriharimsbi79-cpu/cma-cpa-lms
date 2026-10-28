const DAY = 86_400_000;

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDayMonth(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function formatLongToday(now = new Date()): string {
  return now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/** "Today, 11:40 AM", "Yesterday", "3 days ago", "21 Oct 2026" */
export function formatRelative(iso: string | null | undefined, withTime = false): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diffMin = Math.round((now.getTime() - d.getTime()) / 60_000);
  if (d.getTime() >= startToday) {
    if (withTime) return `Today, ${formatTime(iso)}`;
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    if (diffMin < 6 * 60) return `${Math.round(diffMin / 60)} h ago`;
    return 'Today';
  }
  if (d.getTime() >= startToday - DAY) return 'Yesterday';
  const days = Math.floor((startToday - d.getTime()) / DAY) + 1;
  if (days <= 6) return `${days} days ago`;
  return formatDayMonth(iso);
}

export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / DAY));
}

export function addDays(days: number, from = new Date()): string {
  return new Date(from.getTime() + days * DAY).toISOString();
}

export function clock(seconds: number | null | undefined): string {
  const s = Math.max(0, Math.round(seconds ?? 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function minutesLabel(seconds: number | null | undefined): string {
  if (!seconds) return '';
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

export function hoursMinutes(seconds: number | null | undefined): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

export function durationLabel(minutes: number): string {
  if (minutes % 60 === 0) {
    const h = minutes / 60;
    return `${h} hour${h === 1 ? '' : 's'}`;
  }
  return `${minutes} min`;
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function firstName(name: string | null | undefined): string {
  return (name ?? '').trim().split(/\s+/)[0] || 'there';
}

export function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function inr(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export function pct(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${Math.round(value)}%`;
}

export function num(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || v === '') return fallback;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** wa.me link with a ready message; phone like "+91 98765 43210" */
export function whatsappLink(phone: string | null | undefined, text: string): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length < 10) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
