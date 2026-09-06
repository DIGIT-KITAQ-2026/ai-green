"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/**
 * 先輩・管理者(admin)が、同じチームのmemberのチャット(会話)にコメントを残す。
 * 会話全体に対するフィードバックとして扱い、member本人の画面にもそのまま表示される。
 */
export async function createChatFeedbackAction(formData: FormData) {
  const admin = await getCurrentUser();
  if (!admin) redirect("/login");

  const conversationId = String(formData.get("conversationId") ?? "").trim();
  const memberId = String(formData.get("memberId") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();
  const backTo = conversationId && memberId ? `/chat/team/${memberId}/${conversationId}` : "/chat";

  if (admin!.role !== "admin") redirect("/chat");
  if (!text) {
    redirect(`${backTo}?error=${encodeURIComponent("コメントを入力してください")}`);
  }

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId },
    include: { user: true },
  });

  // 同じチームのmemberの会話にしかコメントできない（他チームの覗き見・admin同士の閲覧を防ぐ）。
  if (
    !conversation ||
    conversation.userId !== memberId ||
    conversation.user.role !== "member" ||
    conversation.user.teamId !== admin!.teamId
  ) {
    redirect("/chat");
  }

  await prisma.chatFeedback.create({
    data: { conversationId, adminId: admin!.id, text },
  });

  redirect(backTo);
}
