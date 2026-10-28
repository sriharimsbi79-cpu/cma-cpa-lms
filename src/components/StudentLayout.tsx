import { useMemo } from 'react';
import { Link, NavLink, Outlet, useLocation, useMatch, useNavigate } from 'react-router-dom';
import { BookOpen, ClipboardList, Home, LayoutDashboard, LogOut, User } from 'lucide-react';
import { useCatalog, useChapter } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cx } from '@/lib/format';
import { isDemo } from '@/lib/supabase';
import { isStaffRole, type CatalogCourse } from '@/lib/types';
import { Avatar, DemoBanner, LockIcon, Logo } from './ui';

function useActiveCourseId(): string | null {
  const course = useMatch('/courses/:courseId');
  const chapter = useMatch('/chapters/:chapterId');
  const { data: ch } = useChapter(chapter?.params.chapterId);
  return course?.params.courseId ?? ch?.courseId ?? null;
}

function groupByProgram(courses: CatalogCourse[]) {
  const map = new Map<string, { name: string; short: string; slug: string; courses: CatalogCourse[] }>();
  for (const c of courses) {
    if (!map.has(c.programId)) map.set(c.programId, { name: c.programName, short: c.programShort, slug: c.programSlug, courses: [] });
    map.get(c.programId)!.courses.push(c);
  }
  return [...map.values()];
}

const navItem =
  'flex items-center gap-3 rounded-[10px] px-3 py-3 text-sm font-semibold leading-6 transition-colors';

