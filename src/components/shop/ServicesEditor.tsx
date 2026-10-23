import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney, usePlatformSettings } from "@/lib/platformSettings";

type Service = Tables<"services">;
export const CATEGORIES = [
  { value: "cut", label: "剪髮 Cut" },
  { value: "color", label: "染髮 Color" },
  { value: "perm", label: "燙髮 Perm" },
  { value: "beard", label: "修鬍 Beard" },
] as const;

type Draft = { name: string; category: string; price: string; required_slots: string };
const EMPTY: Draft = { name: "", category: "cut", price: "", required_slots: "1" };

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring";

function ServiceForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: Draft;
  submitLabel: string;
  onSubmit: (d: Draft) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const settings = usePlatformSettings();
  const [d, setD] = useState(initial);
  const [saving, setSaving] = useState(false);
  const slots = Number(d.required_slots) || 0;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const ok = await onSubmit(d);
    setSaving(false);
    if (ok && !onCancel) setD(EMPTY);
  }

  return (
    <form onSubmit={submit} className="grid gap-3 md:grid-cols-[2fr_1.2fr_1fr_1fr_auto] md:items-end">
      <div className="space-y-1.5">
        <Label>名稱 Name</Label>
        <Input required value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="Men's Hair Cut" />
      </div>
      <div className="space-y-1.5">
        <Label>分類 Category</Label>
        <select className={selectClass} value={d.category} onChange={(e) => setD({ ...d, category: e.target.value })}>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>價格 Price ({settings.currency.toUpperCase()})</Label>
        <Input
          required
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          value={d.price}
          onChange={(e) => setD({ ...d, price: e.target.value })}
          placeholder="300"
        />
      </div>
      <div className="space-y-1.5">
        <Label>所需時段數 Slots</Label>
        <Input
          required
          type="number"
          min={1}
          step={1}
          value={d.required_slots}
          onChange={(e) => setD({ ...d, required_slots: e.target.value })}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={saving} className="rounded-full">
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" className="rounded-full" onClick={onCancel}>
            取消
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground md:col-span-5">
        價格請直接填整數金額（300 = {formatMoney(300, settings)}）。每個時段 {settings.slot_minutes} 分鐘
        {slots > 0 && `，這個服務共 ${slots * settings.slot_minutes} 分鐘`}。
      </p>
    </form>
  );
}

function parseDraft(d: Draft) {
  const price = Number(d.price);
  const required = Number(d.required_slots);
  if (!d.name.trim()) return "請填服務名稱";
  if (!Number.isInteger(price) || price < 0) return "價格要是 0 以上的整數";
  if (!Number.isInteger(required) || required < 1) return "所需時段數要是 1 以上的整數";
  return { name: d.name.trim(), category: d.category, price, required_slots: required };
}

/** Services & price editor for one barber. */
export function ServicesEditor({ barberId }: { barberId: string }) {
  const settings = usePlatformSettings();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const key = ["services", barberId];

  const { data: services = [] } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").eq("barber_id", barberId).order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });

  async function add(d: Draft) {
    const v = parseDraft(d);
    if (typeof v === "string") {
      toast.error(v);
      return false;
    }
    const { error } = await supabase.from("services").insert({ barber_id: barberId, ...v });
    if (error) {
      toast.error(error.message);
      return false;
    }
    await refresh();
    toast.success("已新增服務 / Service added");
    return true;
  }

  async function save(s: Service, d: Draft) {
    const v = parseDraft(d);
    if (typeof v === "string") {
      toast.error(v);
      return false;
    }
    const { error } = await supabase.from("services").update(v).eq("id", s.id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    setEditingId(null);
    await refresh();
    return true;
  }

  async function remove(s: Service) {
    if (!window.confirm(`刪除服務「${s.name}」？`)) return;
    const { error } = await supabase.from("services").delete().eq("id", s.id);
    if (error) toast.error(error.message);
    await refresh();
  }

  const label = (c: string) => CATEGORIES.find((x) => x.value === c)?.label ?? c;

  return (
    <section className="rounded-3xl border border-border bg-card p-6 md:p-8">
      <h2 className="font-serif text-3xl">服務與價格 / Services & prices</h2>

      <div className="mt-6 divide-y divide-border rounded-2xl border border-border bg-background">
        {services.length === 0 && <p className="px-5 py-6 text-center text-sm text-muted-foreground">還沒有服務項目。</p>}
        {services.map((s) =>
          editingId === s.id ? (
            <div key={s.id} className="p-4">
              <ServiceForm
                initial={{ name: s.name, category: s.category, price: String(s.price), required_slots: String(s.required_slots) }}
                submitLabel="儲存"
                onSubmit={(d) => save(s, d)}
                onCancel={() => setEditingId(null)}
              />
            </div>
          ) : (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-sm text-muted-foreground">
                  {label(s.category)} · {s.required_slots} 個時段（{s.required_slots * settings.slot_minutes} 分鐘）
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-xl">{formatMoney(s.price, settings)}</span>
                <Button size="icon" variant="ghost" onClick={() => setEditingId(s.id)}>
                  <Pencil />
                </Button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(s)}>
                  <Trash2 />
                </Button>
              </div>
            </div>
          ),
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-border p-5">
        <h3 className="mb-4 flex items-center gap-2 font-medium">
          <Plus className="h-4 w-4" /> 新增服務 / Add a service
        </h3>
        <ServiceForm initial={EMPTY} submitLabel="新增" onSubmit={add} />
      </div>
    </section>
  );
}
