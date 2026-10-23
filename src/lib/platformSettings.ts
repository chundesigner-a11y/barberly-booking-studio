import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type PlatformSettings = Tables<"platform_settings">;

const FALLBACK: PlatformSettings = {
  id: true,
  currency: "twd",
  currency_minor_units: 0,
  slot_minutes: 30,
  updated_at: new Date(0).toISOString(),
};

/** The single-row platform config (currency + slot length). World-readable. */
export function usePlatformSettings() {
  const query = useQuery({
    queryKey: ["platform_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_settings").select("*").maybeSingle();
      if (error) throw error;
      return data ?? FALLBACK;
    },
    staleTime: 5 * 60 * 1000,
  });
  return query.data ?? FALLBACK;
}

/**
 * Formats an integer money amount stored in whole currency units (e.g. 300 = NT$300).
 * currency_minor_units is DISPLAY decimals only.
 */
export function formatMoney(amount: number, settings: PlatformSettings): string {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: settings.currency.toUpperCase(),
    minimumFractionDigits: settings.currency_minor_units,
    maximumFractionDigits: settings.currency_minor_units,
  }).format(amount);
}
