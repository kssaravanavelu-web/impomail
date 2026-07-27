import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2,
  Plus,
  X,
  Send,
  Paperclip,
  FileIcon,
  Users,
  IdCard,
  ArrowLeft,
  Trash2,
  MessagesSquare,
} from "lucide-react";
import { ImageIcon } from "lucide-react";
import { VoiceRecorderButton } from "@/components/voice-recorder-button";
import { VoiceWave } from "@/components/voice-wave";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  listMailCards,
  addCardAddress,
  removeCardAddress,
  deleteMailCard,
  updateMailCard,
} from "@/lib/cards.functions";
import { MAX_PERSONAL_CARD_EMAILS, MAX_GROUP_MEMBERS } from "@/lib/cards.constants";
import {
  listGmailMessages,
  sendGmailMessage,
  getGmailStatus,
  getGmailMessageMedia,
} from "@/lib/gmail.functions";

export const Route = createFileRoute("/_authenticated/card/$id")({
  head: () => ({
    meta: [
      { title: "Card chat — ImpoMail" },
      { name: "description", content: "Chat-style view of mail from the addresses in this card." },
      { property: "og:title", content: "Card chat — ImpoMail" },
      { property: "og:description", content: "Chat-style view of mail from the addresses in this card." },
    ],
  }),
  component: CardChat,
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">{error.message}</div>,
});

function nameFromHeader(from: string): string {
  const m = from.match(/^"?([^"<]+?)"?\s*<[^>]+>/);
  return (m ? m[1] : from.split("@")[0] ?? from).trim() || from;
}
function emailFromHeader(from: string): string {
  const m = from.match(/<([^>]+)>/);
  return (m ? m[1] : from).trim().toLowerCase();
}
function chatTime(date: string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })} · ${d.toLocaleTimeString(
    undefined,
    { hour: "numeric", minute: "2-digit" },
  )}`;
}
const AVATAR_TONES = [
  "from-primary/70 to-primary/30",
  "from-fuchsia-500/60 to-primary/30",
  "from-amber-400/60 to-primary/30",
  "from-emerald-400/60 to-primary/30",
  "from-sky-400/60 to-primary/30",
];
function toneFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 997;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

function Avatar({ seed, label, className = "" }: { seed: string; label: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br ${toneFor(seed)} font-semibold text-background ring-1 ring-primary/30 ${className}`}
    >
      {label.charAt(0).toUpperCase()}
    </span>
  );
}

function MessageMedia({ messageId, mine }: { messageId: string; mine?: boolean }) {
  const fetchMedia = useServerFn(getGmailMessageMedia);
  const { data, isLoading } = useQuery({
    queryKey: ["card-mail-media", messageId],
    queryFn: () => fetchMedia({ data: { id: messageId } }),
    staleTime: 5 * 60 * 1000,
  });
  if (isLoading) {
    return <Loader2 className="mt-1.5 h-3.5 w-3.5 animate-spin opacity-60" />;
  }
  if (!data?.length) return null;
  return (
    <div className="mt-2 space-y-2">
      {data.map((a, i) => {
        const src = `data:${a.mimeType};base64,${a.dataBase64}`;
        if (a.mimeType.startsWith("image/")) {
          return (
            <img
              key={`${a.filename}-${i}`}
              src={src}
              alt={a.filename}
              loading="lazy"
              className="max-h-64 w-full rounded-xl border border-border/40 object-cover"
            />
          );
        }
        if (a.mimeType.startsWith("audio/")) {
          return (
            <VoiceWave
              key={`${a.filename}-${i}`}
              src={src}
              filename={a.filename}
              mine={mine}
            />
          );
        }
        return (
          <a
            key={`${a.filename}-${i}`}
            href={src}
            download={a.filename}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/50 px-2.5 py-1 text-[11px] underline-offset-2 hover:underline"
          >
            <FileIcon className="h-3 w-3" /> {a.filename}
          </a>
        );
      })}
    </div>
  );
}

