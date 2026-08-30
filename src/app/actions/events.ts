"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/**
 * カレンダーの予定はチームで共有する。所属チームが未設定のうちは登録できない
 * （どのチームの予定か決められないため）。
 */
export async function createEventAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const title = String(formData.get("title") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const startTime = String(formData.get("startTime") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const from = String(formData.get("from") ?? "/calendar");

  const fail = (message: string) =>
    redirect(`${from}${from.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`);

  if (!title || !date) fail("予定名と日付を入力してください");
  if (!user!.teamId) fail("所属チームが未設定のため予定を登録できません");

  await prisma.event.create({
    data: {
      title,
      // <input type="date"> は "YYYY-MM-DD"。時刻を持たないので正午で保存し、
      // タイムゾーンで前後の日にずれないようにする。
      date: new Date(`${date}T12:00:00`),
      startTime: startTime || null,
      note: note || null,
      teamId: user!.teamId!,
      createdById: user!.id,
    },
  });

  revalidatePath("/calendar");
  revalidatePath("/");
  redirect(from);
}

export async function deleteEventAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const id = String(formData.get("eventId") ?? "");
  const from = String(formData.get("from") ?? "/calendar");

  if (id && user!.teamId) {
    // 同じチームの予定だけ削除できる。
    await prisma.event.deleteMany({ where: { id, teamId: user!.teamId } });
  }

  revalidatePath("/calendar");
  revalidatePath("/");
  redirect(from);
}
