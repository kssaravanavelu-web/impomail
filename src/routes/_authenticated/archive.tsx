import { createFileRoute } from "@tanstack/react-router";
import { messages } from "@/lib/mock-data";
import { MessageList, PageHeader } from "@/components/message-list";

export const Route = createFileRoute("/_authenticated/archive")({
  head: () => ({ meta: [{ title: "Archive — ImpoMail" }, { name: "description", content: "Archived messages." }] }),
  component: () => (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-8 lg:py-10">
      <PageHeader title="Archive" subtitle="Long-term storage for important mail." />
      <MessageList items={messages.filter((m) => m.folder === "archive")} emptyText="Nothing archived yet." />
    </div>
  ),
});