import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthValue {
  session: Session | null;
  /** True until the first session check finishes. */
  loading: boolean;
  userId: string | null;
  isAnonymous: boolean;
  /** Start playing without an account (Supabase anonymous sign-in). */
  startAnonymous: () => Promise<void>;
  /** Existing account sign-in. */
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<void>;
  /** Upgrade the current anonymous user, KEEPING the same user id so their choices carry over. */
  linkGoogle: () => Promise<void>;
  linkEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

const redirectTo = () => window.location.origin;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthValue>(() => {
    const fail = (e: { message: string } | null) => {
      if (e) throw new Error(e.message);
    };
    return {
      session,
      loading,
      userId: session?.user.id ?? null,
      isAnonymous: session?.user.is_anonymous ?? false,
      startAnonymous: async () => fail((await supabase.auth.signInAnonymously()).error),
      signInWithGoogle: async () =>
        fail((await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo() } })).error),
      signInWithEmail: async (email) =>
        fail((await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } })).error),
      linkGoogle: async () =>
        fail((await supabase.auth.linkIdentity({ provider: 'google', options: { redirectTo: redirectTo() } })).error),
      linkEmail: async (email) =>
        fail((await supabase.auth.updateUser({ email }, { emailRedirectTo: redirectTo() })).error),
      signOut: async () => fail((await supabase.auth.signOut()).error),
    };
  }, [session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
