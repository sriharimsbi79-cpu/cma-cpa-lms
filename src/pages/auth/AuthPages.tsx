import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, CheckCircle2, ClipboardList, PlayCircle } from 'lucide-react';
import { BRAND_INITIALS, BRAND_NAME, Field } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { isDemo } from '@/lib/supabase';

function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-page">
      <aside className="hidden w-[44%] max-w-[560px] flex-col justify-between bg-navy p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-brand text-[15px] font-extrabold">{BRAND_INITIALS}</span>
          <span className="text-lg font-bold">{BRAND_NAME}</span>
        </div>
        <div>
          <h2 className="text-[34px] font-extrabold leading-tight tracking-tight">CMA USA, CPA USA and technical skills in one place.</h2>
          <ul className="mt-8 flex flex-col gap-4 text-navy-text">
            {[
              { icon: PlayCircle, t: 'Chapter-wise videos you can watch in any order' },
              { icon: BookOpen, t: 'eBooks with highlights and notes' },
              { icon: ClipboardList, t: 'Chapter tests and full-length mocks with TBS and CBQ practice' },
            ].map((x) => (
              <li key={x.t} className="flex items-center gap-3">
                <x.icon aria-hidden className="size-5 shrink-0 text-white" />
                {x.t}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-navy-muted">© {new Date().getFullYear()} {BRAND_NAME}</p>
      </aside>
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-xl bg-brand text-sm font-extrabold text-white">{BRAND_INITIALS}</span>
            <span className="text-base font-bold">{BRAND_NAME}</span>
          </div>
          <h1 className="text-[26px] font-extrabold leading-tight tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-ink-3">{subtitle}</p>}
          {isDemo && (
            <p className="mt-4 rounded-xl border border-warn-line bg-warn-bg px-3.5 py-2.5 text-[13px] text-warn-fg">
              Demo mode: any details work and open the sample student account.
            </p>
          )}
          <div className="mt-6">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-ink-3">{footer}</div>}
        </div>
      </main>
    </div>
  );
}

function ErrorText({ text }: { text: string }) {
  if (!text) return null;
  return (
    <p role="alert" className="rounded-xl border border-warn-line bg-warn-bg px-3.5 py-2.5 text-[13px] font-semibold text-warn-fg">
      {text}
    </p>
  );
}

export function Login() {
  const { me, signIn, notice, clearNotice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (me && !isDemo) return <Navigate to={from} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    clearNotice();
    if (!email.trim() || !password) return setErr('Enter your email and password');
    if (isDemo) return navigate(from);
    setBusy(true);
    setErr('');
    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Could not sign in');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Log in"
      subtitle="Welcome back. Continue where you left off."
      footer={
        <>
          New here?{' '}
          <Link to="/signup" className="font-bold text-brand">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <ErrorText text={notice ?? err} />
        <Field label="Email" htmlFor="li-email">
          <input id="li-email" type="email" className="field" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(''); }} />
        </Field>
        <Field label="Password" htmlFor="li-pw">
          <input id="li-pw" type="password" className="field" autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); setErr(''); }} />
        </Field>
        <Link to="/forgot-password" className="-my-2 inline-flex min-h-11 items-center self-end text-[13px] font-bold text-brand">
          Forgot password?
        </Link>
        <button type="submit" className="btn-primary h-12 rounded-xl text-[15px]" disabled={busy}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </AuthShell>
  );
}

export function Signup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ fullName: '', phone: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setF({ ...f, [k]: e.target.value });
    setErr('');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!f.fullName.trim()) return setErr('Enter your full name');
    if (f.phone.replace(/\D/g, '').length < 10) return setErr('Enter a valid mobile number');
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) return setErr('Enter a valid email');
    if (f.password.length < 8) return setErr('Use at least 8 characters for the password');
    if (isDemo) return navigate('/');
    setBusy(true);
    try {
      const r = await signUp(f);
      if (r === 'check_email') setSent(true);
      else navigate('/', { replace: true });
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Could not create the account');
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <AuthShell title="Check your email" subtitle={`We sent a confirmation link to ${f.email}. Open it to finish creating your account.`}>
        <div className="flex items-center gap-3 rounded-xl bg-ok-bg px-4 py-3 text-sm font-semibold text-ok-fg">
          <CheckCircle2 aria-hidden className="size-5" />
          Account created
        </div>
        <Link to="/login" className="btn-secondary mt-6 w-full">
          Back to log in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Use the name and mobile number you want on your profile."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-brand">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <ErrorText text={err} />
        <Field label="Full name" htmlFor="su-name">
          <input id="su-name" className="field" autoComplete="name" value={f.fullName} onChange={set('fullName')} />
        </Field>
        <Field label="Mobile number" htmlFor="su-phone">
          <input id="su-phone" className="field" inputMode="tel" autoComplete="tel" placeholder="+91" value={f.phone} onChange={set('phone')} />
        </Field>
        <Field label="Email" htmlFor="su-email">
          <input id="su-email" type="email" className="field" autoComplete="email" value={f.email} onChange={set('email')} />
        </Field>
        <Field label="Password" htmlFor="su-pw" hint="At least 8 characters">
          <input id="su-pw" type="password" className="field" autoComplete="new-password" value={f.password} onChange={set('password')} />
        </Field>
        <button type="submit" className="btn-primary h-12 rounded-xl text-[15px]" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
        <p className="text-center text-xs text-ink-3">By creating an account you agree to the terms and privacy policy.</p>
      </form>
    </AuthShell>
  );
}

export function ForgotPassword() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErr('Enter a valid email');
    setBusy(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Could not send the email');
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthShell
      title="Reset your password"
      subtitle={sent ? `If ${email} has an account, a reset link is on its way.` : 'We will email you a link to set a new password.'}
      footer={
        <Link to="/login" className="font-bold text-brand">
          Back to log in
        </Link>
      }
    >
      {!sent && (
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <ErrorText text={err} />
          <Field label="Email" htmlFor="fp-email">
            <input id="fp-email" type="email" className="field" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(''); }} />
          </Field>
          <button type="submit" className="btn-primary h-12 rounded-xl text-[15px]" disabled={busy}>
            Send reset link
          </button>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPassword() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return setErr('Use at least 8 characters');
    setBusy(true);
    try {
      await updatePassword(pw);
      navigate('/', { replace: true });
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Could not update the password. Open the link from your email again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthShell title="Set a new password">
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <ErrorText text={err} />
        <Field label="New password" htmlFor="rp-pw" hint="At least 8 characters">
          <input id="rp-pw" type="password" className="field" autoComplete="new-password" value={pw} onChange={(e) => { setPw(e.target.value); setErr(''); }} />
        </Field>
        <button type="submit" className="btn-primary h-12 rounded-xl text-[15px]" disabled={busy}>
          Save password
        </button>
      </form>
    </AuthShell>
  );
}
