import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, ImagePlus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Photo = Tables<"barber_photos">;
const BUCKET = "barber-photos";

export function photoUrl(path: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Sample hairstyle photos for ONE barber. Files: barber-photos/<barber_id>/<uuid>.<ext>. */
export function PhotoManager({ barberId }: { barberId: string }) {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const key = ["barber_photos", barberId];

  const { data: photos = [] } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("barber_photos")
        .select("*")
        .eq("barber_id", barberId)
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: key });

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    let order = photos.reduce((m, p) => Math.max(m, p.sort_order), -1) + 1;
    for (const file of Array.from(files)) {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${barberId}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
      if (up.error) {
        toast.error(`${file.name}: ${up.error.message}`);
        continue;
      }
      const { error } = await supabase
        .from("barber_photos")
        .insert({ barber_id: barberId, storage_path: path, sort_order: order++ });
      if (error) {
        await supabase.storage.from(BUCKET).remove([path]);
        toast.error(error.message);
      }
    }
    setUploading(false);
    if (fileInput.current) fileInput.current.value = "";
    await refresh();
  }

  async function update(photo: Photo, patch: Partial<Pick<Photo, "is_featured" | "caption" | "sort_order">>) {
    const { error } = await supabase.from("barber_photos").update(patch).eq("id", photo.id);
    if (error) toast.error(error.message);
    await refresh();
  }

  async function remove(photo: Photo) {
    const st = await supabase.storage.from(BUCKET).remove([photo.storage_path]);
    if (st.error) {
      toast.error(st.error.message);
      return;
    }
    const { error } = await supabase.from("barber_photos").delete().eq("id", photo.id);
    if (error) toast.error(error.message);
    await refresh();
  }

  async function move(index: number, dir: -1 | 1) {
    const a = photos[index];
    const b = photos[index + dir];
    if (!a || !b) return;
    // Re-number everything so ties never block a swap.
    const reordered = [...photos];
    reordered[index] = b;
    reordered[index + dir] = a;
    await Promise.all(
      reordered.map((p, i) =>
        p.sort_order === i ? null : supabase.from("barber_photos").update({ sort_order: i }).eq("id", p.id),
      ),
    );
    await refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-medium">作品照 / Sample hairstyle photos</h4>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-full"
          disabled={uploading}
          onClick={() => fileInput.current?.click()}
        >
          <ImagePlus /> {uploading ? "上傳中…" : "上傳照片 Upload"}
        </Button>
      </div>

      {photos.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          還沒有作品照。上傳幾張這位理髮師剪過的髮型吧！
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((p, i) => (
            <figure key={p.id} className="overflow-hidden rounded-2xl border border-border bg-background">
              <div className="relative">
                <img src={photoUrl(p.storage_path)} alt={p.caption ?? ""} className="aspect-square w-full object-cover" />
                <button
                  type="button"
                  onClick={() => update(p, { is_featured: !p.is_featured })}
                  className={cn(
                    "absolute top-2 left-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
                    p.is_featured ? "bg-primary text-primary-foreground" : "bg-card/90 text-foreground",
                  )}
                  title="精選 / Featured"
                >
                  <Star className={cn("h-3 w-3", p.is_featured && "fill-current")} /> 精選
                </button>
              </div>
              <figcaption className="space-y-2 p-2">
                <input
                  defaultValue={p.caption ?? ""}
                  placeholder="說明 caption"
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v !== (p.caption ?? "")) void update(p, { caption: v || null });
                  }}
                  className="w-full rounded-md border border-border bg-transparent px-2 py-1 text-xs outline-none"
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7" disabled={i === 0} onClick={() => move(i, -1)}>
                      <ArrowLeft />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7" disabled={i === photos.length - 1} onClick={() => move(i, 1)}>
                      <ArrowRight />
                    </Button>
                  </div>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(p)}>
                    <Trash2 />
                  </Button>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
