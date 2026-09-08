"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { XP_RULES, TODO_DAILY_LIMIT } from "@/lib/rewards";

/** ToDoはユーザーごとのものなので、必ず userId とセットで絞り込む。 */

export async function createTodoAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const title = String(formData.get("title") ?? "").trim();
  const due = String(formData.get("dueDate") ?? "").trim();
  const from = String(formData.get("from") ?? "/calendar");

  if (!title) redirect(`${from}?error=${encodeURIComponent("やることを入力してください")}`);

  await prisma.todo.create({
    data: {
      userId: user!.id,
      title,
      // <input type="date"> は "YYYY-MM-DD"。時刻を持たないので正午で保存し、
      // タイムゾーンで前後の日にずれないようにする。
      dueDate: due ? new Date(`${due}T12:00:00`) : null,
    },
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

  const todo = id
    ? await prisma.todo.findFirst({ where: { id, userId: user!.id } })
    : null;
  if (!todo) redirect(from);

  const willBeDone = !todo!.done;

  // 経験値は初めて完了したときだけ。チェックを外して付け直しても増えない。
  // さらに1日 TODO_DAILY_LIMIT 件まで。ToDoは自分で作って自分で消化できるので、
  // 上限が無いといちばん手軽な稼ぎ口になってしまう。
  let awardXp = willBeDone && !todo!.xpAwardedAt;
  if (awardXp) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const awardedToday = await prisma.todo.count({
      where: { userId: user!.id, xpAwardedAt: { gte: startOfToday } },
    });
    // 上限に達した分は「まだ付けていない」ままにしておく。
    // その日の枠を使い切っただけなので、後日また対象になる。
    awardXp = awardedToday < TODO_DAILY_LIMIT;
  }

  await prisma.todo.update({
    where: { id: todo!.id },
    data: {
      done: willBeDone,
      completedAt: willBeDone ? new Date() : null,
      ...(awardXp ? { xpAwardedAt: new Date() } : {}),
    },
  });

  if (awardXp) {
    await prisma.user.update({
      where: { id: user!.id },
      data: { xp: { increment: XP_RULES.todoDone } },
    });
  }

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
    await prisma.todo.deleteMany({ where: { id, userId: user!.id } });
  }

  revalidatePath("/calendar");
  revalidatePath("/");
  redirect(from);
}
