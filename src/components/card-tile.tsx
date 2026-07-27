import { Link } from "@tanstack/react-router";
import { Users, IdCard, Trash2, ArrowUpRight, Mail } from "lucide-react";

const TONES = [
  "from-primary/80 via-primary/40 to-transparent",
  "from-fuchsia-500/70 via-primary/35 to-transparent",
  "from-amber-400/70 via-primary/35 to-transparent",
  "from-emerald-400/70 via-primary/35 to-transparent",
  "from-sky-400/70 via-primary/35 to-transparent",
];
export function toneFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 997;
  return TONES[h % TONES.length];
}

export type CardTileData = {
  id: string;
  name: string;
  kind: "card" | "group";
  addresses: { id?: string; email: string }[];
};

export function CardTile({
  card,
  total,
  unread,
  onDelete,
}: {
  card: CardTileData;
  total?: number;
  unread?: number;
  onDelete?: () => void;
}) {
  const isGroup = card.kind === "group";
  const Icon = isGroup ? Users : IdCard;
  const shown = card.addresses.slice(0, 4);

  return (
    <div className="group relative">
      <Link
        to="/card/$id"
        params={{ id: card.id }}
        className="glass-card gold-hairline relative flex h-full flex-col overflow-hidden rounded-[1.75rem] p-5 transition duration-500 hover:-translate-y-1 hover:shadow-[0_24px_60px_-30px_color-mix(in_oklab,var(--primary)_60%,transparent)]"
      >
        {/* aura wash */}
        <span
          aria-hidden
          className={`pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-gradient-to-br ${toneFor(card.id)} opacity-40 blur-2xl transition duration-700 group-hover:opacity-70`}
        />

        <div className="relative flex items-start gap-3">
          <span
            className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${toneFor(card.name)} font-display text-xl text-background ring-1 ring-primary/30`}
          >
            {card.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-2xl leading-tight tracking-tight">{card.name}</p>
            <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.18em] text-primary">
              <Icon className="h-3 w-3" strokeWidth={1.5} />
              {isGroup ? "Group" : "Personal"}
            </span>
          </div>
          {typeof unread === "number" && unread > 0 && (
            <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
              {unread}
            </span>
          )}
        </div>

        {/* member stack */}
        <div className="relative mt-5 flex min-h-9 items-center gap-2">
          {shown.length === 0 ? (
            <p className="text-xs text-muted-foreground">No addresses yet — tap to add one.</p>
          ) : (
            <>
              <div className="flex -space-x-2.5">
                {shown.map((a) => (
                  <span
                    key={a.email}
                    title={a.email}
                    className={`grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br ${toneFor(a.email)} text-[11px] font-semibold text-background ring-2 ring-background/70`}
                  >
                    {a.email.charAt(0).toUpperCase()}
                  </span>
                ))}
              </div>
              <span className="truncate text-xs text-muted-foreground">
                {card.addresses.length > shown.length
                  ? `+${card.addresses.length - shown.length} more`
                  : shown.map((a) => a.email.split("@")[0]).join(", ")}
              </span>
            </>
          )}
        </div>

        <div className="relative mt-5 flex items-center justify-between border-t border-primary/10 pt-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <Mail className="h-3.5 w-3.5" strokeWidth={1.5} />
            {typeof total === "number" ? `${total} mail` : `${card.addresses.length} address${card.addresses.length === 1 ? "" : "es"}`}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.18em] text-primary opacity-0 transition group-hover:opacity-100">
            Open <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} />
          </span>
        </div>
      </Link>

      {onDelete && (
        <button
          onClick={onDelete}
          aria-label={`Delete ${card.name}`}
          className="absolute right-3 top-3 rounded-full bg-background/60 p-2 text-muted-foreground/70 opacity-0 backdrop-blur transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}