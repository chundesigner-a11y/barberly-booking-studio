import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;

type SessionState = {
  loading: boolean;
  user: User | null;
  profile: Profile | null;
  refreshProfile: () => Promise<Profile | null>;
  /** Re-read the session + profile now (call right after sign-in, before navigating). */
  reload: () => Promise<Profile | null>;
};

const SessionContext = createContext<SessionState | null>(null);

/** Reads the signed-in user's profiles row (role / shop name / bank fields — RLS: own row only). */
export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) {
    console.error(error);
    return null;
  }
  return data;
}

/** App-wide session: the signed-in user (if any) + their profiles row. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const load = useCallback(async (u: User | null) => {
    const p = u ? await fetchProfile(u.id) : null;
    setUser(u);
    setProfile(p);
    setLoading(false);
    return p;
  }, []);

  const reload = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return load(data.session?.user ?? null);
  }, [load]);

  useEffect(() => {
    void reload();
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        // defer: never await supabase calls inside the auth callback
        setTimeout(() => void load(session?.user ?? null), 0);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [load, reload]);

  const refreshProfile = useCallback(async () => {
    if (!user) return null;
    const p = await fetchProfile(user.id);
    setProfile(p);
    return p;
  }, [user]);

  return (
    <SessionContext.Provider value={{ loading, user, profile, refreshProfile, reload }}>{children}</SessionContext.Provider>
  );
}

/** Session for any page (user may be null on public pages). */
export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("Must be used inside <AuthProvider>");
  return ctx;
}

/** The signed-in user. Only call inside a <RequireAuth> subtree. */
export function useAuthUser(): User {
  const { user } = useSession();
  if (!user) throw new Error("useAuthUser must be used inside <RequireAuth>");
  return user;
}

/** The signed-in user's profiles row + a refresher. Role checks ALWAYS read profiles.role. */
export function useProfile() {
  const { profile, refreshProfile } = useSession();
  return { profile, refreshProfile };
}

/** Gate for authenticated pages: redirects to /login (and back here afterwards). */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { loading, user } = useSession();
  const location = useLocation();
  if (loading) {
    return <div className="min-h-screen bg-background" />;
  }
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <>{children}</>;
}

/** Shop-only pages: anyone whose profiles.role is not 'shop' goes to the customer side. */
export function RequireShop({ children }: { children: ReactNode }) {
  const { profile } = useSession();
  if (profile?.role !== "shop") {
    return <Navigate to="/barbers" replace />;
  }
  return <>{children}</>;
}
