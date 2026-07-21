import { createFileRoute } from "@tanstack/react-router";
import { messages } from "@/lib/mock-data";
import { MessageList, PageHeader } from "@/components/message-list";

export const Route = createFileRoute("/_authenticated/drafts")({
  head: () => ({ meta: [{ title: "Drafts — ImpoMail" }, { name: "description", content: "Your saved drafts." }] }),
  component: () => (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-8 lg:py-10">
      <PageHeader title="Drafts" />
      <MessageList items={messages.filter((m) => m.folder === "drafts")} emptyText="No drafts saved." />
    </div>
  ),
});