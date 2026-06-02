import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getSiteUrl } from '@/lib/site-url';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string, firstName?: string, lastName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null; message?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  resendConfirmationEmail: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for auth changes FIRST (prevents missing URL-based recovery sessions)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // THEN get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const clearSupabaseAuthStorage = () => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (key === "supabase.auth.token" || (key.startsWith("sb-") && key.includes("-auth-token"))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch {
      // ignore storage failures (private mode / restricted browser policies)
    }
  };

  const signUp = async (email: string, password: string, fullName?: string, firstName?: string, lastName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          first_name: firstName ?? (fullName ? fullName.split(/\s+/)[0] : undefined),
          last_name: lastName ?? (fullName ? fullName.split(/\s+/).slice(1).join(' ') : undefined),
        },
        emailRedirectTo: `${getSiteUrl() || window.location.origin}/`
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signInWithMagicLink = async (email: string) => {
    const baseUrl = getSiteUrl() || (typeof window !== 'undefined' ? window.location.origin : '');
    const { data, error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: baseUrl ? `${baseUrl}/dashboard` : undefined,
      },
    });
    // Supabase may return success but with a message (e.g. rate limit)
    const message = (data as { message?: string })?.message ?? error?.message;
    return { error, message };
  };

  const signOut = async () => {
    // Local first for reliability on localhost, then best-effort global revoke.
    const localResult = await supabase.auth.signOut({ scope: "local" });
    if (localResult.error) {
      console.warn("Local sign-out reported an error:", localResult.error.message);
    }
    const globalResult = await supabase.auth.signOut({ scope: "global" });
    if (globalResult.error) {
      console.warn("Global sign-out reported an error:", globalResult.error.message);
    }
    clearSupabaseAuthStorage();
    setSession(null);
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    const base = (getSiteUrl() || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '');
    const redirectTo = base ? `${base}/reset-password` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      ...(redirectTo ? { redirectTo } : {}),
    });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
  };

  const resendConfirmationEmail = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
    });
    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signInWithMagicLink, signOut, resetPassword, updatePassword, resendConfirmationEmail }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
