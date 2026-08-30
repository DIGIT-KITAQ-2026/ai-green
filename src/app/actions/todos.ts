"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { XP_RULES } from "@/lib/rewards";

/** ToDoはユーザーごとのものなので、必ず userId とセットで絞り込む。 */

export async function createTodoAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const title = String(formData.get("title") ?? "").trim();
  const due = String(formData.get("dueDate") ?? "").trim();
  const from = String(formData.get("from") ?? "/todos");

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

  revalidatePath("/todos");
  revalidatePath("/");
  redirect(from);
}

export async function toggleTodoAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const id = String(formData.get("todoId") ?? "");
  const from = String(formData.get("from") ?? "/todos");

  const todo = id
    ? await prisma.todo.findFirst({ where: { id, userId: user!.id } })
    : null;
  if (!todo) redirect(from);

  const willBeDone = !todo!.done;
  // 経験値は初めて完了したときだけ。チェックを外して付け直しても増えない。
  const shouldAwardXp = willBeDone && !todo!.xpAwarded;

  await prisma.todo.update({
    where: { id: todo!.id },
    data: {
      done: willBeDone,
      completedAt: willBeDone ? new Date() : null,
      ...(shouldAwardXp ? { xpAwarded: true } : {}),
    },
  });

  if (shouldAwardXp) {
    await prisma.user.update({
      where: { id: user!.id },
      data: { xp: { increment: XP_RULES.todoDone } },
    });
  }

  revalidatePath("/todos");
  revalidatePath("/");
  redirect(from);
}

export async function deleteTodoAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const id = String(formData.get("todoId") ?? "");
  const from = String(formData.get("from") ?? "/todos");

  if (id) {
    await prisma.todo.deleteMany({ where: { id, userId: user!.id } });
  }

  revalidatePath("/todos");
  revalidatePath("/");
  redirect(from);
}
