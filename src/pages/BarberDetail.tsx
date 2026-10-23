import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { useSession } from "@/components/RequireAuth";
import { BookingDialog } from "@/components/booking/BookingDialog";
import { PhotoCarousel } from "@/components/booking/PhotoCarousel";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";
import { formatMoney, usePlatformSettings } from "@/lib/platformSettings";
import { sortPhotos } from "@/lib/photos";
import type { SlotRow } from "@/lib/slots";
import { DISPLAY_TZ_LABEL, dayFmt, dayKey, timeFmt } from "@/lib/time";

const CATEGORY_LABEL: Record<string, string> = { cut: "剪髮 Cut", color: "染髮 Color", perm: "燙髮 Perm", beard: "修鬍 Beard" };

/** /barbers/:id — marketplace product-detail layout: carousel, profile, services, free slots, Book. */
export default function BarberDetail() {
  const { id = "" } = useParams();
  const settings = usePlatformSettings();
  const { user } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [preselect, setPreselect] = useState<string | null>(null);

  const barberQ = useQuery({
    queryKey: ["barber_detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("barbers")
        .select("id, name, intro, address, services(*), barber_photos(id, storage_path, caption, is_featured, sort_order, created_at)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const slotsQ = useQuery({
    queryKey: ["available_slots", id],
    queryFn: async () => {
      // anti-join view: slots with NO booking_slots row
      const { data, error } = await supabase
        .from("available_slots")
        .select("id, starts_at, ends_at")
        .eq("barber_id", id)
        .gt("starts_at", new Date().toISOString())
        .order("starts_at");
      if (error) throw error;
      return (data ?? []).filter((s): s is SlotRow => Boolean(s.id && s.starts_at && s.ends_at));
    },
  });

  const barber = barberQ.data;
  usePageTitle(barber ? `${barber.name} — Barberly` : "Barberly");
  const services = useMemo(
    () => [...(barber?.services ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [barber],
  );
  const photos = useMemo(() => sortPhotos(barber?.barber_photos ?? []), [barber]);
  const freeSlots = slotsQ.data ?? [];

  const byDay = useMemo(() => {
    const map = new Map<string, SlotRow[]>();
    for (const s of freeSlots) map.set(dayKey(s.starts_at), [...(map.get(dayKey(s.starts_at)) ?? []), s]);
    return [...map.entries()];
  }, [freeSlots]);

  function book(serviceId: string | null) {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(location.pathname)}`);
      return;
    }
    setPreselect(serviceId);
    setOpen(true);
  }

  async function refreshSlots() {
    await queryClient.invalidateQueries({ queryKey: ["available_slots", id] });
    await queryClient.invalidateQueries({ queryKey: ["my_bookings"] });
  }

  if (barberQ.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="mx-auto mt-12 h-96 max-w-6xl animate-pulse rounded-3xl bg-muted px-5" />
      </div>
    );
  }

  if (!barber) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="mx-auto max-w-2xl px-5 py-24 text-center">
          <h1 className="font-serif text-4xl">找不到這位理髮師</h1>
          <Link to="/barbers" className="mt-6 inline-block underline underline-offset-4">
            回到理髮師列表
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="fade-up mx-auto max-w-6xl px-5 py-8">
        <Link to="/barbers" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> 所有理髮師
        </Link>

        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <PhotoCarousel photos={photos} alt={barber.name} />

          <div className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Barber</p>
              <h1 className="mt-2 font-serif text-5xl">{barber.name}</h1>
              {barber.address && (
                <p className="mt-2 flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-4 w-4" /> {barber.address}
                </p>
              )}
              {services.length > 0 && (
                <p className="mt-3 text-lg">
                  from <strong>{formatMoney(Math.min(...services.map((s) => s.price)), settings)}</strong>
                </p>
              )}
            </div>
            {barber.intro && <p className="whitespace-pre-line leading-relaxed">{barber.intro}</p>}
            <Button
              size="lg"
              className="h-12 w-full rounded-full text-base"
              disabled={services.length === 0 || freeSlots.length === 0}
              onClick={() => book(null)}
            >
              {services.length === 0 ? "尚未開放預約" : freeSlots.length === 0 ? "目前沒有空檔" : "預約 Book"}
            </Button>
          </div>
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-2">
          <section>
            <h2 className="font-serif text-3xl">服務 Services</h2>
            <div className="mt-4 divide-y divide-border rounded-3xl border border-border bg-card">
              {services.length === 0 && <p className="px-5 py-6 text-sm text-muted-foreground">這位理髮師還沒有服務項目。</p>}
              {services.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {CATEGORY_LABEL[s.category] ?? s.category} · {s.required_slots * settings.slot_minutes} 分鐘
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-serif text-xl">{formatMoney(s.price, settings)}</span>
                    <Button size="sm" variant="outline" className="rounded-full" disabled={freeSlots.length === 0} onClick={() => book(s.id)}>
                      Book
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="flex items-baseline gap-2 font-serif text-3xl">
              可預約時段 <span className="font-sans text-sm text-muted-foreground">（{DISPLAY_TZ_LABEL}）</span>
            </h2>
            <div className="mt-4 space-y-3">
              {byDay.length === 0 && (
                <p className="rounded-3xl border border-border bg-card px-5 py-6 text-sm text-muted-foreground">目前沒有空的時段。</p>
              )}
              {byDay.map(([d, list]) => (
                <div key={d} className="rounded-2xl border border-border bg-card p-4">
                  <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <CalendarDays className="h-4 w-4" /> {dayFmt.format(new Date(list[0]!.starts_at))}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {list.map((s) => (
                      <span key={s.id} className="rounded-full border border-border px-3 py-1 text-sm tabular-nums">
                        {timeFmt.format(new Date(s.starts_at))}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <BookingDialog
        open={open}
        onOpenChange={setOpen}
        barberName={barber.name}
        services={services}
        freeSlots={freeSlots}
        initialServiceId={preselect}
        onBooked={refreshSlots}
      />
    </div>
  );
}
