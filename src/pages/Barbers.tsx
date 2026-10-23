import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Store } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/AppHeader";
import { useAuthUser, useProfile } from "@/components/RequireAuth";
import { usePageTitle } from "@/hooks/usePageTitle";

/** Customer landing. Shops are routed to their dashboard (role read from profiles.role). */
export default function BarbersPage() {
  usePageTitle("Your Barberly");
  const user = useAuthUser();
  const { profile, refreshProfile } = useProfile();
  const navigate = useNavigate();
  const [upgrading, setUpgrading] = useState(false);

  if (profile?.role === "shop") {
    return <Navigate to="/shop" replace />;
  }

  async function becomeShop() {
    setUpgrading(true);
    // RLS: a user may update only their own row; a DB trigger allows only customer -> shop.
    const { error } = await supabase.from("profiles").update({ role: "shop" }).eq("id", user.id);
    if (error) {
      setUpgrading(false);
      toast.error(error.message);
      return;
    }
    await refreshProfile();
    toast.success("你的帳號已升級為理髮店 / You're now a shop");
    navigate("/shop", { replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="fade-up mx-auto max-w-2xl px-5 py-24 text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Discover</p>
        <h1 className="mt-4 font-serif text-4xl leading-tight md:text-5xl">
          附近的理髮師即將上線 — 下一個里程碑會加上瀏覽與預約功能。
        </h1>
        <p className="mt-6 text-muted-foreground">
          Barbers near you are coming soon — browse & booking arrive in the next milestone.
        </p>

        <div className="mx-auto mt-16 max-w-md rounded-3xl border border-border bg-card p-8 text-left shadow-lift">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
              <Store className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-serif text-2xl">開店 / Become a shop</h2>
              <p className="text-sm text-muted-foreground">在 Barberly 上架你的理髮師、服務與時段。</p>
            </div>
          </div>
          <Button onClick={becomeShop} disabled={upgrading} className="mt-6 h-11 w-full rounded-full">
            {upgrading ? "升級中…" : "我要開店 / Become a shop"}
          </Button>
        </div>
      </main>
    </div>
  );
}
