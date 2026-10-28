import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useMarkNotificationsRead, useNotifications } from '@/lib/api';
import { cx, formatRelative } from '@/lib/format';

export default function Notifications({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const unread = (data ?? []).filter((n) => !n.readAt);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cx('relative', className)}>
      <button
        type="button"
        aria-label={unread.length ? `Notifications, ${unread.length} unread` : 'Notifications'}
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o);
          if (!open && unread.length) markRead.mutate(unread.map((n) => n.id));
        }}
        className="relative flex size-11 items-center justify-center rounded-xl border border-line bg-white text-ink hover:bg-mist-4"
      >
        <Bell aria-hidden className="size-[18px]" />
        {unread.length > 0 && (
          <span aria-hidden className="absolute right-2 top-2 size-2.5 rounded-full border-2 border-white bg-warn-strong" />
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-[52px] z-30 w-[min(340px,calc(100vw-32px))] rounded-2xl border border-line bg-white p-2 shadow-xl">
          <p className="px-3 py-2 text-sm font-extrabold">Notifications</p>
          {(data ?? []).length === 0 ? (
            <p className="px-3 pb-3 text-sm text-ink-3">You are all caught up.</p>
          ) : (
            <ul className="flex flex-col">
              {data!.map((n) => {
                const body = (
                  <>
                    <span className="text-sm font-bold">{n.title}</span>
                    {n.body && <span className="text-[13px] text-ink-3">{n.body}</span>}
                    <span className="text-xs text-ink-3">{formatRelative(n.createdAt)}</span>
                  </>
                );
                return (
                  <li key={n.id}>
                    {n.link ? (
                      <Link to={n.link} onClick={() => setOpen(false)} className="flex flex-col gap-0.5 rounded-xl px-3 py-2.5 hover:bg-mist-4">
                        {body}
                      </Link>
                    ) : (
                      <div className="flex flex-col gap-0.5 px-3 py-2.5">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
