"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  const supabase = await createClient();
  await supabase.from("events").insert({
    title,
    // <input type="date"> の "YYYY-MM-DD" をそのまま date 型に入れる。
    // 時刻を持たない列なので、タイムゾーンで前後の日にずれることがない。
    date,
    start_time: startTime || null,
    note: note || null,
    team_id: user!.teamId!,
    created_by: user!.id,
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
    const supabase = await createClient();
    await supabase.from("events").delete().eq("id", id).eq("team_id", user!.teamId);
  }

  revalidatePath("/calendar");
  revalidatePath("/");
  redirect(from);
}
