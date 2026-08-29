"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { parseUploadedFiles, UploadValidationError } from "@/lib/uploads";
import { analyzeRegistration } from "@/lib/anthropic";

/**
 * 登録画面（業務内容 / マニュアル 共通）。
 * 写真・PDFをアップロードすると、AIが内容を読み取って要約・全文テキストを
 * 生成し、TaskEntry としてデータベースに蓄積する。
 */
export async function createTaskEntryAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const type = formData.get("type") === "manual" ? "manual" : "task";
  const listPath = type === "manual" ? "/manual" : "/tasks";
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
      type,
      files: files!,
    }));
  } catch (err) {
    console.error("AIによる登録内容の解析に失敗しました", err);
    redirect(
      `${newPath}?error=${encodeURIComponent(
        "AIによる内容の読み取りに失敗しました。時間をおいて再度お試しください。（管理者の方は ANTHROPIC_API_KEY の設定をご確認ください）",
      )}`,
    );
  }

  await prisma.taskEntry.create({
    data: {
      type,
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

  redirect(listPath);
}
