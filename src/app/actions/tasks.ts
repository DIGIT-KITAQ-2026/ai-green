"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { parseUploadedFiles, UploadValidationError } from "@/lib/uploads";
import { analyzeRegistration } from "@/lib/claudeAgent";
import { XP_RULES } from "@/lib/rewards";

/**
 * 業務内容の登録画面。
 * 写真・PDFをアップロードすると、AIが内容を読み取って要約・全文テキストを
 * 生成し、TaskEntry としてデータベースに蓄積する。
 */
export async function createTaskEntryAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const listPath = "/tasks";
  const newPath = `${listPath}/new`;

  const title = String(formData.get("title") ?? "").trim();
  const teamId = String(formData.get("teamId") ?? user!.teamId ?? "");

  if (!title || !teamId) {
    redirect(
      `${newPath}?error=${encodeURIComponent("業務名とチームを入力してください")}`,
    );
  }

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) {
    redirect(`${newPath}?error=${encodeURIComponent("所属チームが不正です")}`);
  }

  let files;
  try {
    files = await parseUploadedFiles(formData, "files");
  } catch (err) {
    const message =
      err instanceof UploadValidationError ? err.message : "ファイルの読み込みに失敗しました";
    redirect(`${newPath}?error=${encodeURIComponent(message)}`);
  }

  if (!files || files.length === 0) {
    redirect(
      `${newPath}?error=${encodeURIComponent("画像またはPDFを1件以上添付してください")}`,
    );
  }

  let summary: string;
  let rawText: string;
  try {
    ({ summary, rawText } = await analyzeRegistration({
      title,
      teamName: team!.name,
      files: files!,
    }));
  } catch (err) {
    console.error("AIによる登録内容の解析に失敗しました", err);
    redirect(
      `${newPath}?error=${encodeURIComponent(
        "AIによる内容の読み取りに失敗しました。時間をおいて再度お試しください。（管理者の方はサーバーで `claude login` が済んでいるかご確認ください）",
      )}`,
    );
  }

  await prisma.taskEntry.create({
    data: {
      title,
      teamId: team!.id,
      summary,
      rawText,
      createdById: user!.id,
      attachments: {
        create: files!.map((f) => ({
          kind: f.kind,
          filename: f.filename,
          mimeType: f.mimeType,
          data: f.data,
        })),
      },
    },
  });

  await prisma.user.update({
    where: { id: user!.id },
    data: { xp: { increment: XP_RULES.entryCreated } },
  });

  redirect(listPath);
}

/**
 * 業務内容を削除する。
 * チーム全員で育てるナレッジなので、ログインしていれば誰でも消せる
 * （登録者本人に限定すると、辞めた人の資料を整理できなくなるため）。
 * Attachment.taskEntryId は任意リレーションなので、先に添付を消さないと
 * 参照だけが外れた添付が残ってしまう。必ず 添付 → 本体 の順で削除する。
 */
export async function deleteTaskEntryAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const id = String(formData.get("entryId") ?? "").trim();
  const entry = id ? await prisma.taskEntry.findUnique({ where: { id } }) : null;
  if (!entry) redirect("/tasks");

  await prisma.attachment.deleteMany({ where: { taskEntryId: entry!.id } });
  // この業務内容を根拠にした回答が残っていても表示が壊れないよう、参照を外す。
  await prisma.chatMessage.updateMany({
    where: { referencedTaskEntryId: entry!.id },
    data: { referencedTaskEntryId: null },
  });
  await prisma.taskEntry.delete({ where: { id: entry!.id } });

  redirect("/tasks");
}
