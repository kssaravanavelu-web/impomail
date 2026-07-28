import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Reply, Loader2, FolderInput, Check } from "lucide-react";
import { categoryMeta, type Category } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { getGmailMessage } from "@/lib/gmail.functions";
import { setSenderRule } from "@/lib/sender-rules.functions";
import { domainOf } from "@/lib/categorize";

export const Route = createFileRoute("/_authenticated/message/$id")({
  head: () => ({ meta: [{ title: "Message — ImpoMail" }, { name: "description", content: "View your Gmail message." }] }),
  component: MessagePage,
  notFoundComponent: () => <div className="p-8 text-center text-muted-foreground">Message not found.</div>,
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">{error.message}</div>,
});

function MessagePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchFn = useServerFn(getGmailMessage);
  const { data: m, isLoading, error } = useQuery({
    queryKey: ["gmail", "message", id],
    queryFn: () => fetchFn({ data: { id } }),
  });
  const saveRule = useServerFn(setSenderRule);
  const refile = useMutation({
    mutationFn: (category: Category) =>
      saveRule({ data: { pattern: m?.fromEmail || domainOf(m?.from ?? ""), category } }),
    onSuccess: (_r, category) => {
      toast.success(`Future mail from this sender goes to ${categoryMeta[category].label}`);
      queryClient.invalidateQueries({ queryKey: ["gmail"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-8 lg:py-10">
      <div className="mb-4 flex items-center justify-between">
        <Link to="/inbox" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </div>

      {isLoading && (
        <div className="glass-card flex items-center justify-center gap-3 rounded-2xl p-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading message…
        </div>
      )}
      {error && <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">{(error as Error).message}</div>}
      {!isLoading && !error && !m && (
        <div className="glass-card rounded-2xl p-8 text-center text-sm text-muted-foreground">
          Connect Gmail to view messages.
        </div>
      )}

      {m && (
        <div className="glass-card rounded-2xl p-6">
          <div className="mb-3 flex items-center gap-2">
            <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${categoryMeta[m.category].bg} ${categoryMeta[m.category].color}`}>
              {categoryMeta[m.category].label}
            </span>
            <span className="text-xs text-muted-foreground">{m.date && new Date(m.date).toLocaleString()}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-primary/20 px-2 py-1 text-[11px] text-muted-foreground transition hover:text-primary">
                  <FolderInput className="h-3.5 w-3.5" /> Move to
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground">
                  Always file this sender under…
                </DropdownMenuLabel>
                {(Object.keys(categoryMeta) as Category[]).map((c) => (
                  <DropdownMenuItem key={c} onSelect={() => refile.mutate(c)} className="text-xs">
                    {c === m.category && <Check className="mr-1 h-3.5 w-3.5 text-primary" />}
                    {categoryMeta[c].label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <h1 className="font-display text-2xl tracking-tight">{m.subject || "(no subject)"}</h1>
          <div className="mt-4 flex items-center gap-3 border-b border-primary/10 pb-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent font-semibold">
              {(m.from || m.fromEmail).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium">{m.from}</div>
              <div className="truncate text-xs text-muted-foreground">{m.fromEmail}</div>
            </div>
          </div>
          {m.bodyHtml ? (
            <div
              className="prose prose-sm prose-invert mt-5 max-w-none text-sm leading-relaxed text-foreground/90 [&_a]:text-primary [&_img]:max-w-full"
              dangerouslySetInnerHTML={{ __html: m.bodyHtml }}
            />
          ) : (
            <pre className="mt-5 whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">
              {m.bodyText || "(no content)"}
            </pre>
          )}
          <div className="mt-6 flex gap-2">
            <Button className="gap-2" onClick={() => navigate({ to: "/compose" })}>
              <Reply className="h-4 w-4" /> Reply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}