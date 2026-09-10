import type { SupabaseClient } from "@supabase/supabase-js";
import type { UploadedFile } from "./claudeAgent";
import type { Database } from "./supabase/database.types";

export const ATTACHMENT_BUCKET = "attachments";

/**
 * 添付ファイルの置き場。
 *
 * 以前は SQLite の Bytes 列にファイル本体を入れていたが、Supabase では
 * Storage に置き、DBにはその中のパスだけを持たせている。
 *
 * パスの先頭で誰が置けるかが決まる（supabase/migrations の storage ポリシー）。
 *   task-entries/<業務内容ID>/... … 先輩・管理者だけ
 *   chat/<ユーザーID>/...          … 本人だけ
 */
type Client = SupabaseClient<Database>;

function safeName(filename: string): string {
  // Storageのキーに使えない文字を落とす。元のファイル名は attachments 行に残す。
  const base = filename.replace(/[^\w.\-]+/g, "_").slice(-80);
  return base || "file";
}

function uniquePrefix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 1件アップロードして、保存先のパスを返す。 */
async function upload(
  supabase: Client,
  dir: string,
  file: UploadedFile,
): Promise<string> {
  const path = `${dir}/${uniquePrefix()}-${safeName(file.filename)}`;
  const { error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .upload(path, file.data, { contentType: file.mimeType, upsert: false });
  if (error) throw new Error(`添付ファイルの保存に失敗しました: ${error.message}`);
  return path;
}

/** 業務内容にぶら下がる添付をまとめて保存し、attachments に行を作る。 */
export async function saveTaskEntryAttachments(
  supabase: Client,
  taskEntryId: string,
  files: UploadedFile[],
) {
  const rows = [];
  for (const file of files) {
    const storagePath = await upload(supabase, `task-entries/${taskEntryId}`, file);
    rows.push({
      kind: file.kind,
      filename: file.filename,
      mime_type: file.mimeType,
      storage_path: storagePath,
      task_entry_id: taskEntryId,
    });
  }
  const { error } = await supabase.from("attachments").insert(rows);
  if (error) throw new Error(`添付ファイルの登録に失敗しました: ${error.message}`);
}

/** チャットのメッセージにぶら下がる添付をまとめて保存する。 */
export async function saveChatAttachments(
  supabase: Client,
  userId: string,
  chatMessageId: string,
  files: UploadedFile[],
) {
  const rows = [];
  for (const file of files) {
    const storagePath = await upload(supabase, `chat/${userId}`, file);
    rows.push({
      kind: file.kind,
      filename: file.filename,
      mime_type: file.mimeType,
      storage_path: storagePath,
      chat_message_id: chatMessageId,
    });
  }
  const { error } = await supabase.from("attachments").insert(rows);
  if (error) throw new Error(`添付ファイルの登録に失敗しました: ${error.message}`);
}

/** Storage から本体を取り出す。 */
export async function downloadAttachment(
  supabase: Client,
  storagePath: string,
): Promise<Blob | null> {
  const { data, error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .download(storagePath);
  return error ? null : data;
}

/** 業務内容を消すときに、Storage 側のファイルも片付ける。 */
export async function removeAttachmentFiles(supabase: Client, paths: string[]) {
  if (paths.length === 0) return;
  await supabase.storage.from(ATTACHMENT_BUCKET).remove(paths);
}
