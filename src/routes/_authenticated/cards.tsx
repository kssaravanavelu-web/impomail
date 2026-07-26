import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Trash2, Users, IdCard, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/message-list";
import { listMailCards, createMailCard, deleteMailCard } from "@/lib/cards.functions";
import { MAX_PERSONAL_CARD_EMAILS, MAX_GROUP_MEMBERS } from "@/lib/cards.constants";

export const Route = createFileRoute("/_authenticated/cards")({
  head: () => ({
    meta: [
      { title: "Cards & Groups — ImpoMail" },
      { name: "description", content: "Create personal mail cards and groups from specific email addresses." },
      { property: "og:title", content: "Cards & Groups — ImpoMail" },
      { property: "og:description", content: "Collect mail from chosen senders and send to whole groups at once." },
    ],
  }),
  component: CardsPage,
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">{error.message}</div>,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function CardsPage() {
  const qc = useQueryClient();
  const list = useServerFn(listMailCards);
  const create = useServerFn(createMailCard);
  const remove = useServerFn(deleteMailCard);

  const [name, setName] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [emails, setEmails] = useState<string[]>([]);
  const [kind, setKind] = useState<"card" | "group">("card");

  const { data, isLoading } = useQuery({ queryKey: ["mail-cards"], queryFn: () => list() });

  const maxEmails = kind === "card" ? MAX_PERSONAL_CARD_EMAILS : MAX_GROUP_MEMBERS;
  const atLimit = maxEmails !== undefined && emails.length >= maxEmails;

  const addEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    if (!EMAIL_RE.test(email)) {
      toast.error("Enter a valid email address");
      return;
    }
    if (emails.includes(email)) {
      toast.error("That email is already added");
      return;
    }
    if (maxEmails !== undefined && emails.length >= maxEmails) {
      toast.error(
        kind === "card"
          ? "A personal card can hold only one email address"
          : `Groups can hold up to ${MAX_GROUP_MEMBERS} members`,
      );
      return;
    }
    setEmails((p) => [...p, email]);
    setEmailInput("");
  };

  const removeEmail = (email: string) => setEmails((p) => p.filter((e) => e !== email));

  const createMut = useMutation({
    mutationFn: () => create({ data: { name, kind, emails } }),
    onSuccess: () => {
      setName("");
      setEmailInput("");
      setEmails([]);
      qc.invalidateQueries({ queryKey: ["mail-cards"] });
      toast.success("Card created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mail-cards"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const cards = data ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-8 lg:py-10">
      <PageHeader title="Cards & Groups" subtitle="Collect mail from chosen senders — and message whole groups at once." />

      <div className="glass-card aura-glow mb-8 rounded-3xl p-5">
        <div className="mb-4 flex gap-2">
          {(["card", "group"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`rounded-full border px-4 py-1.5 text-xs font-medium uppercase tracking-[0.16em] transition ${
                kind === k ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {k === "card" ? "Personal card" : "Group"}
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_1.6fr_auto]">
          <div className="aura-glow rounded-xl p-[1.5px]">
            <Input
              className="h-11 rounded-xl border-0 bg-card/80 px-4 focus-visible:ring-0"
              placeholder={kind === "card" ? "Card name (e.g. Bank)" : "Group name (e.g. Team)"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
            />
          </div>
          <div className="aura-glow rounded-xl p-[1.5px]">
            <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-xl bg-card/80 px-3 py-2">
              {emails.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary"
                >
                  {email}
                  <button onClick={() => removeEmail(email)} aria-label={`Remove ${email}`} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <Input
                className="min-w-[140px] flex-1 border-0 bg-transparent px-1 py-1 text-sm focus-visible:ring-0"
              placeholder={
                atLimit
                  ? "Limit reached"
                  : emails.length
                    ? "Add another email"
                    : "Type email and press enter / add"
              }
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addEmail();
                  }
                }}
                disabled={atLimit}
              />
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0 rounded-full text-primary hover:bg-primary/10"
                onClick={addEmail}
                disabled={!emailInput.trim() || atLimit}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Button onClick={() => createMut.mutate()} disabled={!name.trim() || createMut.isPending} className="h-11">
            {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span className="ml-1.5">Create</span>
          </Button>
        </div>
        {maxEmails !== undefined && (
          <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {kind === "card" ? "Personal card" : "Group"}: {emails.length}/{maxEmails}{" "}
            {kind === "card" ? "email" : "members"} · you are the host
          </p>
        )}
      </div>

      {isLoading && (
        <div className="glass-card flex items-center justify-center gap-3 rounded-2xl p-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your cards…
        </div>
      )}

      {!isLoading && cards.length === 0 && (
        <p className="glass-card rounded-2xl p-10 text-center text-sm text-muted-foreground">
          No cards yet. Create one above to start collecting mail from specific addresses.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <div key={c.id} className="glass-card aura-glow gold-hairline group relative overflow-hidden rounded-3xl p-5">
            <Link to="/card/$id" params={{ id: c.id }} className="block">
              <div className="flex items-start justify-between">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
                  {c.kind === "group" ? <Users className="h-5 w-5" strokeWidth={1.5} /> : <IdCard className="h-5 w-5" strokeWidth={1.5} />}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/60 transition group-hover:text-primary" />
              </div>
              <p className="mt-5 font-display text-2xl tracking-tight">{c.name}</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {c.kind === "group" ? "Group" : "Card"} · {c.addresses.length} address{c.addresses.length === 1 ? "" : "es"}
              </p>
            </Link>
            <button
              onClick={() => deleteMut.mutate(c.id)}
              aria-label={`Delete ${c.name}`}
              className="absolute bottom-4 right-4 rounded-full p-2 text-muted-foreground/60 transition hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}