import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ClipboardList,
  CreditCard,
  GraduationCap,
  HelpCircle,
  LayoutGrid,
  LogOut,
  Menu,
  SlidersHorizontal,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cx } from '@/lib/format';
import { isDemo } from '@/lib/supabase';
import { Avatar, BRAND_INITIALS, BRAND_NAME } from './ui';

const ROLE_LABEL = { student: 'Student', faculty: 'Faculty', admin: 'Admin', super_admin: 'Super admin' } as const;

const SECTIONS = [
  { title: 'Overview', items: [{ to: '/admin', end: true, label: 'Dashboard', icon: LayoutGrid }] },
  {
    title: 'Content',
    items: [
      { to: '/admin/content', label: 'Courses & content', icon: BookOpen },
      { to: '/admin/questions', label: 'Question bank', icon: HelpCircle },
      { to: '/admin/mock-tests', label: 'Mock tests', icon: ClipboardList },
    ],
  },
  {
    title: 'People',
    items: [
      { to: '/admin/students', label: 'Students', icon: Users },
      { to: '/admin/payments', label: 'Payments & coupons', icon: CreditCard },
      { to: '/admin/settings', label: 'Settings', icon: SlidersHorizontal },
    ],
  },
];

function NavBody({ onNavigate }: { onNavigate?: () => void }) {
  const { me, signOut } = useAuth();
  const navigate = useNavigate();
  const name = isDemo ? 'Kiran Rao' : me?.fullName || 'Staff';
  const role = isDemo ? 'Super admin' : me ? ROLE_LABEL[me.role] : '';
  return (
    <>
      <Link to="/admin" onClick={onNavigate} className="flex items-center gap-2.5 px-2">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-navy text-sm font-extrabold text-white">{BRAND_INITIALS}</span>
        <span className="flex flex-col gap-0.5">
          <span className="text-[15px] font-bold leading-tight">{BRAND_NAME}</span>
          <span className="self-start rounded-full bg-brand/10 px-2 py-px text-xs font-bold text-brand">Admin panel</span>
        </span>
      </Link>
      <div className="flex flex-col gap-0.5">
        {SECTIONS.map((s, i) => (
          <div key={s.title} className="flex flex-col gap-0.5">
            <span className={cx('px-3 pb-1 text-xs font-bold text-ink-3', i > 0 ? 'pt-3.5' : 'pt-1')}>{s.title}</span>
            {s.items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                end={'end' in it ? it.end : false}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cx(
                    'flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm leading-6',
                    isActive ? 'bg-brand/10 font-bold text-brand' : 'font-semibold text-ink-2 hover:bg-mist-4',
                  )
                }
              >
                <it.icon aria-hidden className="size-[18px]" />
                {it.label}
              </NavLink>
            ))}
          </div>
        ))}
        <Link to="/" onClick={onNavigate} className="mt-3 flex items-center gap-3 rounded-[10px] border border-line px-3 py-2.5 text-sm font-semibold text-ink-2 hover:bg-mist-4">
          <GraduationCap aria-hidden className="size-[18px]" />
          Student view
        </Link>
      </div>
      <div className="mt-auto flex flex-col gap-1.5 border-t border-line pt-4">
        <div className="flex items-center gap-3 px-2">
          <Avatar name={name} />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-bold">{name}</span>
            <span className="text-xs text-ink-3">{role}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={async () => {
            await signOut();
            navigate('/login');
          }}
          className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-sm font-semibold leading-6 text-ink-2 hover:bg-mist-4"
        >
          <LogOut aria-hidden className="size-[18px]" />
          Log out
        </button>
      </div>
    </>
  );
}

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <div className="min-h-screen bg-page lg:flex">
      <div className="hidden w-[248px] shrink-0 border-r border-line bg-white lg:block">
        <nav aria-label="Admin menu" className="sticky top-0 flex h-screen flex-col gap-6 overflow-y-auto px-3.5 py-6">
          <NavBody />
        </nav>
      </div>

      {/* phone / tablet top bar */}
      <div className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-white px-2 lg:hidden">
        <button type="button" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)} className="flex size-11 items-center justify-center rounded-xl">
          <Menu aria-hidden className="size-[22px]" />
        </button>
        <span className="flex size-8 items-center justify-center rounded-lg bg-navy text-xs font-extrabold text-white">{BRAND_INITIALS}</span>
        <span className="text-[15px] font-bold">Admin panel</span>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 bg-navy/50 lg:hidden" onMouseDown={() => setOpen(false)}>
          <nav
            aria-label="Admin menu"
            onMouseDown={(e) => e.stopPropagation()}
            className="flex h-full w-[min(300px,85vw)] flex-col gap-6 overflow-y-auto bg-white px-3.5 py-5"
          >
            <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="-mb-3 flex size-11 items-center justify-center self-end rounded-xl">
              <X aria-hidden className="size-5" />
            </button>
            <NavBody onNavigate={() => setOpen(false)} />
          </nav>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <main className="px-4 pb-14 pt-5 sm:px-6 lg:px-12 lg:pt-8">
          <div className="mx-auto w-full max-w-admin">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
