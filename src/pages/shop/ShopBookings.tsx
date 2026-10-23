import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { ServicesEditor } from "@/components/shop/ServicesEditor";
import { SlotPublisher } from "@/components/shop/SlotPublisher";
import { useMyBarbers } from "@/components/shop/useMyBarbers";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/utils";

/** /shop/bookings — per-barber services & price editor + slot publisher. */
export default function ShopBookings() {
  usePageTitle("Services & slots — Barberly");
  const { data: barbers = [], isLoading } = useMyBarbers();
  const [barberId, setBarberId] = useState<string | null>(null);

  useEffect(() => {
    if (barbers.length > 0 && !barbers.some((b) => b.id === barberId)) {
      setBarberId(barbers[0]?.id ?? null);
    }
  }, [barbers, barberId]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="fade-up mx-auto max-w-6xl space-y-8 px-5 py-12">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Shop dashboard</p>
          <h1 className="mt-3 font-serif text-5xl">服務與時段 / Bookings</h1>
        </div>

        {!isLoading && barbers.length === 0 ? (
          <div className="rounded-3xl border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">要先新增至少一位理髮師，才能設定服務與時段。</p>
            <Link to="/shop" className="mt-4 inline-block font-medium underline underline-offset-4">
              前往店家設定 →
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {barbers.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBarberId(b.id)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm transition-colors",
                    b.id === barberId ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted",
                  )}
                >
                  {b.name}
                </button>
              ))}
            </div>
            {barberId && (
              <>
                <ServicesEditor key={`s-${barberId}`} barberId={barberId} />
                <SlotPublisher key={`t-${barberId}`} barberId={barberId} />
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
