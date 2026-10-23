import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuthUser } from "@/components/RequireAuth";
import { PhotoManager } from "@/components/shop/PhotoManager";
import { useMyBarbers } from "@/components/shop/useMyBarbers";
import { cn } from "@/lib/utils";

type Barber = Tables<"barbers">;
type BarberDraft = { name: string; intro: string; address: string };
const EMPTY: BarberDraft = { name: "", intro: "", address: "" };

function BarberForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: BarberDraft;
  submitLabel: string;
  onSubmit: (d: BarberDraft) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!draft.name.trim()) {
      toast.error("請填理髮師名稱 / Name is required");
      return;
    }
    setSaving(true);
    const ok = await onSubmit(draft);
    setSaving(false);
    if (ok && !onCancel) setDraft(EMPTY);
  }

  return (
    <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-1.5">
        <Label>名稱 Name *</Label>
        <Input required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Marco Reyes" />
      </div>
      <div className="space-y-1.5">
        <Label>地址 Address</Label>
        <Input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} placeholder="台北市信義區…" />
      </div>
      <div className="space-y-1.5 md:col-span-2">
        <Label>簡介 Intro</Label>
        <Textarea
          rows={3}
          value={draft.intro}
          onChange={(e) => setDraft({ ...draft, intro: e.target.value })}
          placeholder="簡短介紹一下這位理髮師 / a short bio"
        />
      </div>
      <div className="flex gap-2 md:col-span-2">
        <Button type="submit" disabled={saving} className="rounded-full px-6">
          {saving ? "儲存中…" : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" className="rounded-full" onClick={onCancel}>
            取消 Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

function BarberCard({ barber, onChanged }: { barber: Barber; onChanged: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(true);

  async function save(d: BarberDraft) {
    const { error } = await supabase
      .from("barbers")
      .update({ name: d.name.trim(), intro: d.intro.trim() || null, address: d.address.trim() || null })
      .eq("id", barber.id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    setEditing(false);
    await onChanged();
    toast.success("已更新 / Updated");
    return true;
  }

  async function remove() {
    if (!window.confirm(`刪除理髮師「${barber.name}」？他的服務、時段與作品照都會一起刪除。`)) return;
    const { data: photos } = await supabase.from("barber_photos").select("storage_path").eq("barber_id", barber.id);
    if (photos && photos.length > 0) {
      await supabase.storage.from("barber-photos").remove(photos.map((p) => p.storage_path));
    }
    const { error } = await supabase.from("barbers").delete().eq("id", barber.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await onChanged();
    toast.success("已刪除 / Deleted");
  }

  return (
    <article className="rounded-2xl border border-border bg-background p-5">
      {editing ? (
        <BarberForm
          initial={{ name: barber.name, intro: barber.intro ?? "", address: barber.address ?? "" }}
          submitLabel="儲存 Save"
          onSubmit={save}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <button type="button" onClick={() => setOpen(!open)} className="min-w-0 text-left">
            <h3 className="flex items-center gap-2 font-serif text-2xl">
              {barber.name}
              <ChevronDown className={cn("h-4 w-4 transition-transform", !open && "-rotate-90")} />
            </h3>
            {barber.address && <p className="text-sm text-muted-foreground">{barber.address}</p>}
            {barber.intro && <p className="mt-2 max-w-2xl whitespace-pre-line text-sm">{barber.intro}</p>}
          </button>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setEditing(true)}>
              <Pencil /> 編輯
            </Button>
            <Button size="sm" variant="ghost" className="rounded-full text-destructive" onClick={remove}>
              <Trash2 /> 刪除
            </Button>
          </div>
        </div>
      )}
      {open && !editing && (
        <div className="mt-5 border-t border-border pt-5">
          <PhotoManager barberId={barber.id} />
        </div>
      )}
    </article>
  );
}

/** "My barbers" — a shop can list MANY barbers. */
export function BarbersManager() {
  const user = useAuthUser();
  const queryClient = useQueryClient();
  const { data: barbers = [], isLoading } = useMyBarbers();
  const [adding, setAdding] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["my_barbers", user.id] });

  async function add(d: BarberDraft) {
    const { error } = await supabase.from("barbers").insert({
      shop_id: user.id,
      name: d.name.trim(),
      intro: d.intro.trim() || null,
      address: d.address.trim() || null,
    });
    if (error) {
      toast.error(error.message);
      return false;
    }
    await refresh();
    setAdding(false);
    toast.success("已新增理髮師 / Barber added");
    return true;
  }

  const showForm = adding || (!isLoading && barbers.length === 0);

  return (
    <section className="rounded-3xl border border-border bg-card p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-3xl">我的理髮師 / My barbers</h2>
          <p className="mt-1 text-sm text-muted-foreground">一間店可以有很多位理髮師。</p>
        </div>
        {!showForm && (
          <Button className="rounded-full" onClick={() => setAdding(true)}>
            <Plus /> 新增一位理髮師 / Add another barber
          </Button>
        )}
      </div>

      {showForm && (
        <div className="mt-6 rounded-2xl border border-dashed border-border p-5">
          <h3 className="mb-4 font-medium">新增理髮師 / New barber</h3>
          <BarberForm
            initial={EMPTY}
            submitLabel="新增 Add"
            onSubmit={add}
            {...(barbers.length > 0 ? { onCancel: () => setAdding(false) } : {})}
          />
        </div>
      )}

      <div className="mt-6 space-y-4">
        {barbers.map((b) => (
          <BarberCard key={b.id} barber={b} onChanged={refresh} />
        ))}
      </div>
    </section>
  );
}
