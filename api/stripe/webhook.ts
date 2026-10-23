// POST /api/stripe/webhook — the ONLY place a booking becomes 'paid'.
// Verifies Stripe's signature on the RAW body, then flips pending_payment -> paid exactly once.
import Stripe from "stripe";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabaseAdmin } from "../_supabaseAdmin.js"; // .js extension required (ESM)

// Turn off body parsing: the signature is an HMAC over the exact raw bytes.
export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

async function rawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return res.status(500).json({ error: "STRIPE_WEBHOOK_SECRET is not set" });

  const buf = await rawBody(req);
  const sig = req.headers["stripe-signature"];
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(buf, typeof sig === "string" ? sig : "", secret);
  } catch {
    return res.status(400).json({ error: "signature verification failed" });
  }

  if (event.type !== "checkout.session.completed") return res.status(200).json({ received: true });

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") return res.status(200).json({ received: true });

  const bookingId = session.metadata?.booking_id; // set by our own server — not forgeable
  if (!bookingId) return res.status(400).json({ error: "missing booking_id metadata" });

  const paymentIntent =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;

  // FIRST TO PAY WINS. Idempotent: the status guard makes a re-delivered event match zero rows.
  // No split is computed here — that happens when the admin builds a payout (M2.2).
  const { error } = await supabaseAdmin
    .from("bookings")
    .update({ status: "paid", paid_at: new Date().toISOString(), stripe_payment_intent_id: paymentIntent })
    .eq("id", bookingId)
    .eq("status", "pending_payment");

  if (error) {
    console.error("webhook update failed", error.message);
    return res.status(500).json({ error: "could not record payment" }); // Stripe will retry
  }
  return res.status(200).json({ received: true });
}
