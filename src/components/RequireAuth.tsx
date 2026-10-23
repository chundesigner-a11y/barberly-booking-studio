import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;

type AuthState = {
  user: User;
  profile: Profile | null;
  refreshProfile: () => Promise<Profile | null>;
};

const AuthContext = createContext<AuthState | null>(null);

/** Reads the signed-in user's profiles row (role / shop name / bank fields — RLS: own row only). */
export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) {
    console.error(error);
    return null;
  }
  return data;
}

function useAuthContext(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("Must be used inside <RequireAuth>");
  return ctx;
}

/** The signed-in user. Only call inside a <RequireAuth> subtree. */
export function useAuthUser(): User {
  return useAuthContext().user;
}

/** The signed-in user's profiles row + a refresher. Role checks ALWAYS read profiles.role. */
export function useProfile() {
  const { profile, refreshProfile } = useAuthContext();
  return { profile, refreshProfile };
}

/** Gate for authenticated pages: redirects to /login when there is no session. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let active = true;
    async function load(u: User | null) {
      const p = u ? await fetchProfile(u.id) : null;
      if (!active) return;
      setUser(u);
      setProfile(p);
      setLoading(false);
    }
    supabase.auth.getUser().then(({ data }) => load(data.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
      if (event === "USER_UPDATED" && session?.user) void load(session.user);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return null;
    const p = await fetchProfile(user.id);
    setProfile(p);
    return p;
  }, [user]);

  if (loading) {
    return <div className="min-h-screen bg-background" />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return (
    <AuthContext.Provider value={{ user, profile, refreshProfile }}>{children}</AuthContext.Provider>
  );
}

/** Shop-only pages: anyone whose profiles.role is not 'shop' goes to the customer landing. */
export function RequireShop({ children }: { children: ReactNode }) {
  const { profile } = useAuthContext();
  if (profile?.role !== "shop") {
    return <Navigate to="/barbers" replace />;
  }
  return <>{children}</>;
}
