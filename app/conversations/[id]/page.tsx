import Inbox from "@/components/inbox/inbox";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Inbox initialSelectedId={id} />;
}
