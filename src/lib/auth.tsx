import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { db, isDemo, supabase } from './supabase';
import { getDeviceId, getDeviceName, getPlatform } from './device';
import type { Role } from './types';

export interface Me {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: Role;
}

interface AuthValue {
  loading: boolean;
  me: Me | null;
  /** message to show on the login page after a forced sign-out */
  notice: string | null;
  clearNotice: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (p: { fullName: string; phone: string; email: string; password: string }) => Promise<'signed_in' | 'check_email'>;
  signOut: (everywhere?: boolean) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  refreshMe: () => Promise<void>;
}

const DEMO_ME: Me = {
  id: 'demo-student',
  fullName: 'Ananya Reddy',
  email: 'ananya.reddy@example.com',
  phone: '+91 98XXX XX210',
  role: 'student',
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(!isDemo);
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<Me | null>(isDemo ? DEMO_ME : null);
  const [notice, setNotice] = useState<string | null>(null);
  const checkedFor = useRef<string | null>(null);

  const forceOut = useCallback(
    async (message: string) => {
      setNotice(message);
      checkedFor.current = null;
      await supabase?.auth.signOut({ scope: 'local' });
      setMe(null);
      qc.clear();
    },
    [qc],
  );

  /** Loads the profile and checks the device limit once per signed-in user. */
  const loadMe = useCallback(
    async (s: Session | null) => {
      if (!s) {
        setMe(null);
        return;
      }
      const { data, error } = await db()
        .from('profiles')
        .select('id, full_name, email, phone, role, is_blocked')
        .eq('id', s.user.id)
        .single();
      if (error || !data) {
        setMe({ id: s.user.id, fullName: '', email: s.user.email ?? null, phone: null, role: 'student' });
        return;
      }
      if (data.is_blocked) {
        await forceOut('Your account is blocked. Please contact support.');
        return;
      }
      if (checkedFor.current !== s.user.id) {
        const { data: dev, error: devErr } = await db().rpc('register_device', {
          p_device_id: getDeviceId(),
          p_device_name: getDeviceName(),
          p_platform: getPlatform(),
        });
        if (!devErr && dev && dev.allowed === false) {
          await forceOut(
            `This account is already signed in on ${dev.max} devices. Remove a device from Profile on one of them, or contact support.`,
          );
          return;
        }
        checkedFor.current = s.user.id;
      }
      setMe({
        id: data.id,
        fullName: data.full_name ?? '',
        email: data.email ?? s.user.email ?? null,
        phone: data.phone ?? null,
        role: data.role,
      });
    },
    [forceOut],
  );

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadMe(data.session);
      if (active) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'SIGNED_OUT') {
        setMe(null);
        checkedFor.current = null;
        qc.clear();
      }
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        // run outside the auth callback (Supabase recommends not awaiting inside it)
        setTimeout(() => void loadMe(s), 0);
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadMe, qc]);

  const value = useMemo<AuthValue>(
    () => ({
      loading,
      me,
      notice,
      clearNotice: () => setNotice(null),
      async signIn(email, password) {
        if (isDemo) return;
        setNotice(null);
        const { error } = await db().auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Email or password is wrong.' : error.message);
      },
      async signUp({ fullName, phone, email, password }) {
        if (isDemo) return 'signed_in';
        const { data, error } = await db().auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: fullName.trim(), phone: phone.trim() },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw new Error(error.message);
        return data.session ? 'signed_in' : 'check_email';
      },
      async signOut(everywhere = false) {
        if (isDemo) return;
        await db().auth.signOut({ scope: everywhere ? 'global' : 'local' });
      },
      async sendPasswordReset(email) {
        if (isDemo) return;
        const { error } = await db().auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw new Error(error.message);
      },
      async updatePassword(password) {
        if (isDemo) return;
        const { error } = await db().auth.updateUser({ password });
        if (error) throw new Error(error.message);
      },
      async refreshMe() {
        await loadMe(session);
      },
    }),
    [loading, me, notice, session, loadMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
