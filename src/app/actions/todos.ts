"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { awardXp } from "@/lib/xp";
import { XP_RULES, TODO_DAILY_LIMIT } from "@/lib/rewards";

/** ToDoはユーザーごとのもの。RLSでも絞られるが、条件にも user_id を必ず入れる。 */

export async function createTodoAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const title = String(formData.get("title") ?? "").trim();
  const due = String(formData.get("dueDate") ?? "").trim();
  const from = String(formData.get("from") ?? "/calendar");

  if (!title) redirect(`${from}?error=${encodeURIComponent("やることを入力してください")}`);

  const supabase = await createClient();
  await supabase.from("todos").insert({
    user_id: user!.id,
    title,
    // <input type="date"> の "YYYY-MM-DD" をそのまま date 型に入れる。
    due_date: due || null,
  });

  revalidatePath("/calendar");
  revalidatePath("/", "layout");
  redirect(from);
}

export async function toggleTodoAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const id = String(formData.get("todoId") ?? "");
  const from = String(formData.get("from") ?? "/calendar");

  const supabase = await createClient();
  const { data: todo } = id
    ? await supabase
        .from("todos")
        .select("id, done, xp_awarded_at")
        .eq("id", id)
        .eq("user_id", user!.id)
        .maybeSingle()
    : { data: null };
  if (!todo) redirect(from);

  const willBeDone = !todo!.done;

  // 経験値は初めて完了したときだけ。チェックを外して付け直しても増えない。
  // さらに1日 TODO_DAILY_LIMIT 件まで。ToDoは自分で作って自分で消化できるので、
  // 上限が無いといちばん手軽な稼ぎ口になってしまう。
  let awardable = willBeDone && !todo!.xp_awarded_at;
  if (awardable) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("todos")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user!.id)
      .gte("xp_awarded_at", startOfToday.toISOString());
    // 上限に達した分は「まだ付けていない」ままにしておく。
    // その日の枠を使い切っただけなので、後日また対象になる。
    awardable = (count ?? 0) < TODO_DAILY_LIMIT;
  }

  await supabase
    .from("todos")
    .update({
      done: willBeDone,
      completed_at: willBeDone ? new Date().toISOString() : null,
      ...(awardable ? { xp_awarded_at: new Date().toISOString() } : {}),
    })
    .eq("id", todo!.id);

  if (awardable) await awardXp(user!.id, XP_RULES.todoDone);

  revalidatePath("/calendar");
  revalidatePath("/", "layout");
  redirect(from);
}

export async function deleteTodoAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const id = String(formData.get("todoId") ?? "");
  const from = String(formData.get("from") ?? "/calendar");

  if (id) {
    const supabase = await createClient();
    await supabase.from("todos").delete().eq("id", id).eq("user_id", user!.id);
  }

  revalidatePath("/calendar");
  revalidatePath("/");
  redirect(from);
}
