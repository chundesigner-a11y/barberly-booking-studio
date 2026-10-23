// POST /api/bookings/checkout  { booking_id }  (Authorization: Bearer <customer access token>)
// Creates a dynamic Stripe Checkout Session for the customer's own pending_payment booking.
import Stripe from "stripe";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabaseAdmin } from "../_supabaseAdmin.js"; // .js extension required (ESM)

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

// Stripe's zero-decimal currencies. TWD is NOT one of them: Stripe charges TWD in 1/100 units,
// so NT$300 -> unit_amount 30000. (platform_settings.currency_minor_units is display-only.)
const ZERO_DECIMAL = new Set(["bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "vnd", "vuv", "xaf", "xof", "xpf"]);

type BookingRow = {
  id: string;
  customer_id: string;
  status: string;
  price: number;
  services: { name: string; barber_id: string; barbers: { id: string; name: string } | null } | null;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ error: "STRIPE_SECRET_KEY is not set" });

  // Who is asking? Only the booking's own customer may pay for it.
  const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "please sign in" });
  const { data: auth, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !auth.user) return res.status(401).json({ error: "please sign in again" });

  const bookingId = typeof req.body?.booking_id === "string" ? req.body.booking_id : null;
  if (!bookingId) return res.status(400).json({ error: "booking_id is required" });

  // Price comes from the booking's server-side SNAPSHOT — never from the client.
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("id, customer_id, status, price, services(name, barber_id, barbers(id, name))")
    .eq("id", bookingId)
    .maybeSingle();
  const booking = data as BookingRow | null;
  if (error || !booking) return res.status(404).json({ error: "booking not found" });
  if (booking.customer_id !== auth.user.id) return res.status(403).json({ error: "not your booking" });
  if (booking.status !== "pending_payment") return res.status(400).json({ error: "this booking is not awaiting payment" });

  const { data: cfg } = await supabaseAdmin.from("platform_settings").select("currency").maybeSingle();
  const currency = (cfg?.currency ?? "twd").toLowerCase();
  const factor = ZERO_DECIMAL.has(currency) ? 1 : 100;

  const barberId = booking.services?.barber_id ?? "";
  const barberName = booking.services?.barbers?.name ?? "Barberly";
  const serviceName = booking.services?.name ?? "Booking";

  const proto = (req.headers["x-forwarded-proto"] as string) ?? "https";
  const origin = (req.headers.origin as string | undefined) ?? `${proto}://${req.headers.host}`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency,
            product_data: { name: `${serviceName} @ ${barberName}` },
            unit_amount: booking.price * factor, // TWD 300 -> 30000 (NT$300.00)
          },
          quantity: 1,
        },
      ],
      metadata: { booking_id: booking.id, customer_id: booking.customer_id },
      client_reference_id: booking.id,
      customer_email: auth.user.email ?? undefined,
      success_url: `${origin}/bookings/success?booking_id=${booking.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/barbers/${barberId}?cancelled=${booking.id}`,
    });
    return res.status(200).json({ url: session.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "could not start checkout";
    console.error("checkout error", message);
    return res.status(502).json({ error: message });
  }
}
