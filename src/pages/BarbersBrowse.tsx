import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Scissors, Search, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { usePageTitle } from "@/hooks/usePageTitle";
import { formatMoney, usePlatformSettings } from "@/lib/platformSettings";
import { photoUrl, repPhoto } from "@/lib/photos";
import { cn } from "@/lib/utils";

const CHIPS = [
  { value: "all", label: "All" },
  { value: "cut", label: "Cut" },
  { value: "color", label: "Color" },
  { value: "perm", label: "Perm" },
  { value: "beard", label: "Beard" },
] as const;

/** /barbers — public marketplace grid of every barber. */
export default function BarbersBrowse() {
  usePageTitle("Find a barber — Barberly");
  const settings = usePlatformSettings();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const cat = params.get("cat") ?? "all";

  const { data: barbers = [], isLoading } = useQuery({
    queryKey: ["browse_barbers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("barbers")
        .select("id, name, intro, address, created_at, services(category, price), barber_photos(storage_path, is_featured, sort_order, created_at)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return barbers.filter((b) => {
      const text = `${b.name} ${b.address ?? ""} ${b.intro ?? ""}`.toLowerCase();
      const matchesQ = !needle || text.includes(needle);
      const matchesCat = cat === "all" || b.services.some((s) => s.category === cat);
      return matchesQ && matchesCat;
    });
  }, [barbers, q, cat]);

  function setCat(value: string) {
    const next = new URLSearchParams(params);
    if (value === "all") next.delete("cat");
    else next.set("cat", value);
    setParams(next, { replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-5 py-12">
        <div className="fade-up text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Discover</p>
          <h1 className="mt-3 font-serif text-5xl md:text-6xl">Find your barber</h1>
          <div className="mx-auto mt-8 flex max-w-md items-center gap-2 rounded-full border border-border bg-card p-1.5 pl-5 shadow-lift">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜尋名稱或地址 / name or address"
              className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {CHIPS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCat(c.value)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm transition-colors",
                  cat === c.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-96 animate-pulse rounded-3xl bg-muted" />
            ))}
          {!isLoading && shown.length === 0 && (
            <p className="col-span-full py-16 text-center text-muted-foreground">沒有符合條件的理髮師。</p>
          )}
          {shown.map((b) => {
            const photo = repPhoto(b.barber_photos);
            const cats = [...new Set(b.services.map((s) => s.category))];
            const from = b.services.length ? Math.min(...b.services.map((s) => s.price)) : null;
            return (
              <Link
                key={b.id}
                to={`/barbers/${b.id}`}
                className="group block overflow-hidden rounded-3xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
              >
                <div className="relative">
                  {photo ? (
                    <img src={photoUrl(photo.storage_path)} alt={b.name} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[4/3] w-full items-center justify-center bg-muted">
                      <Scissors className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                  {photo?.is_featured && (
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-card/90 px-2.5 py-1 text-xs font-medium">
                      <Sparkles className="h-3 w-3" /> Featured
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <h2 className="font-serif text-2xl">{b.name}</h2>
                  {b.address && (
                    <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" /> {b.address}
                    </p>
                  )}
                  {b.intro && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{b.intro}</p>}
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-1.5">
                      {cats.map((c) => (
                        <span key={c} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs capitalize text-secondary-foreground">
                          {c}
                        </span>
                      ))}
                    </div>
                    {from !== null && (
                      <span className="shrink-0 text-sm">
                        from <strong>{formatMoney(from, settings)}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
