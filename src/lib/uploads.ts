import type { UploadedFile } from "./anthropic";

export const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB
export const ACCEPTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
] as const;

export class UploadValidationError extends Error {}

function kindOf(mimeType: string): "image" | "pdf" {
  return mimeType === "application/pdf" ? "pdf" : "image";
}

/**
 * <input type="file" multiple> から送られてきた FormData の指定フィールドを
 * 検証しつつ UploadedFile[] に変換する。画像(jpg/png)・PDF・8MB以下のみ許可。
 */
export async function parseUploadedFiles(
  formData: FormData,
  field: string,
): Promise<UploadedFile[]> {
  const entries = formData.getAll(field).filter((v): v is File => v instanceof File);
  const files: UploadedFile[] = [];

  for (const file of entries) {
    if (file.size === 0) continue; // 空のfile inputはブラウザがダミーエントリを送ることがある

    if (!ACCEPTED_MIME_TYPES.includes(file.type as (typeof ACCEPTED_MIME_TYPES)[number])) {
      throw new UploadValidationError(
        `対応していないファイル形式です: ${file.name}（画像はjpg/png、書類はPDFのみ対応しています）`,
      );
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new UploadValidationError(
        `ファイルサイズが大きすぎます: ${file.name}（上限 ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB）`,
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    files.push({
      kind: kindOf(file.type),
      mimeType: file.type as UploadedFile["mimeType"],
      data: buffer,
      filename: file.name,
    });
  }

  return files;
}
