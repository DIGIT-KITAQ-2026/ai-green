"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { parseUploadedFiles, UploadValidationError } from "@/lib/uploads";
import { answerChatQuestion } from "@/lib/claudeAgent";
import { rankEntriesByQuery } from "@/lib/retrieval";

/**
 * チャット画面: 新人の質問（＋画像/PDF添付）を保存し、データベースに
 * 蓄積された業務内容から関連しそうな候補を絞り込んだうえでAIに回答させる。
 */
export async function sendChatMessageAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const text = String(formData.get("text") ?? "").trim();

  let files;
  try {
    files = await parseUploadedFiles(formData, "files");
  } catch (err) {
    const message =
      err instanceof UploadValidationError ? err.message : "ファイルの読み込みに失敗しました";
    redirect(`/chat?error=${encodeURIComponent(message)}`);
  }

  if (!text && (!files || files.length === 0)) {
    redirect(`/chat?error=${encodeURIComponent("質問内容か添付ファイルを入力してください")}`);
  }

  await prisma.chatMessage.create({
    data: {
      userId: user!.id,
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

  const allEntries = await prisma.taskEntry.findMany({
    include: { team: true },
    orderBy: { createdAt: "desc" },
  });

  const candidates = rankEntriesByQuery(
    text || (files ?? []).map((f) => f.filename).join(" "),
    allEntries,
    5,
  );

  try {
    const { answer, referencedTaskEntryId } = await answerChatQuestion({
      question: text,
      files: files ?? [],
      candidates: candidates.map((c) => ({
        id: c.id,
        title: c.title,
        summary: c.summary,
        teamName: c.team.name,
      })),
    });

    await prisma.chatMessage.create({
      data: {
        userId: user!.id,
        role: "assistant",
        text: answer,
        referencedTaskEntryId,
      },
    });
  } catch (err) {
    console.error("AI回答の生成に失敗しました", err);
    await prisma.chatMessage.create({
      data: {
        userId: user!.id,
        role: "assistant",
        text:
          "ごめんね、いまAIに接続できなかったみたい。少し時間を置いてもう一度試してみてね。（管理者の方はサーバーで `claude login` が済んでいるかご確認ください）",
      },
    });
  }

  redirect("/chat");
}
