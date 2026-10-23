import { Link, NavLink, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuthUser, useProfile } from "@/components/RequireAuth";
import { cn } from "@/lib/utils";

const SHOP_LINKS = [
  { to: "/shop", label: "店家設定 Shop", end: true },
  { to: "/shop/bookings", label: "服務與時段 Bookings", end: false },
];

export function AppHeader() {
  const user = useAuthUser();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isShop = profile?.role === "shop";

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="font-serif text-2xl font-semibold tracking-tight">
            Barberly
          </Link>
          {isShop && (
            <nav className="flex gap-1 text-sm">
              {SHOP_LINKS.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) =>
                    cn(
                      "rounded-full px-3 py-1.5 transition-colors",
                      isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                    )
                  }
                >
                  {l.label}
                </NavLink>
              ))}
            </nav>
          )}
        </div>
        <div className="flex min-w-0 items-center gap-3 text-sm">
          <span className="truncate text-muted-foreground">Hi {user.email}</span>
          {isShop && (
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
              barber
            </span>
          )}
          <Button size="sm" className="rounded-full" onClick={signOut}>
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
}
