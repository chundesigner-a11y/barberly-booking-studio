import { supabase } from "@/integrations/supabase/client";

/**
 * Ask our server for a Stripe Checkout URL for this pending_payment booking, then go there.
 * The server reads the price snapshot itself — the browser never sends an amount.
 */
export async function startCheckout(bookingId: string): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("請先登入 / please sign in");

  const res = await fetch("/api/bookings/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ booking_id: bookingId }),
  });
  const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !body.url) throw new Error(body.error ?? "無法開啟付款頁面，請再試一次");
  window.location.assign(body.url);
}
