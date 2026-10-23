import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const AuthUserContext = createContext<User | null>(null);

/** The signed-in user. Only call inside a <RequireAuth> subtree. */
export function useAuthUser(): User {
  const user = useContext(AuthUserContext);
  if (!user) throw new Error("useAuthUser must be used inside <RequireAuth>");
  return user;
}

/** Gate for authenticated pages: redirects to /login when there is no session. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ loading: boolean; user: User | null }>({
    loading: true,
    user: null,
  });

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setState({ loading: false, user: data.user ?? null });
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setState({ loading: false, user: session?.user ?? null });
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  if (state.loading) {
    return <div className="min-h-screen bg-background" />;
  }
  if (!state.user) {
    return <Navigate to="/login" replace />;
  }
  return <AuthUserContext.Provider value={state.user}>{children}</AuthUserContext.Provider>;
}