function Sidebar() {
  const { me, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: catalog } = useCatalog();
  const activeCourse = useActiveCourseId();
  const groups = useMemo(() => groupByProgram(catalog ?? []), [catalog]);

  return (
    <div className="hidden w-[264px] shrink-0 bg-navy lg:block">
    <nav
      aria-label="Main menu"
      className="sticky top-0 flex h-screen flex-col gap-7 overflow-y-auto px-4 py-6 text-navy-text"
    >
      <Logo />
      <div className="flex flex-col gap-1">
        <NavLink
          to="/"
          end
          className={({ isActive }) => cx(navItem, isActive ? 'bg-brand text-white' : 'hover:bg-navy-2')}
        >
          <Home aria-hidden className="size-[18px]" />
          Home
        </NavLink>
        <NavLink
          to="/courses"
          end
          className={({ isActive }) => cx(navItem, 'pb-1 text-white', isActive ? 'bg-brand' : 'hover:bg-navy-2')}
        >
          <BookOpen aria-hidden className="size-[18px]" />
          Courses
        </NavLink>
        <div className="flex flex-col gap-0.5 pl-[30px]">
          {groups.map((g) =>
            g.slug === 'cpa-usa' ? (
              <div key={g.slug}>
                <p className="px-3 pb-1 pt-2.5 text-xs font-bold text-navy-muted">{g.name}</p>
                <div className="grid grid-cols-3 gap-1.5 pb-1 pl-2">
                  {g.courses.map((c) => {
                    const on = activeCourse === c.courseId;
                    return (
                      <Link
                        key={c.courseId}
                        to={`/courses/${c.courseId}`}
                        aria-current={on ? 'page' : undefined}
                        aria-label={c.enrolled ? c.name : `${c.name}, not enrolled`}
                        className={cx(
                          'flex h-11 items-center justify-center gap-1 rounded-lg text-[13px] font-semibold transition-colors',
                          on ? 'bg-white text-navy' : c.enrolled ? 'bg-navy-2 text-navy-text hover:bg-navy-3' : 'bg-navy-2/60 text-navy-dim hover:bg-navy-3',
                        )}
                      >
                        {c.name}
                        {!c.enrolled && <LockIcon className="size-3" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div key={g.slug}>
                <p className="px-3 pb-0.5 pt-2.5 text-xs font-bold text-navy-muted">{g.name}</p>
                {g.courses.map((c) => {
                  const on = activeCourse === c.courseId;
                  return (
                    <Link
                      key={c.courseId}
                      to={`/courses/${c.courseId}`}
                      aria-current={on ? 'page' : undefined}
                      aria-label={c.enrolled ? undefined : `${c.name}, not enrolled`}
                      className={cx(
                        'flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm leading-6 transition-colors',
                        on ? 'bg-navy-3 font-bold text-white' : c.enrolled ? 'text-navy-text hover:bg-navy-2' : 'text-navy-dim hover:bg-navy-2',
                      )}
                    >
                      <span className="flex items-center gap-2">
                        {on && <span aria-hidden className="size-1.5 rounded-full bg-white" />}
                        {c.name}
                      </span>
                      {!c.enrolled && <LockIcon />}
                    </Link>
                  );
                })}
              </div>
            ),
          )}
        </div>
        <NavLink
          to="/mock-tests"
          className={({ isActive }) => cx(navItem, isActive ? 'bg-brand text-white' : 'hover:bg-navy-2')}
        >
          <ClipboardList aria-hidden className="size-[18px]" />
          Mock tests
        </NavLink>
        <NavLink
          to="/profile"
          className={({ isActive }) => cx(navItem, isActive ? 'bg-brand text-white' : 'hover:bg-navy-2')}
        >
          <User aria-hidden className="size-[18px]" />
          Profile
        </NavLink>
        {(isDemo || isStaffRole(me?.role)) && (
          <Link to="/admin" className={cx(navItem, 'mt-2 border border-navy-3 hover:bg-navy-2')}>
            <LayoutDashboard aria-hidden className="size-[18px]" />
            Admin panel
          </Link>
        )}
      </div>
      <div className="mt-auto flex flex-col gap-2 border-t border-navy-3 pt-4">
        <div className="flex items-center gap-3 px-2">
          <Avatar name={me?.fullName} className="bg-navy-3 text-white" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold text-white">{me?.fullName || 'Student'}</span>
            <span className="truncate text-xs text-navy-muted">{me?.email}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={async () => {
            await signOut();
            navigate('/login');
          }}
          className={cx(navItem, 'text-left hover:bg-navy-2')}
        >
          <LogOut aria-hidden className="size-[18px]" />
          Log out
        </button>
      </div>
    </nav>
    </div>
  );
}

function BottomTabs() {
  const { pathname } = useLocation();
  const tabs = [
    { to: '/', label: 'Home', icon: Home, on: pathname === '/' },
    { to: '/courses', label: 'Courses', icon: BookOpen, on: pathname.startsWith('/courses') || pathname.startsWith('/chapters') },
    { to: '/mock-tests', label: 'Mock tests', icon: ClipboardList, on: pathname.startsWith('/mock-tests') || pathname.startsWith('/tests') },
    { to: '/profile', label: 'Profile', icon: User, on: pathname.startsWith('/profile') },
  ];
  return (
    <nav
      aria-label="Main menu"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-white px-2 pb-safe pt-1.5 lg:hidden"
    >
      {tabs.map((t) => (
        <Link
          key={t.to}
          to={t.to}
          aria-current={t.on ? 'page' : undefined}
          className={cx(
            'flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-xs',
            t.on ? 'font-bold text-brand' : 'font-semibold text-ink-3',
          )}
        >
          <t.icon aria-hidden className="size-[22px]" />
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export default function StudentLayout() {
  const onChapter = useMatch('/chapters/:chapterId');
  return (
    <div className="min-h-screen bg-page lg:flex">
      <Sidebar />
      <div className="min-w-0 flex-1">
        {isDemo && <DemoBanner />}
        <main className={cx('w-full px-4 pb-28 pt-5 sm:px-6 lg:px-12 lg:pb-14 lg:pt-8', onChapter && 'pb-32')}>
          <div className="mx-auto w-full max-w-content">
            <Outlet />
          </div>
        </main>
      </div>
      {!onChapter && <BottomTabs />}
    </div>
  );
}
