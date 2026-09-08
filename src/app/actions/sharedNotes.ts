"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { summarizeConversationForSharing } from "@/lib/claudeAgent";

/**
 * みんなのメモ = チームで共有するナレッジ。
 * 元になるチャットは本人しか見られないので、共有できるのは会話の持ち主だけ。
 */

/** チャットの会話を要約して、チームの共有メモにする。 */
export async function shareConversationAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const conversationId = String(formData.get("conversationId") ?? "").trim();
  const from = String(formData.get("from") ?? "/chat");
  const fail = (message: string) =>
    redirect(`${from}${from.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`);

  if (!user!.teamId) fail("所属チームが未設定のため共有できません");

  // 自分の会話しか共有できない。
  const conversation = conversationId
    ? await prisma.conversation.findFirst({
        where: { id: conversationId, userId: user!.id },
        include: {
          messages: { orderBy: { createdAt: "asc" } },
          sharedNote: true,
        },
      })
    : null;

  if (!conversation) fail("共有するチャットが見つかりませんでした");
  if (conversation!.sharedNote) redirect("/team-notes");
  if (conversation!.messages.length === 0) fail("まだやり取りがないため共有できません");

  let summary;
  try {
    summary = await summarizeConversationForSharing({
      messages: conversation!.messages.map((m) => ({ role: m.role, text: m.text })),
    });
  } catch (err) {
    console.error("共有メモの要約に失敗しました", err);
    fail("要約の作成に失敗しました。少し時間を置いてもう一度お試しください。");
  }

  // 回答の根拠になった業務内容があれば、読んだ人が原典に当たれるよう引き継ぐ。
  const referenced = conversation!.messages
    .map((m) => m.referencedTaskEntryId)
    .filter((id): id is string => Boolean(id));

  // 新人が実際に使った言葉を、チャットの検索の手がかりとして残す。
  // 要約は「である調」に整うため、この言い回しは本文には残らない。
  const sourceQuestions = conversation!.messages
    .filter((m) => m.role === "user" && m.text.trim())
    .map((m) => m.text.trim())
    .join("\n");

  await prisma.sharedNote.create({
    data: {
      title: summary!.title,
      body: summary!.body,
      teamId: user!.teamId!,
      authorId: user!.id,
      conversationId: conversation!.id,
      referencedTaskEntryId: referenced[referenced.length - 1] ?? null,
      sourceQuestions: sourceQuestions || null,
    },
  });

  revalidatePath("/team-notes");
  revalidatePath("/chat");
  redirect("/team-notes?shared=1");
}

/**
 * 共有メモを直す。AIの要約が間違っていたときに、消さずに直せるようにするためのもの。
 * 直せるのは書いた本人と、先輩・管理者（誤った内容がチームに残り続けないように）。
 */
export async function updateSharedNoteAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const id = String(formData.get("noteId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  const note = id
    ? await prisma.sharedNote.findFirst({ where: { id, teamId: user!.teamId ?? undefined } })
    : null;
  if (!note) redirect("/team-notes");

  const backTo = `/team-notes/${note!.id}`;
  if (note!.authorId !== user!.id && user!.role !== "admin") {
    redirect(`${backTo}?error=${encodeURIComponent("このメモを直せるのは、書いた本人と先輩・管理者だけです")}`);
  }
  if (!title || !body) {
    redirect(`${backTo}?error=${encodeURIComponent("見出しと本文を入力してください")}`);
  }

  await prisma.sharedNote.update({
    where: { id: note!.id },
    data: { title: title.slice(0, 60), body, editedAt: new Date() },
  });

  revalidatePath("/team-notes");
  revalidatePath(backTo);
  redirect(`${backTo}?saved=1`);
}

/**
 * 共有をやめる。書いた本人と、先輩・管理者が消せる
 * （間違った内容がチームに残り続けないように）。
 */
export async function deleteSharedNoteAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const id = String(formData.get("noteId") ?? "").trim();
  const from = String(formData.get("from") ?? "/team-notes");

  const note = id
    ? await prisma.sharedNote.findFirst({ where: { id, teamId: user!.teamId ?? undefined } })
    : null;
  if (!note) redirect(from);

  const canDelete = note!.authorId === user!.id || user!.role === "admin";
  if (!canDelete) {
    redirect(`${from}?error=${encodeURIComponent("このメモを消せるのは、書いた本人と先輩・管理者だけです")}`);
  }

  await prisma.sharedNote.delete({ where: { id: note!.id } });

  revalidatePath("/team-notes");
  revalidatePath("/chat");
  redirect("/team-notes");
}
