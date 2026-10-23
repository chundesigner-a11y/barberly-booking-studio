import { Link } from "react-router-dom";
import { CheckCircle2, Circle } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { useProfile } from "@/components/RequireAuth";
import { BarbersManager } from "@/components/shop/BarbersManager";
import { PayoutSettingsCard } from "@/components/shop/PayoutSettingsCard";
import { useMyBarbers } from "@/components/shop/useMyBarbers";
import { usePageTitle } from "@/hooks/usePageTitle";

function Step({ done, children }: { done: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
      <span className={done ? "" : "text-muted-foreground"}>{children}</span>
    </li>
  );
}

/** Shop onboarding: payout settings (profiles) + my barbers (barbers) + sample photos. */
export default function ShopOnboarding() {
  usePageTitle("Shop setup — Barberly");
  const { profile } = useProfile();
  const { data: barbers = [] } = useMyBarbers();

  const payoutDone = Boolean(profile?.display_name && profile.bank_account_name && profile.bank_account_number);
  const barbersDone = barbers.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="fade-up mx-auto max-w-6xl space-y-8 px-5 py-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Shop dashboard</p>
            <h1 className="mt-3 font-serif text-5xl">{profile?.display_name || "理髮店上架 / Shop setup"}</h1>
          </div>
          <div className="rounded-2xl border border-border bg-card px-5 py-4">
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">開店進度</p>
            <ul className="space-y-1.5">
              <Step done={payoutDone}>店名 + 撥款帳戶</Step>
              <Step done={barbersDone}>至少一位理髮師</Step>
            </ul>
            {payoutDone && barbersDone && (
              <Link to="/shop/bookings" className="mt-3 inline-block text-sm font-medium underline underline-offset-4">
                下一步：設定服務與時段 →
              </Link>
            )}
          </div>
        </div>

        <PayoutSettingsCard />
        <BarbersManager />
      </main>
    </div>
  );
}
