import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Icon } from "@/components/IconSprite";
import AdminConversationList from "@/components/AdminConversationList";
import type { ConversationSummary } from "@/components/ConversationList";

/**
 * adminが、同じチームのmemberの会話一覧を見る画面。
 * 一覧から選ぶと /chat/team/[memberId]/[conversationId] で中身を見られる。
 */
export default async function TeamMemberChatPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const admin = await getCurrentUser();
  if (!admin) redirect("/login");
  if (admin.role !== "admin") redirect("/chat");

  const { memberId } = await params;
  const member = await prisma.user.findFirst({
    where: { id: memberId, role: "member", teamId: admin.teamId ?? undefined },
  });
  if (!member) notFound();

  const conversations = await prisma.conversation.findMany({
    where: { userId: member.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { messages: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { text: true },
      },
    },
  });

  const summaries: ConversationSummary[] = conversations.map((c) => ({
    id: c.id,
    title: c.title,
    updatedAt: c.updatedAt,
    messageCount: c._count.messages,
    lastMessage: c.messages[0]?.text ?? "",
  }));

  const memberName = member.nickname ?? member.name;

  return (
    <div>
      <Link href="/chat" className="btn-ghost mb-6 inline-flex">
        <Icon name="back" className="h-4 w-4" />
        チャットに戻る
      </Link>

      <h1 className="mb-1 font-display text-xl font-black text-ink">
        {memberName}さんのチャット
      </h1>
      <p className="mb-6 text-xs leading-relaxed text-inkfaint">
        質問の内容を確認して、必要であればコメントを送れます。
      </p>

      <AdminConversationList memberId={member.id} conversations={summaries} />
    </div>
  );
}
