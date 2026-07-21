import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Archive, Trash2, Reply, Star } from "lucide-react";
import { messages, categoryMeta } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/message/$id")({
  head: ({ params }) => {
    const m = messages.find((x) => x.id === params.id);
    return { meta: [{ title: `${m?.subject ?? "Message"} — ImpoMail` }, { name: "description", content: m?.preview ?? "" }] };
  },
  component: MessagePage,
  notFoundComponent: () => <div className="p-8 text-center text-muted-foreground">Message not found.</div>,
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">{error.message}</div>,
});

function MessagePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const m = messages.find((x) => x.id === id);
  if (!m) throw notFound();
  const meta = categoryMeta[m.category];

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-8 lg:py-10">
      <div className="mb-4 flex items-center justify-between">
        <Link to="/inbox" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => toast.success("Starred")}><Star className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => { toast.success("Archived"); navigate({ to: "/inbox" }); }}><Archive className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => { toast.success("Deleted"); navigate({ to: "/inbox" }); }}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-6">
        <div className="mb-3 flex items-center gap-2">
          <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${meta.bg} ${meta.color}`}>{meta.label}</span>
          <span className="text-xs text-muted-foreground">{m.time}</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{m.subject}</h1>
        <div className="mt-4 flex items-center gap-3 border-b border-border/60 pb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent font-semibold">{m.from.charAt(0)}</div>
          <div className="min-w-0 flex-1">
            <div className="font-medium">{m.from}</div>
            <div className="truncate text-xs text-muted-foreground">{m.fromEmail}</div>
          </div>
        </div>
        <pre className="mt-5 whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">{m.body}</pre>

        <div className="mt-6 flex gap-2">
          <Button className="gap-2" onClick={() => { toast.success("Draft opened"); navigate({ to: "/compose" }); }}>
            <Reply className="h-4 w-4" /> Reply
          </Button>
        </div>
      </div>
    </div>
  );
}