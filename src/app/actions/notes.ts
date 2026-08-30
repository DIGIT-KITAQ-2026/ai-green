"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/** メモはユーザーごとのものなので、必ず userId とセットで絞り込む。 */

/** 見出しが空なら本文の1行目から作る（走り書きでも一覧で見分けられるように）。 */
function noteTitle(title: string, body: string): string {
  const t = title.trim();
  if (t) return t.length > 40 ? `${t.slice(0, 40)}…` : t;
  const firstLine = body.split("\n").find((l) => l.trim()) ?? "";
  const f = firstLine.trim();
  if (!f) return "無題のメモ";
  return f.length > 24 ? `${f.slice(0, 24)}…` : f;
}

export async function createNoteAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const title = String(formData.get("title") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!body) {
    redirect(`/notes?error=${encodeURIComponent("メモの内容を入力してください")}`);
  }

  await prisma.note.create({
    data: { userId: user!.id, title: noteTitle(title, body), body },
  });

  revalidatePath("/notes");
  redirect("/notes");
}

export async function updateNoteAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const id = String(formData.get("noteId") ?? "");
  const title = String(formData.get("title") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  const note = id
    ? await prisma.note.findFirst({ where: { id, userId: user!.id } })
    : null;
  if (!note) redirect("/notes");

  if (!body) {
    redirect(`/notes/${note!.id}?error=${encodeURIComponent("メモの内容を入力してください")}`);
  }

  await prisma.note.update({
    where: { id: note!.id },
    data: { title: noteTitle(title, body), body },
  });

  revalidatePath("/notes");
  revalidatePath(`/notes/${note!.id}`);
  redirect(`/notes/${note!.id}?saved=1`);
}

export async function deleteNoteAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const id = String(formData.get("noteId") ?? "");
  if (id) {
    await prisma.note.deleteMany({ where: { id, userId: user!.id } });
  }

  revalidatePath("/notes");
  redirect("/notes");
}
