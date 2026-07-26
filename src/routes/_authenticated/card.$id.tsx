import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, X, Send, Paperclip, FileIcon, Users, IdCard, ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/message-list";
import { GmailList } from "@/components/gmail-list";
import { listMailCards, addCardAddress, removeCardAddress, deleteMailCard } from "@/lib/cards.functions";
import { listGmailMessages, sendGmailMessage } from "@/lib/gmail.functions";

export const Route = createFileRoute("/_authenticated/card/$id")({
  head: () => ({
    meta: [
      { title: "Card — ImpoMail" },
      { name: "description", content: "Mail collected from the addresses in this card." },
      { property: "og:title", content: "Card — ImpoMail" },
      { property: "og:description", content: "Mail collected from the addresses in this card." },
    ],
  }),
  component: CardDetail,
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">{error.message}</div>,
});

function CardDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const list = useServerFn(listMailCards);
  const addAddr = useServerFn(addCardAddress);
  const delAddr = useServerFn(removeCardAddress);
  const removeCard = useServerFn(deleteMailCard);
  const listMail = useServerFn(listGmailMessages);
  const send = useServerFn(sendGmailMessage);

  const [newEmail, setNewEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<
    { filename: string; mimeType: string; dataBase64: string; size: number }[]
  >([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: cards, isLoading: cardsLoading } = useQuery({ queryKey: ["mail-cards"], queryFn: () => list() });
  const card = cards?.find((c) => c.id === id);
  const emails = card?.addresses.map((a) => a.email) ?? [];
  const query = emails.length ? `from:(${emails.join(" OR ")})` : "";

  const { data: messages, isLoading: mailLoading, error } = useQuery({
    queryKey: ["card-mail", id, query],
    queryFn: () => listMail({ data: { q: query, maxResults: 40 } }),
    enabled: Boolean(query),
  });

  const addMut = useMutation({
    mutationFn: () => addAddr({ data: { cardId: id, email: newEmail } }),
    onSuccess: () => {
      setNewEmail("");
      qc.invalidateQueries({ queryKey: ["mail-cards"] });
      toast.success("Address added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (addressId: string) => delAddr({ data: { id: addressId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mail-cards"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteCardMut = useMutation({
    mutationFn: () => removeCard({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mail-cards"] });
      toast.success("Card deleted");
      navigate({ to: "/cards" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const MAX_TOTAL = 20 * 1024 * 1024;
    let total = attachments.reduce((s, a) => s + a.size, 0);
    const added: typeof attachments = [];
    for (const f of Array.from(files)) {
      total += f.size;
      if (total > MAX_TOTAL) {
        toast.error("Attachments exceed 20 MB total");
        break;
      }
      const buf = new Uint8Array(await f.arrayBuffer());
      let binary = "";
      for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
      added.push({ filename: f.name, mimeType: f.type || "application/octet-stream", dataBase64: btoa(binary), size: f.size });
    }
    if (added.length) setAttachments((p) => [...p, ...added]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const sendMut = useMutation({
    mutationFn: () =>
      send({
        data: {
          to: emails.join(", "),
          subject,
          body,
          attachments: attachments.map(({ filename, mimeType, dataBase64 }) => ({ filename, mimeType, dataBase64 })),
        },
      }),
    onSuccess: () => {
      setSubject("");
      setBody("");
      setAttachments([]);
      toast.success(`Sent to ${emails.length} recipient${emails.length === 1 ? "" : "s"}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (cardsLoading) {
    return (
      <div className="mx-auto flex max-w-4xl items-center justify-center gap-3 px-4 py-20 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading card…
      </div>
    );
  }
  if (!card) {
    return (
      <div className="p-10 text-center text-muted-foreground">
        Card not found. <Link to="/cards" className="text-primary hover:underline">Back to cards</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-8 lg:py-10">
      <Link to="/cards" className="mb-4 inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-3.5 w-3.5" /> All cards
      </Link>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          title={card.name}
          subtitle={`${card.kind === "group" ? "Group" : "Personal card"} · you are the host of ${emails.length} address${emails.length === 1 ? "" : "es"}`}
        />
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Delete this {card.kind}?</span>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => deleteCardMut.mutate()}
              disabled={deleteCardMut.isPending}
              className="h-8"
            >
              {deleteCardMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              <span className="ml-1.5">Yes, delete</span>
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)} className="h-8" disabled={deleteCardMut.isPending}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setConfirmDelete(true)}
            className="h-8 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="ml-1.5">Delete {card.kind}</span>
          </Button>
        )}
      </div>

      {/* Host controls */}
      <div className="glass-card mb-8 rounded-3xl p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium">
          {card.kind === "group" ? <Users className="h-4 w-4 text-primary" /> : <IdCard className="h-4 w-4 text-primary" />}
          Addresses in this {card.kind}
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          {card.addresses.length === 0 && <p className="text-sm text-muted-foreground">No addresses yet — add one below.</p>}
          {card.addresses.map((a) => (
            <span key={a.id} className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-3 py-1 text-xs">
              {a.email}
              <button onClick={() => delMut.mutate(a.id)} aria-label={`Remove ${a.email}`} className="text-muted-foreground hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="name@example.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && newEmail && addMut.mutate()}
          />
          <Button onClick={() => addMut.mutate()} disabled={!newEmail || addMut.isPending}>
            {addMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Group send */}
      {card.kind === "group" && (
        <div className="glass-card mb-8 rounded-3xl p-5">
          <p className="mb-4 text-sm font-medium">Send to everyone in this group</p>
          <div className="space-y-3">
            <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <Textarea rows={5} placeholder="Write your message…" value={body} onChange={(e) => setBody(e.target.value)} />
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((a, i) => (
                  <span key={`${a.filename}-${i}`} className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 text-xs">
                    <FileIcon className="h-3 w-3" /> {a.filename}
                    <button onClick={() => setAttachments((p) => p.filter((_, j) => j !== i))} aria-label={`Remove ${a.filename}`}>
                      <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <input ref={fileRef} type="file" multiple hidden onChange={(e) => onFiles(e.target.files)} />
                <Button variant="ghost" onClick={() => fileRef.current?.click()}>
                  <Paperclip className="h-4 w-4" /> <span className="ml-1.5">Attach</span>
                </Button>
              </div>
              <Button
                onClick={() => sendMut.mutate()}
                disabled={!emails.length || !subject || sendMut.isPending}
              >
                {sendMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span className="ml-1.5">Send to group</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Collected mail */}
      <GmailList
        items={messages ?? []}
        loading={Boolean(query) && mailLoading}
        error={error ? (error as Error).message : null}
        emptyText={query ? "No mail from these addresses yet." : "Add an address to start collecting mail here."}
      />
    </div>
  );
}