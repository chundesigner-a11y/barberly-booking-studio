import { useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePlatformSettings } from "@/lib/platformSettings";

type Slot = Tables<"bookable_slots">;

function todayLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

const timeFmt = new Intl.DateTimeFormat("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false });
const dayFmt = new Intl.DateTimeFormat("zh-TW", { month: "long", day: "numeric", weekday: "short" });

/** Publish slot_minutes-long bookable windows for one barber (no status column). */
export function SlotPublisher({ barberId }: { barberId: string }) {
  const settings = usePlatformSettings();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(todayLocal());
  const [from, setFrom] = useState("10:00");
  const [to, setTo] = useState("12:00");
  const [busy, setBusy] = useState(false);
  const key = ["bookable_slots", barberId];

  const { data: slots = [] } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookable_slots")
        .select("*")
        .eq("barber_id", barberId)
        .gte("starts_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString())
        .order("starts_at");
      if (error) throw error;
      return data;
    },
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });

  const minutes = settings.slot_minutes;
  const preview = useMemo(() => {
    const start = new Date(`${date}T${from}`);
    const end = new Date(`${date}T${to}`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return [];
    const out: { starts_at: Date; ends_at: Date }[] = [];
    for (let t = start.getTime(); t + minutes * 60000 <= end.getTime(); t += minutes * 60000) {
      out.push({ starts_at: new Date(t), ends_at: new Date(t + minutes * 60000) });
    }
    return out;
  }, [date, from, to, minutes]);

  async function publish(e: FormEvent) {
    e.preventDefault();
    if (preview.length === 0) {
      toast.error(`結束時間要比開始時間晚至少 ${minutes} 分鐘`);
      return;
    }
    const overlaps = (a: { starts_at: Date; ends_at: Date }) =>
      slots.some((s) => new Date(s.starts_at) < a.ends_at && new Date(s.ends_at) > a.starts_at);
    const fresh = preview.filter((p) => !overlaps(p));
    if (fresh.length === 0) {
      toast.info("這些時段都已經發布過了");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("bookable_slots").insert(
      fresh.map((p) => ({
        barber_id: barberId,
        starts_at: p.starts_at.toISOString(),
        ends_at: p.ends_at.toISOString(),
      })),
    );
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const skipped = preview.length - fresh.length;
    toast.success(`已發布 ${fresh.length} 個時段${skipped ? `（略過 ${skipped} 個重複）` : ""}`);
    await refresh();
  }

  async function removeSlots(ids: string[], confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    const { error } = await supabase.from("bookable_slots").delete().in("id", ids);
    if (error) toast.error(error.message);
    await refresh();
  }

  const byDay = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots) {
      const k = dayFmt.format(new Date(s.starts_at));
      map.set(k, [...(map.get(k) ?? []), s]);
    }
    return [...map.entries()];
  }, [slots]);

  return (
    <section className="rounded-3xl border border-border bg-card p-6 md:p-8">
      <h2 className="font-serif text-3xl">可預約時段 / Bookable slots</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        每個時段 {minutes} 分鐘。選一段時間，系統會自動切成一格一格的時段。
      </p>

      <form onSubmit={publish} className="mt-6 grid gap-3 rounded-2xl border border-dashed border-border p-5 md:grid-cols-[1.3fr_1fr_1fr_auto] md:items-end">
        <div className="space-y-1.5">
          <Label>日期 Date</Label>
          <Input type="date" required value={date} min={todayLocal()} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>開始 From</Label>
          <Input type="time" required step={minutes * 60} value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>結束 To</Label>
          <Input type="time" required step={minutes * 60} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button type="submit" disabled={busy || preview.length === 0} className="rounded-full">
          <CalendarPlus /> 發布 {preview.length} 個時段
        </Button>
      </form>

      <div className="mt-6 space-y-4">
        {byDay.length === 0 && (
          <p className="rounded-2xl border border-border bg-background px-5 py-6 text-center text-sm text-muted-foreground">
            還沒有發布任何時段。
          </p>
        )}
        {byDay.map(([day, list]) => (
          <div key={day} className="rounded-2xl border border-border bg-background p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-medium">
                {day} <span className="text-sm text-muted-foreground">· {list.length} 個時段</span>
              </h3>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-full text-destructive"
                onClick={() => removeSlots(list.map((s) => s.id), `刪除 ${day} 的全部 ${list.length} 個時段？`)}
              >
                <Trash2 /> 整天刪除
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {list.map((s) => (
                <span key={s.id} className="inline-flex items-center gap-1 rounded-full border border-border bg-card py-1 pr-1 pl-3 text-sm">
                  {timeFmt.format(new Date(s.starts_at))}–{timeFmt.format(new Date(s.ends_at))}
                  <button
                    type="button"
                    onClick={() => removeSlots([s.id])}
                    className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    title="刪除這個時段"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
