import { Link } from 'react-router-dom';

const COPY = {
  'mock-tests': {
    title: 'Mock tests',
    text: 'Create full-length mocks and practice sets per course, pick fixed or random questions, and see attempt results. Chapter tests are already set up from Courses & content.',
  },
  payments: {
    title: 'Payments & coupons',
    text: 'Course packages and prices, coupon codes and the Razorpay payment list go here. The database tables (course_packages, coupons, payments) are ready.',
  },
  settings: {
    title: 'Settings',
    text: 'Device limit per student, when a video counts as watched, reminder timing, staff roles and branding. Values live in the app_settings table today.',
  },
} as const;

export default function Placeholder({ kind }: { kind: keyof typeof COPY }) {
  const c = COPY[kind];
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[26px] font-extrabold leading-tight tracking-tight lg:text-[28px]">{c.title}</h1>
      <section className="card flex flex-col items-start gap-3 p-6">
        <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand">Not designed yet</span>
        <p className="max-w-2xl text-sm text-ink-2">{c.text}</p>
        <Link to="/admin" className="btn-secondary">
          Back to dashboard
        </Link>
      </section>
    </div>
  );
}
