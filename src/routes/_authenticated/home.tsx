import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Briefcase, GraduationCap, KeyRound, Smartphone, CreditCard, User, Tag, Bell, ChevronRight, Inbox as InboxIcon, Loader2, ArrowUpRight } from "lucide-react";
import { categoryMeta, type Category } from "@/lib/mock-data";
import { listGmailMessages, type GmailMessageSummary } from "@/lib/gmail.functions";

const iconFor: Record<Category, typeof Briefcase> = {
  payment: CreditCard,
  jobs: Briefcase,
  internships: GraduationCap,
  otp: KeyRound,
  recharges: Smartphone,
  personal: User,
  promotions: Tag,
  updates: Bell,
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
  const fetchFn = useServerFn(listGmailMessages);
  const { data, isLoading } = useQuery({
    queryKey: ["gmail", "inbox-all"],
    queryFn: () => fetchFn({ data: { labelIds: ["INBOX"], maxResults: 50 } }),
  });
  const inbox: GmailMessageSummary[] = data ?? [];
  const unreadTotal = inbox.filter((m) => m.unread).length;
  const dynamicMetrics = (["payment", "jobs", "internships", "otp", "recharges"] as Category[]).map((cat) => ({
    key: cat,
    label: categoryMeta[cat].label,
    category: cat,
    count: inbox.filter((m) => m.category === cat).length,
  }));
  const sectors = (Object.keys(categoryMeta) as Category[])
    .map((cat) => ({ cat, items: inbox.filter((m) => m.category === cat) }))
    .filter((s) => s.items.length > 0);
  const nameOf = (from: string) => {
    const m = from.match(/^"?([^"<]+?)"?\s*<[^>]+>/);
    return (m ? m[1] : from.split("@")[0] ?? from).trim() || from;
  };
  const timeOf = (date: string) => {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "";
    const now = new Date();
    if (d.toDateString() === now.toDateString())
      return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    const days = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (days < 7) return d.toLocaleDateString(undefined, { weekday: "short" });
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <div className="relative mx-auto max-w-6xl px-5 py-8 lg:px-10 lg:py-12">
      {/* Ambient gold glows */}
      <span className="ambient-glow -top-24 -right-16 h-64 w-64" aria-hidden />
      <span className="ambient-glow -bottom-24 -left-10 h-56 w-56" style={{ animationDelay: "-4s" }} aria-hidden />

      {/* Greeting + hero row */}
      <div className="silk-rise mb-10 flex flex-col gap-8 lg:mb-14 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-muted-foreground">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="mt-3 font-display text-4xl leading-[1.05] tracking-tight lg:text-6xl">
            <span className="italic text-foreground/80">{greeting()},</span>{" "}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>{name}</span>
          </h1>
        </div>

        <Link
          to="/inbox"
          className="silk-hover glass-card gold-hairline group relative flex min-w-[240px] items-center justify-between gap-6 overflow-hidden rounded-2xl px-5 py-4"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
              <InboxIcon className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div className="leading-tight">
              <div className="font-display text-3xl font-light">
                {isLoading ? <Loader2 className="inline h-6 w-6 animate-spin" /> : unreadTotal}
              </div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Unread</div>
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" strokeWidth={1.5} />
        </Link>
      </div>

      {/* Category cards — modern row */}
      <div className="mb-14 grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-5">
        {dynamicMetrics.map((m, i) => {
          const Icon = iconFor[m.category];
          const meta = categoryMeta[m.category];
          return (
            <Link
              key={m.key}
              to="/category/$slug"
              params={{ slug: m.category }}
              className={`silk-rise silk-hover glass-card group relative flex flex-col justify-between overflow-hidden rounded-2xl p-5 rise-${Math.min(6, i + 1)}`}
            >
              <div className="flex items-start justify-between">
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${meta.bg}`}>
                  <Icon className={`h-4.5 w-4.5 ${meta.color}`} strokeWidth={1.5} />
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/50 transition group-hover:text-primary" strokeWidth={1.5} />
              </div>
              <div className="mt-6">
                <div className="font-display text-4xl font-light leading-none tracking-tight">{m.count}</div>
                <div className="mt-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{m.label}</div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Sector mail */}
      <div>
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-muted-foreground">Curated</p>
            <h2 className="mt-2 font-display text-3xl tracking-tight">Sector mail</h2>
          </div>
          <Link to="/inbox" className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-primary hover:opacity-80">
            View all <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} />
          </Link>
        </div>
        {isLoading && (
          <div className="glass-card flex items-center justify-center gap-3 rounded-2xl p-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your inbox…
          </div>
        )}
        {!isLoading && sectors.length === 0 && (
          <div className="glass-card rounded-2xl p-10 text-center text-sm text-muted-foreground">
            No mail yet. <Link to="/connect-gmail" className="text-primary hover:underline">Connect Gmail</Link> to sync your messages.
          </div>
        )}
        <div className="grid gap-6 lg:grid-cols-2">
          {sectors.map(({ cat, items }, si) => {
            const meta = categoryMeta[cat];
            return (
              <section key={cat} className={`silk-rise rise-${Math.min(6, si + 1)}`}>
                <div className="mb-3 flex items-center justify-between px-1">
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
                          <span className={`truncate text-sm ${m.unread ? "font-semibold text-foreground" : "font-medium text-foreground/85"}`}>{nameOf(m.from)}</span>
                          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">{timeOf(m.date)}</span>
                        </div>
                        <div className={`truncate text-sm ${m.unread ? "text-foreground/90" : "text-muted-foreground"}`}>{m.subject || "(no subject)"}</div>
                        <div className="truncate text-xs text-muted-foreground/80">{m.snippet}</div>
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