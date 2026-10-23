import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/RequireAuth";
import { cn } from "@/lib/utils";

const SHOP_LINKS = [
  { to: "/shop", label: "店家設定 Shop", end: true },
  { to: "/shop/bookings", label: "服務與時段 Bookings", end: false },
];
const CUSTOMER_LINKS = [
  { to: "/barbers", label: "找理髮師 Barbers", end: false },
  { to: "/bookings", label: "我的預約 My bookings", end: false },
];

/** Shared header for app pages. Works signed-in or signed-out. */
export function AppHeader() {
  const { user, profile } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const isShop = profile?.role === "shop";
  const links = !user ? [CUSTOMER_LINKS[0]!] : isShop ? SHOP_LINKS : CUSTOMER_LINKS;

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4">
        <div className="flex flex-wrap items-center gap-6">
          <Link to="/" className="font-serif text-2xl font-semibold tracking-tight">
            Barberly
          </Link>
          <nav className="flex flex-wrap gap-1 text-sm">
            {links.map((l) => (
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
        </div>
        <div className="flex min-w-0 items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="truncate text-muted-foreground">Hi {user.email}</span>
              {isShop && (
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                  barber
                </span>
              )}
              <Button size="sm" className="rounded-full" onClick={signOut}>
                Sign Out
              </Button>
            </>
          ) : (
            <Button asChild size="sm" className="rounded-full px-5">
              <Link to={`/login?next=${encodeURIComponent(location.pathname)}`}>Login</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
