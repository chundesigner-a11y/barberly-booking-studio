import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Scissors, Sparkles, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { photoUrl } from "@/lib/photos";
import { cn } from "@/lib/utils";

type Photo = { id: string; storage_path: string; caption: string | null; is_featured: boolean };

/** Product-detail style carousel: main image + prev/next + thumbnails + click-to-zoom. */
export function PhotoCarousel({ photos, alt }: { photos: Photo[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const count = photos.length;
  const current = photos[index];

  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  const go = (d: number) => setIndex((i) => (i + d + count) % count);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (count < 2) return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!current) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-3xl bg-muted md:aspect-[16/9]">
        <div className="text-center text-muted-foreground">
          <Scissors className="mx-auto h-10 w-10" />
          <p className="mt-2 text-sm">還沒有作品照</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-3xl bg-muted">
        <button type="button" onClick={() => setZoom(true)} className="block w-full cursor-zoom-in" title="點圖放大">
          <img src={photoUrl(current.storage_path)} alt={current.caption ?? alt} className="aspect-[4/3] w-full object-cover md:aspect-[16/9]" />
        </button>
        {current.is_featured && (
          <span className="absolute top-4 left-4 inline-flex items-center gap-1 rounded-full bg-card/90 px-3 py-1 text-xs font-medium">
            <Sparkles className="h-3 w-3" /> Featured
          </span>
        )}
        {current.caption && (
          <span className="absolute bottom-4 left-4 rounded-full bg-card/90 px-3 py-1 text-sm">{current.caption}</span>
        )}
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute top-1/2 left-3 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 shadow"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute top-1/2 right-3 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 shadow"
              aria-label="Next photo"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <span className="absolute right-4 bottom-4 rounded-full bg-card/90 px-2.5 py-1 text-xs">
              {index + 1} / {count}
            </span>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setIndex(i)}
              className={cn(
                "shrink-0 overflow-hidden rounded-xl border-2 transition-opacity",
                i === index ? "border-primary" : "border-transparent opacity-60 hover:opacity-100",
              )}
              aria-label={`Photo ${i + 1}`}
            >
              <img src={photoUrl(p.storage_path)} alt="" className="h-16 w-16 object-cover md:h-20 md:w-20" />
            </button>
          ))}
        </div>
      )}

      <Dialog open={zoom} onOpenChange={setZoom}>
        <DialogContent className="max-w-5xl border-none bg-transparent p-0 shadow-none [&>button]:hidden">
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <div className="relative">
            <img src={photoUrl(current.storage_path)} alt={current.caption ?? alt} className="max-h-[85vh] w-full rounded-2xl object-contain" />
            <button
              type="button"
              onClick={() => setZoom(false)}
              className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-card/90"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            {count > 1 && (
              <>
                <button type="button" onClick={() => go(-1)} className="absolute top-1/2 left-3 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-card/90" aria-label="Previous photo">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button type="button" onClick={() => go(1)} className="absolute top-1/2 right-3 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-card/90" aria-label="Next photo">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
