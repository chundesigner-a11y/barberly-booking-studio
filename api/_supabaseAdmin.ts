// Server-only Supabase client (service-role / secret key — bypasses RLS).
// Used ONLY by Vercel serverless functions in /api. Never import this from src/.
import { createClient } from "@supabase/supabase-js";

// The project URL is public (it is also in the browser bundle); the SECRET key comes only from Vercel env.
const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "https://fdueivjlnigqxlljvscp.supabase.co";
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_SECRET_KEY) {
  throw new Error("Missing SUPABASE_SECRET_KEY (Vercel → Settings → Environment Variables)");
}

const isOpaqueKey = (k: string) => k.startsWith("sb_secret_") || k.startsWith("sb_publishable_");

// New-format sb_secret_… keys are not JWTs: send them as the apikey header and don't
// forward them as a Bearer token (a user's own Bearer token is left untouched).
const keyAwareFetch: typeof fetch = (input, init) => {
  const headers = new Headers(init?.headers);
  if (isOpaqueKey(SUPABASE_SECRET_KEY) && headers.get("Authorization") === `Bearer ${SUPABASE_SECRET_KEY}`) {
    headers.delete("Authorization");
  }
  headers.set("apikey", SUPABASE_SECRET_KEY);
  return fetch(input, { ...init, headers });
};

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: keyAwareFetch },
});
