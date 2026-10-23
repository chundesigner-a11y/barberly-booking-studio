import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuthUser } from "@/components/RequireAuth";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function BarbersPage() {
  usePageTitle("Your Barberly");
  const user = useAuthUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isShop = user.user_metadata?.["role"] === "shop";

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <Link to="/" className="font-serif text-2xl font-semibold tracking-tight">
            Barberly
          </Link>
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
      <main className="fade-up mx-auto max-w-2xl px-5 py-24 text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          {isShop ? "Barber dashboard" : "Discover"}
        </p>
        {isShop ? (
          <>
            <h1 className="mt-4 font-serif text-4xl leading-tight md:text-5xl">
              理髮師後台即將上線 — 下一個里程碑會加上個人檔案、服務項目與排班管理。
            </h1>
            <p className="mt-6 text-muted-foreground">
              Your barber dashboard is coming soon — profile, services & schedule arrive in the next milestone.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-4 font-serif text-4xl leading-tight md:text-5xl">
              附近的理髮師即將上線 — 下一個里程碑會加上瀏覽與預約功能。
            </h1>
            <p className="mt-6 text-muted-foreground">
              Barbers near you are coming soon — browse & booking arrive in the next milestone.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
