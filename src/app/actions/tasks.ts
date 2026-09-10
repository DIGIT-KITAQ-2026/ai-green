"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { parseUploadedFiles, UploadValidationError } from "@/lib/uploads";
import { analyzeRegistration } from "@/lib/claudeAgent";
import { saveTaskEntryAttachments, removeAttachmentFiles } from "@/lib/attachments";

/**
 * 業務内容の登録画面。
 * 写真・PDFをアップロードすると、AIが内容を読み取って要約・全文テキストを
 * 生成し、task_entries としてデータベースに蓄積する。
 */
export async function createTaskEntryAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const listPath = "/tasks";
  const newPath = `${listPath}/new`;

  // 登録は先輩・管理者のみ。新人は閲覧のみで、直接POSTされても弾く。
  // DB側にも同じ条件のポリシーがあるが、ここで弾いた方が案内を出せる。
  if (user!.role !== "admin") {
    redirect(`${listPath}?error=${encodeURIComponent("業務内容の登録は先輩・管理者のみ行えます")}`);
  }

  const title = String(formData.get("title") ?? "").trim();
  const teamId = String(formData.get("teamId") ?? user!.teamId ?? "");

  if (!title || !teamId) {
    redirect(`${newPath}?error=${encodeURIComponent("業務名とチームを入力してください")}`);
  }

  const supabase = await createClient();
  const { data: team } = await supabase
    .from("teams")
    .select("id, name")
    .eq("id", teamId)
    .maybeSingle();
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
    redirect(`${newPath}?error=${encodeURIComponent("画像またはPDFを1件以上添付してください")}`);
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

  const { data: entry, error } = await supabase
    .from("task_entries")
    .insert({
      title,
      team_id: team!.id,
      summary,
      raw_text: rawText,
      created_by: user!.id,
    })
    .select("id")
    .single();

  if (error || !entry) {
    console.error("業務内容の登録に失敗しました", error);
    redirect(`${newPath}?error=${encodeURIComponent("登録に失敗しました")}`);
  }

  try {
    await saveTaskEntryAttachments(supabase, entry!.id, files!);
  } catch (err) {
    // ファイルを置けなかったときは、本文だけ残さず巻き戻す。
    console.error("添付ファイルの保存に失敗しました", err);
    await supabase.from("task_entries").delete().eq("id", entry!.id);
    redirect(`${newPath}?error=${encodeURIComponent("添付ファイルの保存に失敗しました")}`);
  }

  // 登録には経験値を付けない。登録できるのは先輩・管理者だけで、
  // 新人には手が届かない加点になってしまうため。
  revalidatePath("/", "layout");
  redirect(listPath);
}

/**
 * 業務内容を削除する。
 * チーム全員で育てるナレッジなので、先輩・管理者であれば登録者を問わず消せる
 * （登録者本人に限定すると、辞めた人の資料を整理できなくなるため）。
 *
 * 添付行とチャットからの参照は外部キーの on delete（cascade / set null）が
 * 面倒を見るので、ここで消すのは本体と Storage 上のファイルだけでよい。
 */
export async function deleteTaskEntryAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user!.role !== "admin") {
    redirect(`/tasks?error=${encodeURIComponent("業務内容の削除は先輩・管理者のみ行えます")}`);
  }

  const id = String(formData.get("entryId") ?? "").trim();
  if (!id) redirect("/tasks");

  const supabase = await createClient();
  const { data: attachments } = await supabase
    .from("attachments")
    .select("storage_path")
    .eq("task_entry_id", id);

  await supabase.from("task_entries").delete().eq("id", id);
  await removeAttachmentFiles(supabase, (attachments ?? []).map((a) => a.storage_path));

  redirect("/tasks");
}
