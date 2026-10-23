import { supabase } from "@/integrations/supabase/client";

export const PHOTO_BUCKET = "barber-photos";

/** Public URL of a portfolio image in the public barber-photos bucket. */
export function photoUrl(path: string): string {
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

type PhotoLike = { storage_path: string; is_featured: boolean; sort_order: number; created_at: string };

/** Featured first, then sort_order, then oldest first. */
export function sortPhotos<T extends PhotoLike>(photos: T[]): T[] {
  return [...photos].sort(
    (a, b) =>
      Number(b.is_featured) - Number(a.is_featured) ||
      a.sort_order - b.sort_order ||
      a.created_at.localeCompare(b.created_at),
  );
}

/** Rep photo for a card: first featured, else the newest, else null. */
export function repPhoto<T extends PhotoLike>(photos: T[]): T | null {
  const featured = sortPhotos(photos.filter((p) => p.is_featured))[0];
  if (featured) return featured;
  return [...photos].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
}
