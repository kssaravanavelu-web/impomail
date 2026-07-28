import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Archive, Inbox, RotateCcw, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { modifyGmailMessage, trashGmailMessage, untrashGmailMessage } from "@/lib/gmail.functions";

type Action = "archive" | "unarchive" | "trash" | "restore";

const ICONS: Record<Action, typeof Archive> = {
  archive: Archive,
  unarchive: Inbox,
  trash: Trash2,
  restore: RotateCcw,
};

const LABELS: Record<Action, string> = {
  archive: "Archive",
  unarchive: "Move to inbox",
  trash: "Move to trash",
  restore: "Restore from trash",
};

export function MailActions({ id, actions }: { id: string; actions: Action[] }) {
  const qc = useQueryClient();
  const modify = useServerFn(modifyGmailMessage);
  const trash = useServerFn(trashGmailMessage);
  const untrash = useServerFn(untrashGmailMessage);

  const mutation = useMutation({
    mutationFn: async (action: Action) => {
      if (action === "trash") return trash({ data: { id } });
      if (action === "restore") return untrash({ data: { id } });
      if (action === "archive")
        return modify({ data: { id, removeLabelIds: ["INBOX"] } });
      return modify({ data: { id, addLabelIds: ["INBOX"] } });
    },
    onSuccess: (_r, action) => {
      toast.success(`${LABELS[action]} done`);
      void qc.invalidateQueries({ queryKey: ["gmail"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      {actions.map((action) => {
        const Icon = ICONS[action];
        return (
          <button
            key={action}
            type="button"
            title={LABELS[action]}
            aria-label={LABELS[action]}
            disabled={mutation.isPending}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              mutation.mutate(action);
            }}
            className="rounded-lg border border-primary/15 bg-background/40 p-2 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
          >
            {mutation.isPending && mutation.variables === action ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Icon className="h-4 w-4" />
            )}
          </button>
        );
      })}
    </>
  );
}
