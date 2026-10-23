/**
 * Supabase returns PostgrestError as a plain object ({ message, details, hint, code }),
 * not an Error instance — read .message off either shape so the real DB message shows.
 */
export function errMessage(err: unknown, fallback = "發生錯誤，請再試一次"): string {
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  if (typeof err === "string" && err.trim()) return err;
  return fallback;
}
