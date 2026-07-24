import { createFileRoute, Link } from "@tanstack/react-router";
import { Briefcase, GraduationCap, KeyRound, Smartphone, Building2, ChevronRight } from "lucide-react";
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
  const sectors = (Object.keys(categoryMeta) as Category[])
    .map((cat) => ({ cat, items: inbox.filter((m) => m.category === cat) }))
    .filter((s) => s.items.length > 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:px-8 lg:py-10">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight lg:text-4xl">
          {greeting()}, <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>{name}</span>
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {metrics.map((m) => {
          const Icon = iconFor[m.category];
          const meta = categoryMeta[m.category];
          return (
            <Link
              key={m.key}
              to="/category/$slug"
              params={{ slug: m.category }}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
            >
              <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border ${meta.bg}`}>
                <Icon className={`h-5 w-5 ${meta.color}`} />
              </div>
              <div className="text-2xl font-bold">{m.count}</div>
              <div className="text-xs text-muted-foreground">{m.label}</div>
            </Link>
          );
        })}
      </div>

      <div className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Sector mail</h2>
          <Link to="/inbox" className="text-sm text-primary hover:underline">View all</Link>
        </div>
        <div className="space-y-6">
          {sectors.map(({ cat, items }) => {
            const meta = categoryMeta[cat];
            return (
              <section key={cat}>
                <div className="mb-2 flex items-center justify-between">
                  <Link to="/category/$slug" params={{ slug: cat }} className="flex items-center gap-2">
                    <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${meta.bg} ${meta.color}`}>{meta.label}</span>
                    <span className="text-xs text-muted-foreground">{items.length}</span>
                  </Link>
                  <Link to="/category/$slug" params={{ slug: cat }} className="text-xs text-muted-foreground hover:text-primary">
                    See all <ChevronRight className="inline h-3 w-3" />
                  </Link>
                </div>
                <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">
                  {items.slice(0, 3).map((m) => (
                    <Link
                      key={m.id}
                      to="/message/$id"
                      params={{ id: m.id }}
                      className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-accent/40"
                    >
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold">
                        {m.from.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`truncate text-sm ${m.unread ? "font-semibold" : "font-medium"}`}>{m.from}</span>
                        </div>
                        <div className={`truncate text-sm ${m.unread ? "text-foreground" : "text-muted-foreground"}`}>{m.subject}</div>
                        <div className="truncate text-xs text-muted-foreground">{m.preview}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs text-muted-foreground">{m.time}</span>
                        {m.unread && <span className="h-2 w-2 rounded-full bg-primary" />}
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