function CardChat() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const list = useServerFn(listMailCards);
  const addAddr = useServerFn(addCardAddress);
  const delAddr = useServerFn(removeCardAddress);
  const removeCard = useServerFn(deleteMailCard);
  const renameCard = useServerFn(updateMailCard);
  const listMail = useServerFn(listGmailMessages);
  const send = useServerFn(sendGmailMessage);
  const status = useServerFn(getGmailStatus);

  const [newEmail, setNewEmail] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<
    { filename: string; mimeType: string; dataBase64: string; size: number }[]
  >([]);
  const [membersOpen, setMembersOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const { data: cards, isLoading: cardsLoading } = useQuery({ queryKey: ["mail-cards"], queryFn: () => list() });
  const { data: me } = useQuery({ queryKey: ["gmail-status"], queryFn: () => status() });
  const myEmail = (me && "email" in me ? me.email : null)?.toLowerCase() ?? "";

  const card = cards?.find((c) => c.id === id);
  const emails = useMemo(() => card?.addresses.map((a) => a.email) ?? [], [card]);
  const query = emails.length ? `(from:(${emails.join(" OR ")}) OR to:(${emails.join(" OR ")}))` : "";

  const { data: messages, isLoading: mailLoading, error } = useQuery({
    queryKey: ["card-mail", id, query],
    queryFn: () => listMail({ data: { q: query, maxResults: 40 } }),
    enabled: Boolean(query),
  });

  // Only messages posted through this card/group chat (tagged) and authored by a member (or host).
  const chatTag = `[impo:${id.slice(0, 8)}]`;
  const ordered = useMemo(() => {
    const allowed = new Set(emails);
    return [...(messages ?? [])]
      .filter((m) => {
        if (!(m.subject ?? "").includes(chatTag)) return false;
        const sender = emailFromHeader(m.from);
        return allowed.has(sender) || (Boolean(myEmail) && sender === myEmail);
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [messages, emails, myEmail, chatTag]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [ordered.length]);

  const addMut = useMutation({
    mutationFn: () => addAddr({ data: { cardId: id, email: newEmail } }),
    onSuccess: () => {
      setNewEmail("");
      qc.invalidateQueries({ queryKey: ["mail-cards"] });
      toast.success("Member added");
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
      toast.success("Deleted");
      navigate({ to: "/cards" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renameMut = useMutation({
    mutationFn: (name: string) => renameCard({ data: { id, name } }),
    onSuccess: () => {
      setEditingName(null);
      qc.invalidateQueries({ queryKey: ["mail-cards"] });
      toast.success("Profile updated");
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
    if (photoRef.current) photoRef.current.value = "";
  };

  const sendMut = useMutation({
    mutationFn: () =>
      send({
        data: {
          to: emails.join(", "),
          subject: `${card?.name ?? "Message"} ${chatTag}`,
          body,
          attachments: attachments.map(({ filename, mimeType, dataBase64 }) => ({ filename, mimeType, dataBase64 })),
        },
      }),
    onSuccess: () => {
      setBody("");
      setAttachments([]);
      toast.success(`Sent to ${emails.length} member${emails.length === 1 ? "" : "s"}`);
      qc.invalidateQueries({ queryKey: ["card-mail", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (cardsLoading) {
    return (
      <div className="mx-auto flex max-w-4xl items-center justify-center gap-3 px-4 py-20 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading chat…
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

  const memberLimit = card.kind === "group" ? MAX_GROUP_MEMBERS : MAX_PERSONAL_CARD_EMAILS;
  const atMemberLimit = emails.length >= memberLimit;

  return (
    <div className="mx-auto flex h-[calc(100dvh-6rem)] max-w-3xl flex-col px-2 py-3 sm:px-4 lg:py-6">
      {/* Chat header */}
      <header className="glass-card flex items-center gap-3 rounded-t-3xl border-b border-primary/10 px-3 py-2.5 sm:px-4">
        <Link to="/cards" className="rounded-full p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary" aria-label="Back to cards">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Avatar seed={card.id} label={card.name} className="h-10 w-10 text-sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">{card.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {card.kind === "group" ? "Group" : "Personal card"} ·{" "}
            {emails.length ? emails.slice(0, 3).map((e) => e.split("@")[0]).join(", ") : "no members yet"}
            {emails.length > 3 ? ` +${emails.length - 3}` : ""}
          </p>
        </div>

        <Sheet open={membersOpen} onOpenChange={setMembersOpen}>
          <SheetTrigger asChild>
            <Button size="sm" variant="ghost" className="h-9 gap-1.5 rounded-full border border-primary/20 px-3 text-xs">
              {card.kind === "group" ? <Users className="h-3.5 w-3.5" /> : <IdCard className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">Members</span>
              <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                {emails.length}
              </span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full max-w-sm overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{card.kind === "group" ? "Group members" : "Card addresses"}</SheetTitle>
              <SheetDescription>
                {card.is_host
                  ? `You are the host — ${card.kind === "group" ? `up to ${MAX_GROUP_MEMBERS} members` : "one email address only"}.`
                  : "Only a host can change this."}
              </SheetDescription>
            </SheetHeader>

            {card.is_host && (
              <div className="mt-5 rounded-2xl border border-primary/15 bg-primary/[0.04] p-3">
                <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {card.kind === "group" ? "Group profile" : "Card profile"}
                </p>
                <div className="flex gap-2">
                  <Input
                    value={editingName ?? card.name}
                    maxLength={60}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && editingName?.trim()) renameMut.mutate(editingName.trim());
                    }}
                  />
                  <Button
                    onClick={() => editingName?.trim() && renameMut.mutate(editingName.trim())}
                    disabled={!editingName?.trim() || editingName.trim() === card.name || renameMut.isPending}
                  >
                    {renameMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-5 space-y-2">
              <div className="flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/[0.08] px-3 py-2">
                <Avatar seed={myEmail || card.id} label={myEmail || "H"} className="h-9 w-9 text-xs" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{myEmail || "You"}</p>
                  <p className="truncate text-xs text-muted-foreground">Host · created this {card.kind}</p>
                </div>
              </div>
              {card.addresses.length === 0 && (
                <p className="text-sm text-muted-foreground">No members yet — add one below.</p>
              )}
              {card.addresses.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-2xl border border-primary/15 bg-primary/[0.04] px-3 py-2">
                  <Avatar seed={a.email} label={a.email} className="h-9 w-9 text-xs" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.label || a.email.split("@")[0]}</p>
                    <p className="truncate text-xs text-muted-foreground">{a.email}</p>
                  </div>
                  <button
                    onClick={() => delMut.mutate(a.id)}
                    aria-label={`Remove ${a.email}`}
                    disabled={!card.is_host}
                    className="rounded-full p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {card.is_host && (
              <>
                <div className="mt-5 flex gap-2">
                  <Input
                    placeholder="name@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    disabled={atMemberLimit}
                    onKeyDown={(e) => e.key === "Enter" && newEmail && !atMemberLimit && addMut.mutate()}
                  />
                  <Button onClick={() => addMut.mutate()} disabled={!newEmail || addMut.isPending || atMemberLimit}>
                    {addMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {emails.length}/{memberLimit} {card.kind === "group" ? "members" : "email"}
                </p>
              </>
            )}

            <div className="mt-8 border-t border-border/60 pt-5">
              {!card.is_host && (
                <p className="text-xs text-muted-foreground">
                  Only the host who created this {card.kind} can delete it.
                </p>
              )}
              {card.is_host && (
                <>
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="destructive" onClick={() => deleteCardMut.mutate()} disabled={deleteCardMut.isPending}>
                    {deleteCardMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    <span className="ml-1.5">Yes, delete</span>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)} disabled={deleteCardMut.isPending}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="ml-1.5">Delete {card.kind}</span>
                </Button>
              )}
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* Chat stream */}
      <div className="glass-card flex-1 overflow-y-auto rounded-none border-y-0 px-3 py-4 sm:px-5">
        {!query && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <MessagesSquare className="h-6 w-6 opacity-60" />
            Add a member to start this conversation.
          </div>
        )}
        {query && mailLoading && (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading conversation…
          </div>
        )}
        {error && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {(error as Error).message}
          </div>
        )}
        {query && !mailLoading && !error && ordered.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <MessagesSquare className="h-6 w-6 opacity-60" />
            No messages with these members yet. Say hello below.
          </div>
        )}

        <div className="space-y-1.5">
          {ordered.map((m) => {
            const senderEmail = emailFromHeader(m.from);
            const mine = Boolean(myEmail) && senderEmail === myEmail;
            return (
              <div key={m.id}>
                <div className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                  {!mine && <Avatar seed={senderEmail} label={nameFromHeader(m.from)} className="h-7 w-7 text-[11px]" />}
                  <Link
                    to="/message/$id"
                    params={{ id: m.id }}
                    className={`group max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm transition-transform hover:-translate-y-0.5 ${
                      mine
                        ? "rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-bl-md border border-primary/15 bg-primary/[0.06] text-foreground"
                    }`}
                  >
                    {!mine && card.kind === "group" && (
                      <p className="mb-0.5 text-[11px] font-semibold text-primary">{nameFromHeader(m.from)}</p>
                    )}
                    <p className={`leading-snug ${mine ? "text-primary-foreground/85" : "text-muted-foreground"}`}>
                      {m.snippet}
                    </p>
                    <div onClick={(e) => e.stopPropagation()}>
                      <MessageMedia messageId={m.id} />
                    </div>
                    <p
                      className={`mt-1 text-right text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                    >
                      {chatTime(m.date)}
                    </p>
                  </Link>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
      </div>

      {/* Composer */}
      <div className="glass-card rounded-b-3xl border-t border-primary/10 px-3 py-3 sm:px-4">
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((a, i) => {
              const src = `data:${a.mimeType};base64,${a.dataBase64}`;
              const remove = (
                <button
                  onClick={() => setAttachments((p) => p.filter((_, j) => j !== i))}
                  aria-label={`Remove ${a.filename}`}
                  className="absolute -right-1.5 -top-1.5 rounded-full border border-border/60 bg-background p-0.5"
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </button>
              );
              if (a.mimeType.startsWith("image/")) {
                return (
                  <span key={`${a.filename}-${i}`} className="relative inline-block">
                    <img
                      src={src}
                      alt={a.filename}
                      className="h-16 w-16 rounded-xl border border-border/60 object-cover"
                    />
                    {remove}
                  </span>
                );
              }
              if (a.mimeType.startsWith("audio/")) {
                return (
                  <span key={`${a.filename}-${i}`} className="relative inline-block">
                    <VoiceWave src={src} filename={a.filename} mine />
                    {remove}
                  </span>
                );
              }
              return (
                <span
                  key={`${a.filename}-${i}`}
                  className="relative inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 text-xs"
                >
                  <FileIcon className="h-3 w-3" /> {a.filename}
                  {remove}
                </span>
              );
            })}
          </div>
        )}
        <div className="flex items-end gap-2">
          <input ref={fileRef} type="file" multiple hidden accept="*/*" onChange={(e) => onFiles(e.target.files)} />
          <input
            ref={photoRef}
            type="file"
            multiple
            hidden
            accept="image/*,application/pdf"
            onChange={(e) => onFiles(e.target.files)}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-full text-muted-foreground hover:text-primary"
            onClick={() => fileRef.current?.click()}
            aria-label="Attach files"
            title="Attach any file"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-full text-muted-foreground hover:text-primary"
            onClick={() => photoRef.current?.click()}
            aria-label="Attach photos or PDFs"
            title="Photos & PDFs"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          <VoiceRecorderButton
            onRecorded={(v) => setAttachments((p) => [...p, v])}
          />
          <Textarea
            rows={1}
            placeholder={emails.length ? `Message ${card.name}…` : "Add a member first"}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (emails.length && (body.trim() || attachments.length) && !sendMut.isPending) sendMut.mutate();
              }
            }}
            className="max-h-32 min-h-10 flex-1 resize-none rounded-2xl border-primary/15 bg-primary/[0.04] py-2.5"
          />
          <Button
            size="icon"
            className="h-10 w-10 shrink-0 rounded-full"
            onClick={() => sendMut.mutate()}
            disabled={!emails.length || (!body.trim() && attachments.length === 0) || sendMut.isPending}
            aria-label="Send message"
          >
            {sendMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
