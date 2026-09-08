"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { summarizeConversationForSharing } from "@/lib/claudeAgent";
import { XP_RULES } from "@/lib/rewards";

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

  // 共有そのものには経験値を付けない。
  // 付けると「共有すべきか」の判断に点数が混ざり、点のために薄いメモを出す
  // 動機になってしまうため。役に立ったかどうかは、読んだ人のいいねで測る。
  revalidatePath("/team-notes");
  revalidatePath("/chat");
  revalidatePath("/", "layout");
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

  // 先にいいね・非表示の記録を消してから本体を消す。
  await prisma.sharedNoteLike.deleteMany({ where: { noteId: note!.id } });
  await prisma.sharedNoteHide.deleteMany({ where: { noteId: note!.id } });
  await prisma.sharedNote.delete({ where: { id: note!.id } });

  revalidatePath("/team-notes");
  revalidatePath("/chat");
  redirect("/team-notes");
}

/**
 * いいねを押す／取り消す。
 * 画面に出すのは件数だけで、誰が押したかは表示しない（匿名）。
 * ユーザーIDを持っているのは、二重に押せないようにするためと、
 * 押し直しで取り消せるようにするため。
 */
export async function toggleSharedNoteLikeAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const noteId = String(formData.get("noteId") ?? "").trim();
  const from = String(formData.get("from") ?? "/team-notes");

  // 同じチームのメモにしか押せない。
  const note = noteId
    ? await prisma.sharedNote.findFirst({
        where: { id: noteId, teamId: user!.teamId ?? undefined },
      })
    : null;
  if (!note) redirect(from);

  const existing = await prisma.sharedNoteLike.findUnique({
    where: { noteId_userId: { noteId: note!.id, userId: user!.id } },
  });

  if (existing) {
    await prisma.sharedNoteLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.sharedNoteLike.create({
      data: { noteId: note!.id, userId: user!.id },
    });
    await awardLikeXp(note!.id);
  }

  revalidatePath("/team-notes");
  revalidatePath("/", "layout");
  redirect(from);
}

/**
 * いいねが付いたメモを書いた人に経験値を渡す。
 *
 * 経験値が入るのは押した側ではなく書いた側。
 * いいねを押すのは軽い行動で、価値があるのは「役に立つメモを残したこと」の方だから。
 * 自分で自分のメモに押した分は数えない。
 *
 * 渡し済みの数を SharedNote.xpAwardedLikes に残し、増えた差分だけ加算する。
 * いいねを外しても経験値は減らないので、押し直しで二重に稼ぐことはできない。
 */
async function awardLikeXp(noteId: string) {
  const note = await prisma.sharedNote.findUnique({
    where: { id: noteId },
    select: { id: true, authorId: true, xpAwardedLikes: true },
  });
  // 退会したユーザーのメモには渡す先が無い。
  if (!note?.authorId) return;

  const likesFromOthers = await prisma.sharedNoteLike.count({
    where: { noteId: note.id, userId: { not: note.authorId } },
  });
  const newLikes = likesFromOthers - note.xpAwardedLikes;
  if (newLikes <= 0) return;

  await prisma.sharedNote.update({
    where: { id: note.id },
    data: { xpAwardedLikes: likesFromOthers },
  });
  await prisma.user.update({
    where: { id: note.authorId },
    data: { xp: { increment: newLikes * XP_RULES.noteLikeReceived } },
  });
}

/**
 * 自分の画面でだけメモを下げる／戻す。
 * チームの共有物は消さず、見え方だけを個人ごとに変える。
 */
export async function toggleSharedNoteHideAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const noteId = String(formData.get("noteId") ?? "").trim();
  const from = String(formData.get("from") ?? "/team-notes");

  const note = noteId
    ? await prisma.sharedNote.findFirst({
        where: { id: noteId, teamId: user!.teamId ?? undefined },
      })
    : null;
  if (!note) redirect(from);

  const existing = await prisma.sharedNoteHide.findUnique({
    where: { noteId_userId: { noteId: note!.id, userId: user!.id } },
  });

  if (existing) {
    await prisma.sharedNoteHide.delete({ where: { id: existing.id } });
  } else {
    await prisma.sharedNoteHide.create({
      data: { noteId: note!.id, userId: user!.id },
    });
  }

  revalidatePath("/team-notes");
  redirect(from);
}
