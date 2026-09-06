import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import AdminChatView from "@/components/AdminChatView";

/** adminが、memberの1つの会話を閲覧してコメントを送る画面。 */
export default async function TeamMemberConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ memberId: string; conversationId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const admin = await getCurrentUser();
  if (!admin) redirect("/login");
  if (admin.role !== "admin") redirect("/chat");

  const { memberId, conversationId } = await params;
  const { error } = await searchParams;

  const member = await prisma.user.findFirst({
    where: { id: memberId, role: "member", teamId: admin.teamId ?? undefined },
  });
  if (!member) notFound();

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId: member.id },
  });
  if (!conversation) notFound();

  return (
    <AdminChatView
      member={member}
      conversationId={conversation.id}
      conversationTitle={conversation.title}
      error={error}
    />
  );
}
