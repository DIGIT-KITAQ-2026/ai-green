import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

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
  const attachment = await prisma.attachment.findUnique({
    where: { id },
  });
  if (!attachment) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(attachment.data), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(attachment.filename)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
