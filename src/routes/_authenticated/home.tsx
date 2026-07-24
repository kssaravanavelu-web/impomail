import { createFileRoute, Link } from "@tanstack/react-router";
import { Briefcase, GraduationCap, KeyRound, Smartphone, Building2, ChevronRight, Inbox as InboxIcon } from "lucide-react";
import { messages, metrics, categoryMeta, type Category } from "@/lib/mock-data";

const iconFor: Record<Category, typeof Briefcase> = {
  business: Building2,
  jobs: Briefcase,
  internships: GraduationCap,
  otp: KeyRound,
  recharges: Smartphone,
  personal: Building2,
  promotions: Building2,
  updates: Building2,
};

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Home — ImpoMail" },
      { name: "description", content: "Your smart inbox dashboard." },
    ],
  }),
  component: Home,
});

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 18) return "Good Afternoon";
  return "Good Evening";
}

function Home() {
  const { user } = Route.useRouteContext();
  const name = ((user.user_metadata?.full_name as string | undefined) ?? user.email?.split("@")[0] ?? "there").split(" ")[0];
  const inbox = messages.filter((m) => m.folder === "inbox");
  const unreadTotal = inbox.filter((m) => m.unread).length;
  const sectors = (Object.keys(categoryMeta) as Category[])
    .map((cat) => ({ cat, items: inbox.filter((m) => m.category === cat) }))
    .filter((s) => s.items.length > 0);

  return (
    <div className="relative mx-auto max-w-5xl px-4 py-6 lg:px-8 lg:py-10">
      {/* Ambient gold glows */}
      <span className="ambient-glow -top-24 -right-16 h-64 w-64" aria-hidden />
      <span className="ambient-glow -bottom-24 -left-10 h-56 w-56" style={{ animationDelay: "-4s" }} aria-hidden />

      {/* Greeting */}
      <div className="silk-rise mb-8">
        <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Overview · {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
        <h1 className="mt-2 font-display text-4xl lg:text-5xl">
          <span className="italic">{greeting()},</span>{" "}
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>{name}</span>
        </h1>
      </div>

      {/* Priority hero card */}
      <Link
        to="/inbox"
        className="silk-rise rise-1 silk-hover glass-card gold-hairline group relative mb-8 flex items-start justify-between overflow-hidden rounded-3xl p-6"
      >
        <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(120%_80%_at_0%_0%,oklch(0.85_var(--accent-chroma)_var(--accent-hue)/0.18),transparent_55%)]" />
        <div className="relative space-y-4">
          <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
            Priority Access
          </span>
          <div>
            <span className="font-display text-5xl font-light text-foreground">{unreadTotal}</span>
            <p className="mt-1 text-sm text-muted-foreground">Unread high-priority</p>
          </div>
        </div>
        <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/5 text-primary">
          <InboxIcon className="h-5 w-5" strokeWidth={1.5} />
        </div>
      </Link>

      {/* Category pebbles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {metrics.map((m, i) => {
          const Icon = iconFor[m.category];
          const meta = categoryMeta[m.category];
          return (
            <Link
              key={m.key}
              to="/category/$slug"
              params={{ slug: m.category }}
              className={`silk-rise silk-hover glass-card group relative overflow-hidden rounded-2xl p-4 rise-${Math.min(6, i + 2)}`}
            >
              <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border ${meta.bg}`}>
                <Icon className={`h-5 w-5 ${meta.color}`} strokeWidth={1.5} />
              </div>
              <div className="font-display text-3xl font-light">{m.count}</div>
              <div className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{m.label}</div>
            </Link>
          );
        })}
      </div>

      {/* Sector mail */}
      <div className="mt-12">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Sovereign Sector</p>
            <h2 className="font-display text-2xl">Sector mail</h2>
          </div>
          <Link to="/inbox" className="text-xs font-medium uppercase tracking-[0.18em] text-primary hover:opacity-80">
            View all
          </Link>
        </div>
        <div className="space-y-6">
          {sectors.map(({ cat, items }, si) => {
            const meta = categoryMeta[cat];
            return (
              <section key={cat} className={`silk-rise rise-${Math.min(6, si + 1)}`}>
                <div className="mb-2 flex items-center justify-between">
                  <Link to="/category/$slug" params={{ slug: cat }} className="flex items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${meta.bg} ${meta.color}`}>{meta.label}</span>
                    <span className="text-xs text-muted-foreground">{items.length}</span>
                  </Link>
                  <Link to="/category/$slug" params={{ slug: cat }} className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-primary">
                    See all <ChevronRight className="inline h-3 w-3" />
                  </Link>
                </div>
                <div className="glass-card overflow-hidden rounded-3xl">
                  {items.slice(0, 3).map((m, i) => (
                    <Link
                      key={m.id}
                      to="/message/$id"
                      params={{ id: m.id }}
                      className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-primary/[0.04]"
                      style={{ borderTop: i === 0 ? "none" : "1px solid color-mix(in oklab, var(--primary) 10%, transparent)" }}
                    >
                      <div className="flex-shrink-0">
                        {m.unread ? (
                          <span className="glow-dot block" aria-label="unread" />
                        ) : (
                          <span className="block h-2 w-2 rounded-full bg-transparent" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className={`truncate text-sm ${m.unread ? "font-semibold text-foreground" : "font-medium text-foreground/85"}`}>{m.from}</span>
                          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">{m.time}</span>
                        </div>
                        <div className={`truncate text-sm ${m.unread ? "text-foreground/90" : "text-muted-foreground"}`}>{m.subject}</div>
                        <div className="truncate text-xs text-muted-foreground/80">{m.preview}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}