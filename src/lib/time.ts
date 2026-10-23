/** All slot times are shown in the shop's timezone, labelled, so buyer and shop see the same wall clock. */
export const DISPLAY_TZ = "Asia/Taipei";
export const DISPLAY_TZ_LABEL = "台北時間";

export const timeFmt = new Intl.DateTimeFormat("zh-TW", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: DISPLAY_TZ,
});

export const dayFmt = new Intl.DateTimeFormat("zh-TW", {
  month: "long",
  day: "numeric",
  weekday: "short",
  timeZone: DISPLAY_TZ,
});

/** YYYY-MM-DD in the display timezone — the key used to group slots by day. */
export function dayKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: DISPLAY_TZ }).format(new Date(iso));
}

export function formatRange(startIso: string, endIso: string): string {
  return `${timeFmt.format(new Date(startIso))}–${timeFmt.format(new Date(endIso))}`;
}
