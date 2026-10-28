import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

/** True when no Supabase keys are set: the app runs on built-in sample data. */
export const isDemo = !url || !anonKey;

export const supabase: SupabaseClient | null = isDemo
  ? null
  : createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });

export function db(): SupabaseClient {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

/** Calls a database function and throws a readable error if it fails. */
export async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await db().rpc(fn, args ?? {});
  if (error) throw new Error(error.message);
  return data as T;
}
