import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Store } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { useAuthUser, useProfile } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";
import { errMessage } from "@/lib/errors";
import { startCheckout } from "@/lib/checkout";
import { formatMoney, usePlatformSettings } from "@/lib/platformSettings";
import { DISPLAY_TZ_LABEL, dayFmt, formatRange } from "@/lib/time";
import { cn } from "@/lib/utils";

const STATUS: Record<string, { label: string; className: string }> = {
  pending_payment: { label: "待付款 Pending", className: "bg-secondary text-secondary-foreground" },
  paid: { label: "已付款 Paid", className: "bg-primary text-primary-foreground" },
  cancelled: { label: "已取消 Cancelled", className: "bg-muted text-muted-foreground line-through" },
};

/** /bookings — the signed-in customer's own bookings (RLS: customer_id = auth.uid()). */
export default function MyBookings() {
  usePageTitle("My bookings — Barberly");
  const user = useAuthUser();
  const settings = usePlatformSettings();
  const queryClient = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["my_bookings", user.id],
    queryFn: async () => {
      const { data: bookings, error } = await supabase
        .from("bookings_with_start")
        .select("*")
        .eq("customer_id", user.id)
        .order("starts_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      const serviceIds = [...new Set((bookings ?? []).map((b) => b.service_id).filter((x): x is string => !!x))];
      const { data: services, error: e2 } = serviceIds.length
        ? await supabase.from("services").select("id, name, barber_id, barbers(id, name)").in("id", serviceIds)
        : { data: [], error: null };
      if (e2) throw e2;
      const byId = new Map((services ?? []).map((s) => [s.id, s]));
      return (bookings ?? []).map((b) => ({ ...b, service: b.service_id ? byId.get(b.service_id) ?? null : null }));
    },
  });

  const [paying, setPaying] = useState<string | null>(null);
  async function pay(id: string) {
    setPaying(id);
    try {
      await startCheckout(id); // navigates to Stripe
    } catch (e) {
      setPaying(null);
      toast.error(errMessage(e));
    }
  }

  async function cancel(id: string) {
    if (!window.confirm("確定要取消這筆預約嗎？時段會釋出給其他人。")) return;
    // Only the status flips; the DB trigger deletes booking_slots and frees the slots.
    const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
    if (error) {
      toast.error(errMessage(error));
      return;
    }
    toast.success("已取消預約 / Booking cancelled");
    await queryClient.invalidateQueries({ queryKey: ["my_bookings", user.id] });
    await queryClient.invalidateQueries({ queryKey: ["available_slots"] });
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="fade-up mx-auto max-w-3xl space-y-10 px-5 py-12">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">My bookings</p>
          <h1 className="mt-3 font-serif text-5xl">我的預約</h1>
          <p className="mt-2 text-sm text-muted-foreground">時間皆為{DISPLAY_TZ_LABEL}。</p>
        </div>

        <div className="space-y-3">
          {isLoading && <div className="h-28 animate-pulse rounded-3xl bg-muted" />}
          {!isLoading && rows.length === 0 && (
            <div className="rounded-3xl border border-border bg-card p-8 text-center">
              <p className="text-muted-foreground">還沒有預約。</p>
              <Link to="/barbers" className="mt-4 inline-block font-medium underline underline-offset-4">
                去找理髮師 →
              </Link>
            </div>
          )}
          {rows.map((b) => {
            const st = STATUS[b.status ?? ""] ?? { label: b.status ?? "", className: "bg-muted" };
            const unpaid = b.status === "pending_payment";
            return (
              <article key={b.id} className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border bg-card p-5">
                <div className="flex items-start gap-3">
                  <CalendarClock className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="font-serif text-2xl">
                      {b.service?.barbers ? (
                        <Link to={`/barbers/${b.service.barbers.id}`} className="hover:underline">
                          {b.service.barbers.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </p>
                    <p className="text-sm">
                      {b.service?.name ?? "—"} · {formatMoney(b.price ?? 0, settings)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {b.starts_at && b.ends_at
                        ? `${dayFmt.format(new Date(b.starts_at))} ${formatRange(b.starts_at, b.ends_at)}`
                        : "時段已釋出"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn("rounded-full px-3 py-1 text-xs font-medium", st.className)}>{st.label}</span>
                  {unpaid && b.id && (
                    <>
                      <Button size="sm" className="rounded-full" disabled={paying === b.id} onClick={() => pay(b.id!)}>
                        {paying === b.id ? "前往付款…" : "繼續付款 Pay"}
                      </Button>
                      <Button size="sm" variant="outline" className="rounded-full" onClick={() => cancel(b.id!)}>
                        取消 Cancel
                      </Button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <BecomeShopCard />
      </main>
    </div>
  );
}

function BecomeShopCard() {
  const user = useAuthUser();
  const { profile, refreshProfile } = useProfile();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  if (profile?.role !== "customer") return null;

  async function upgrade() {
    if (!window.confirm("把這個帳號升級成理髮店？")) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ role: "shop" }).eq("id", user.id);
    setBusy(false);
    if (error) {
      toast.error(errMessage(error));
      return;
    }
    await refreshProfile();
    navigate("/shop", { replace: true });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-dashed border-border p-6">
      <div className="flex items-center gap-3">
        <Store className="h-5 w-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">你是理髮師嗎？在 Barberly 開店，上架服務與時段。</p>
      </div>
      <Button variant="outline" className="rounded-full" disabled={busy} onClick={upgrade}>
        開店 / Become a shop
      </Button>
    </div>
  );
}
