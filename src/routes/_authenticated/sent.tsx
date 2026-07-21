import { createFileRoute } from "@tanstack/react-router";
import { messages } from "@/lib/mock-data";
import { MessageList, PageHeader } from "@/components/message-list";

export const Route = createFileRoute("/_authenticated/sent")({
  head: () => ({ meta: [{ title: "Sent — ImpoMail" }, { name: "description", content: "Messages you've sent." }] }),
  component: () => (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-8 lg:py-10">
      <PageHeader title="Sent" />
      <MessageList items={messages.filter((m) => m.folder === "sent")} emptyText="You haven't sent any mail yet." />
    </div>
  ),
});