import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { downloadAttachment } from "@/lib/attachments";

/** 添付ファイル（画像・PDF）の実体をログインユーザーにのみ配信する。 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data: attachment } = await supabase
    .from("attachments")
    .select("filename, mime_type, storage_path")
    .eq("id", id)
    .maybeSingle();

  if (!attachment) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const blob = await downloadAttachment(supabase, attachment.storage_path);
  if (!blob) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return new NextResponse(blob.stream(), {
    headers: {
      "Content-Type": attachment.mime_type,
      "Content-Disposition": `inline; filename="${encodeURIComponent(attachment.filename)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
