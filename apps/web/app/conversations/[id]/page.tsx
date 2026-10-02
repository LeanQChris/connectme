import { InboxModule } from "@/modules/inbox";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <InboxModule initialSelectedId={id} />;
}
