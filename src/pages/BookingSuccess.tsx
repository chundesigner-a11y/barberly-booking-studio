import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { useAuthUser } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";
import { formatMoney, usePlatformSettings } from "@/lib/platformSettings";
import { dayFmt, formatRange } from "@/lib/time";

/**
 * /bookings/success — UX only. Polls the booking until the Stripe WEBHOOK marks it paid.
 * This page never writes anything; the webhook is the source of truth.
 */
export default function BookingSuccess() {
  usePageTitle("Payment — Barberly");
  const user = useAuthUser();
  const settings = usePlatformSettings();
  const [params] = useSearchParams();
  const bookingId = params.get("booking_id");
  const [startedAt] = useState(() => Date.now());
  const [slow, setSlow] = useState(false);

  const { data: booking } = useQuery({
    queryKey: ["booking_status", bookingId],
    enabled: Boolean(bookingId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings_with_start")
        .select("id, status, price, starts_at, ends_at, paid_at, customer_id")
        .eq("id", bookingId!)
        .eq("customer_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchInterval: (q) => (q.state.data?.status === "paid" ? false : 1500),
  });

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 20000);
    return () => clearTimeout(t);
  }, [startedAt]);

  const paid = booking?.status === "paid";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="fade-up mx-auto max-w-lg px-5 py-24 text-center">
        {paid ? (
          <CheckCircle2 className="mx-auto h-14 w-14" />
        ) : (
          <Loader2 className="mx-auto h-14 w-14 animate-spin text-muted-foreground" />
        )}
        <h1 className="mt-6 font-serif text-5xl">{paid ? "預約成功！" : "付款處理中…"}</h1>
        <p className="mt-3 text-muted-foreground">
          {paid ? "Payment received — your booking is confirmed." : "正在等待 Stripe 通知付款結果，通常幾秒鐘就好。"}
        </p>

        {booking && (
          <div className="mt-8 rounded-3xl border border-border bg-card p-6 text-left">
            {booking.starts_at && booking.ends_at && (
              <p className="font-medium">
                {dayFmt.format(new Date(booking.starts_at))} {formatRange(booking.starts_at, booking.ends_at)}
              </p>
            )}
            <p className="mt-1 text-sm text-muted-foreground">
              {formatMoney(booking.price ?? 0, settings)} · {paid ? "已付款 Paid" : "待付款 Pending"}
            </p>
          </div>
        )}

        {!bookingId && <p className="mt-6 text-sm text-muted-foreground">找不到預約編號。</p>}
        {slow && !paid && (
          <p className="mt-6 text-sm text-muted-foreground">
            比平常久了一點。付款若已完成，稍後會自動顯示在「我的預約」，不需要重新付款。
          </p>
        )}

        <Button asChild className="mt-10 rounded-full px-6">
          <Link to="/bookings">查看我的預約</Link>
        </Button>
      </main>
    </div>
  );
}
