import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { errMessage } from "@/lib/errors";
import { formatMoney, usePlatformSettings } from "@/lib/platformSettings";
import { validStarts, type SlotRow } from "@/lib/slots";
import { DISPLAY_TZ_LABEL, dayFmt, dayKey, formatRange, timeFmt } from "@/lib/time";
import { cn } from "@/lib/utils";

type Service = Tables<"services">;

const CATEGORY_LABEL: Record<string, string> = { cut: "剪髮", color: "染髮", perm: "燙髮", beard: "修鬍" };

/**
 * Book pop-up over /barbers/:id — service -> date -> start slot -> Confirm.
 * Confirm calls create_booking (1 booking + N booking_slots, status pending_payment)
 * then closes and stays on the page. `onBook` is the single seam M2.1 swaps for Checkout.
 */
export function BookingDialog({
  open,
  onOpenChange,
  barberName,
  services,
  freeSlots,
  initialServiceId,
  onBooked,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barberName: string;
  services: Service[];
  freeSlots: SlotRow[];
  initialServiceId: string | null;
  onBooked: () => Promise<void> | void;
}) {
  const settings = usePlatformSettings();
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [startId, setStartId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setServiceId(initialServiceId ?? services[0]?.id ?? null);
      setDay(null);
      setStartId(null);
    }
  }, [open, initialServiceId, services]);

  const service = services.find((s) => s.id === serviceId) ?? null;
  const n = service?.required_slots ?? 1;
  const starts = useMemo(() => validStarts(freeSlots, n), [freeSlots, n]);

  // days that have at least one valid start for the chosen service
  const days = useMemo(() => {
    const keys: string[] = [];
    for (const s of freeSlots) {
      if (starts.has(s.id)) {
        const k = dayKey(s.starts_at);
        if (!keys.includes(k)) keys.push(k);
      }
    }
    return keys;
  }, [freeSlots, starts]);

  useEffect(() => {
    if (!day || !days.includes(day)) setDay(days[0] ?? null);
  }, [days, day]);
  useEffect(() => {
    if (startId && !starts.has(startId)) setStartId(null);
  }, [starts, startId]);

  const daySlots = freeSlots.filter((s) => day && dayKey(s.starts_at) === day && starts.has(s.id));
  const run = startId ? starts.get(startId) ?? [] : [];
  const runIds = new Set(run.map((r) => r.id));
  const first = run[0];
  const last = run[run.length - 1];

  async function confirm() {
    if (!service || !startId) return;
    setSubmitting(true);
    const { error } = await supabase.rpc("create_booking", { p_service_id: service.id, p_start_slot_id: startId });
    setSubmitting(false);
    if (error) {
      const msg = errMessage(error);
      toast.error(msg.includes("just taken") ? "這些時段剛剛被搶走了，請換一個開始時間" : msg);
      await onBooked(); // refresh availability either way
      return;
    }
    onOpenChange(false);
    toast.success("預約已建立！可以到「我的預約」查看 / Booking created");
    await onBooked();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-3xl font-normal">預約 {barberName}</DialogTitle>
          <DialogDescription>先選服務，再選日期與開始時間（{DISPLAY_TZ_LABEL}）。</DialogDescription>
        </DialogHeader>

        <section className="space-y-2">
          <h3 className="text-sm font-medium">① 服務 Service</h3>
          <div className="grid gap-2">
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setServiceId(s.id)}
                className={cn(
                  "flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors",
                  s.id === serviceId ? "border-primary bg-primary/5" : "border-border hover:bg-muted",
                )}
              >
                <span>
                  <span className="font-medium">{s.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {CATEGORY_LABEL[s.category] ?? s.category} · {s.required_slots * settings.slot_minutes} 分鐘（{s.required_slots} 個時段）
                  </span>
                </span>
                <span className="flex items-center gap-2 font-serif text-lg">
                  {formatMoney(s.price, settings)}
                  {s.id === serviceId && <Check className="h-4 w-4" />}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-medium">② 日期 Date</h3>
          {days.length === 0 ? (
            <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
              目前沒有足夠的連續空檔可以做這個服務（需要連續 {n} 個時段）。
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {days.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDay(d);
                    setStartId(null);
                  }}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm",
                    d === day ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted",
                  )}
                >
                  {dayFmt.format(new Date(`${d}T12:00:00+08:00`))}
                </button>
              ))}
            </div>
          )}
        </section>

        {daySlots.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-medium">③ 開始時間 Start time</h3>
            <div className="flex flex-wrap gap-2">
              {daySlots.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStartId(s.id)}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm tabular-nums transition-colors",
                    s.id === startId
                      ? "border-primary bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                      : runIds.has(s.id)
                        ? "border-primary bg-primary/15"
                        : "border-border hover:bg-muted",
                  )}
                >
                  {timeFmt.format(new Date(s.starts_at))}
                </button>
              ))}
            </div>
            {n > 1 && <p className="text-xs text-muted-foreground">此服務會連續佔用 {n} 個時段，只列出後面還有足夠空檔的開始時間。</p>}
          </section>
        )}

        {service && first && last && (
          <div className="flex items-start gap-3 rounded-2xl bg-muted px-4 py-3">
            <CalendarClock className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium">
                你的預約：{dayFmt.format(new Date(first.starts_at))} {formatRange(first.starts_at, last.ends_at)}
                {n > 1 && `（連佔 ${n} 個時段）`}
              </p>
              <p className="text-muted-foreground">
                {service.name} · {formatMoney(service.price, settings)}
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" className="rounded-full" onClick={() => onOpenChange(false)}>
            取消 Cancel
          </Button>
          <Button className="rounded-full px-6" disabled={!service || !startId || submitting} onClick={confirm}>
            {submitting ? "預約中…" : `確認預約 Confirm${service ? ` · ${formatMoney(service.price, settings)}` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
