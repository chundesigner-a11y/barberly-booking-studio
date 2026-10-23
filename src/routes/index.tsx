import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { BadgeCheck, CalendarCheck, Search, ShieldCheck, Star, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import heroLeft from "@/assets/hero-left.jpg";
import heroRight from "@/assets/hero-right.jpg";
import b1 from "@/assets/barber-1.jpg";
import b2 from "@/assets/barber-2.jpg";
import b3 from "@/assets/barber-3.jpg";
import b4 from "@/assets/barber-4.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Barberly — Find a great barber and book in a few taps" },
      { name: "description", content: "Discover top-rated barbers and hair stylists near you and book your next cut, color, perm or beard trim online." },
      { property: "og:title", content: "Barberly — Style with Confident Hair" },
      { property: "og:description", content: "Discover top-rated barbers and book your next appointment in a few taps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const CHIPS = ["All", "Cut", "Color", "Perm", "Beard"] as const;
const LOGOS = ["MAISON CUT", "Ironclad", "Velour Salon", "NORTH & CO.", "Atelier Hair", "The Blade Room"];
const FEATURES = [
  { icon: BadgeCheck, label: "Verified Barbers" },
  { icon: CalendarCheck, label: "Instant Booking" },
  { icon: ShieldCheck, label: "Secure Payment" },
  { icon: Star, label: "Top-Rated Styles" },
];
const BARBERS = [
  { name: "Marco Reyes", shop: "Ironclad Barbers · Brooklyn", img: b1, services: ["Cut", "Beard"], rating: 4.9, reviews: 312, from: 35 },
  { name: "Sophie Lane", shop: "Velour Salon · SoHo", img: b2, services: ["Cut", "Color", "Perm"], rating: 4.8, reviews: 245, from: 55 },
  { name: "Amara Okafor", shop: "Atelier Hair · Harlem", img: b3, services: ["Cut", "Color"], rating: 5.0, reviews: 189, from: 48 },
  { name: "Jonah Whitfield", shop: "North & Co. · Williamsburg", img: b4, services: ["Cut", "Beard"], rating: 4.9, reviews: 276, from: 30 },
];

function Index() {
  const [chip, setChip] = useState<(typeof CHIPS)[number]>("All");
  const shown = chip === "All" ? BARBERS : BARBERS.filter((b) => b.services.includes(chip));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-5">
        <Link to="/" className="font-serif text-2xl font-semibold tracking-tight">Barberly</Link>
        <label className="mx-auto hidden w-full max-w-sm items-center gap-2 rounded-full border border-border bg-card px-4 py-2 md:flex">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input placeholder="Search barbers" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        </label>
        <Link to="/login" className="ml-auto rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 md:ml-0">
          Login
        </Link>
      </header>

      <section className="mx-auto max-w-6xl px-5 pt-6 pb-16">
        <div className="grid items-center gap-6 md:grid-cols-[1fr_1.4fr_1fr]">
          <img src={heroLeft} alt="Textured crop haircut" width={768} height={1024} className="fade-up hidden aspect-[3/4] w-full rounded-3xl object-cover md:block" />
          <div className="fade-up text-center [animation-delay:120ms]">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">New Look</p>
            <h1 className="mt-4 font-serif text-5xl leading-[1.05] md:text-7xl">Style with Confident Hair</h1>
            <div className="mx-auto mt-8 flex max-w-md items-center gap-2 rounded-full border border-border bg-card p-1.5 pl-5 shadow-lift">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input placeholder="Find your stylist or search a style" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
              <button className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Search</button>
            </div>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {CHIPS.map((c) => (
                <button
                  key={c}
                  onClick={() => setChip(c)}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm transition-colors",
                    chip === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <img src={heroRight} alt="Glossy wavy styled hair" width={768} height={1024} className="fade-up hidden aspect-[3/4] w-full rounded-3xl object-cover md:block [animation-delay:240ms]" />
        </div>
        <div className="mt-10 grid grid-cols-2 gap-4 md:hidden">
          <img src={heroLeft} alt="" width={768} height={1024} className="aspect-[3/4] w-full rounded-2xl object-cover" />
          <img src={heroRight} alt="" width={768} height={1024} className="aspect-[3/4] w-full rounded-2xl object-cover" />
        </div>
      </section>

      <section className="border-y border-border bg-muted/50">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-12 gap-y-4 px-5 py-8">
          {LOGOS.map((l, i) => (
            <span key={l} className={cn("text-lg text-muted-foreground", i % 2 ? "font-serif italic" : "font-semibold tracking-[0.2em] text-sm")}>{l}</span>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-center font-serif text-4xl md:text-5xl">Best booking experience</h2>
        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
          {FEATURES.map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-4 rounded-3xl bg-muted p-8 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-card">
                <Icon className="h-6 w-6" />
              </span>
              <span className="font-medium">{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24">
        <h2 className="font-serif text-4xl md:text-5xl">Popular</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {shown.map((b) => (
            <a key={b.name} href="#" onClick={(e) => e.preventDefault()} className="group block overflow-hidden rounded-3xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
              <div className="relative">
                <img src={b.img} alt={b.name} loading="lazy" width={500} height={500} className="aspect-square w-full object-cover" />
                <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-card/90 px-2.5 py-1 text-xs font-medium">
                  <Sparkles className="h-3 w-3" /> Popular
                </span>
              </div>
              <div className="p-5">
                <h3 className="font-serif text-2xl">{b.name}</h3>
                <p className="text-sm text-muted-foreground">{b.shop}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {b.services.map((s) => (
                    <span key={s} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">{s}</span>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-star text-star" /> {b.rating.toFixed(1)}
                    <span className="text-muted-foreground">({b.reviews})</span>
                  </span>
                  <span>from <strong>${b.from}</strong></span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-8 text-sm text-muted-foreground">
          <span className="font-serif text-lg text-foreground">Barberly</span>
          <span>© 2026 Barberly</span>
        </div>
      </footer>
    </div>
  );
}
