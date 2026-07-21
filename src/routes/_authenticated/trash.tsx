import { createFileRoute } from "@tanstack/react-router";
import { messages } from "@/lib/mock-data";
import { MessageList, PageHeader } from "@/components/message-list";

export const Route = createFileRoute("/_authenticated/trash")({
  head: () => ({ meta: [{ title: "Trash — ImpoMail" }, { name: "description", content: "Deleted messages." }] }),
  component: () => (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-8 lg:py-10">
      <PageHeader title="Trash" subtitle="Messages are permanently deleted after 30 days." />
      <MessageList items={messages.filter((m) => m.folder === "trash")} emptyText="Trash is empty." />
    </div>
  ),
});