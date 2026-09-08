"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { parseUploadedFiles, UploadValidationError } from "@/lib/uploads";
import { answerChatQuestion } from "@/lib/claudeAgent";
import { rankEntriesByQuery } from "@/lib/retrieval";
import { XP_RULES } from "@/lib/rewards";

/** AIに渡す過去のやり取りの上限。長くなりすぎないよう直近のみを見せる。 */
const HISTORY_LIMIT = 10;

/** 会話の見出しを最初の質問文から作る。 */
function conversationTitle(source: string): string {
  const t = source.replace(/\s+/g, " ").trim();
  if (!t) return "新しい会話";
  return t.length > 24 ? `${t.slice(0, 24)}…` : t;
}

/**
 * チャット画面: 新人の質問（＋画像/PDF添付）を会話に保存し、データベースに
 * 蓄積された業務内容から関連しそうな候補を絞り込んだうえでAIに回答させる。
 *
 * conversationId が空のときは新しい会話を作る。過去の会話は消さずに残るので、
 * 一覧からいつでも開き直して続きを話せる。
 */
export async function sendChatMessageAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const text = String(formData.get("text") ?? "").trim();
  const requestedId = String(formData.get("conversationId") ?? "").trim();

  /** エラー時に戻る先。会話が特定できていればその会話へ、無ければ新規チャット画面へ。 */
  const errorPath = (message: string) =>
    `${requestedId ? `/chat/${requestedId}` : "/chat/new"}?error=${encodeURIComponent(message)}`;

  let files;
  try {
    files = await parseUploadedFiles(formData, "files");
  } catch (err) {
    const message =
      err instanceof UploadValidationError ? err.message : "ファイルの読み込みに失敗しました";
    redirect(errorPath(message));
  }

  if (!text && (!files || files.length === 0)) {
    redirect(errorPath("質問内容か添付ファイルを入力してください"));
  }

  // 指定された会話が自分のものか確認する。無効なら新しい会話として扱う。
  const existing = requestedId
    ? await prisma.conversation.findFirst({
        where: { id: requestedId, userId: user!.id },
      })
    : null;

  // 今回の質問より前のやり取りをAIに渡すため、保存する前に取得しておく。
  const history = existing
    ? (
        await prisma.chatMessage.findMany({
          where: { conversationId: existing.id },
          orderBy: { createdAt: "desc" },
          take: HISTORY_LIMIT,
          select: { role: true, text: true },
        })
      ).reverse()
    : [];

  const conversation =
    existing ??
    (await prisma.conversation.create({
      data: {
        userId: user!.id,
        title: conversationTitle(text || files![0]?.filename || ""),
      },
    }));

  await prisma.chatMessage.create({
    data: {
      userId: user!.id,
      conversationId: conversation.id,
      role: "user",
      text,
      attachments: {
        create: (files ?? []).map((f) => ({
          kind: f.kind,
          filename: f.filename,
          mimeType: f.mimeType,
          data: f.data,
        })),
      },
    },
  });

  // 質問したこと自体に経験値を付ける（回答の成否には左右させない）。
  await prisma.user.update({
    where: { id: user!.id },
    data: { xp: { increment: XP_RULES.question } },
  });
  revalidatePath("/", "layout");

  const allEntries = await prisma.taskEntry.findMany({
    include: { team: true },
    orderBy: { createdAt: "desc" },
  });

  const candidates = rankEntriesByQuery(
    text || (files ?? []).map((f) => f.filename).join(" "),
    allEntries,
    5,
  );

  let answerText: string;
  let referencedId: string | null = null;
  try {
    const result = await answerChatQuestion({
      question: text,
      files: files ?? [],
      history: history.map((h) => ({
        role: h.role === "user" ? ("user" as const) : ("assistant" as const),
        text: h.text,
      })),
      candidates: candidates.map((c) => ({
        id: c.id,
        title: c.title,
        summary: c.summary,
        teamName: c.team.name,
      })),
    });
    answerText = result.answer;
    referencedId = result.referencedTaskEntryId;
  } catch (err) {
    console.error("AI回答の生成に失敗しました", err);
    answerText =
      "ごめんね、いまAIに接続できなかったみたい。少し時間を置いてもう一度試してみてね。（管理者の方はサーバーで `claude login` が済んでいるかご確認ください）";
  }

  // AIの応答には数秒かかるため、その間に別のタブでこの会話が削除されている
  // ことがある。消えた会話に書き込むと外部キー違反で落ちるので、書き込む前に
  // 生存を確認し、無ければ黙って一覧へ戻す。
  const stillExists =
    (await prisma.conversation.count({ where: { id: conversation.id } })) > 0;
  if (!stillExists) redirect("/chat");

  try {
    await prisma.chatMessage.create({
      data: {
        userId: user!.id,
        conversationId: conversation.id,
        role: "assistant",
        text: answerText,
        referencedTaskEntryId: referencedId,
      },
    });
    // 一覧を新しい順に並べるため、最終更新を更新する。
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });
  } catch (err) {
    // 確認した直後に削除された場合の保険。
    console.error("回答の保存に失敗しました（会話が削除された可能性）", err);
    redirect("/chat");
  }

  redirect(`/chat/${conversation.id}`);
}

/**
 * 会話を1件削除する。Attachment.chatMessageId は任意リレーションのため、
 * 先に添付を消さないと参照だけが外れた添付が残ってしまう。
 * 必ず 添付 → メッセージ → 会話 の順で削除する。
 */
export async function deleteConversationAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const id = String(formData.get("conversationId") ?? "").trim();
  const conversation = id
    ? await prisma.conversation.findFirst({ where: { id, userId: user!.id } })
    : null;
  if (!conversation) redirect("/chat");

  await prisma.attachment.deleteMany({
    where: { chatMessage: { conversationId: conversation!.id } },
  });
  await prisma.chatMessage.deleteMany({
    where: { conversationId: conversation!.id },
  });
  await prisma.conversation.delete({ where: { id: conversation!.id } });

  redirect("/chat");
}
