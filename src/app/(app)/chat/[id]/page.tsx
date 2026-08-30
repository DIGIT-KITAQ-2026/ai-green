import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import ChatView from "@/components/ChatView";

/** 過去の会話を開いて続きから話す画面。 */
export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const { error } = await searchParams;

  // 他人の会話は開けないよう、必ず userId とセットで確認する。
  const conversation = await prisma.conversation.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!conversation) notFound();

  return <ChatView user={user} conversationId={conversation.id} error={error} />;
}
