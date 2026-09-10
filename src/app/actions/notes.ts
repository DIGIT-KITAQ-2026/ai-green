"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  const supabase = await createClient();
  await supabase
    .from("notes")
    .insert({ user_id: user!.id, title: noteTitle(title, body), body });

  revalidatePath("/notes");
  redirect("/notes");
}

export async function updateNoteAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const id = String(formData.get("noteId") ?? "");
  const title = String(formData.get("title") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  const supabase = await createClient();
  // メモは本人のものだけ。RLSでも絞られるが、ここでも user_id を付けて確認する。
  const { data: note } = id
    ? await supabase.from("notes").select("id").eq("id", id).eq("user_id", user!.id).maybeSingle()
    : { data: null };
  if (!note) redirect("/notes");

  if (!body) {
    redirect(`/notes/${note!.id}?error=${encodeURIComponent("メモの内容を入力してください")}`);
  }

  await supabase
    .from("notes")
    .update({ title: noteTitle(title, body), body })
    .eq("id", note!.id);

  revalidatePath("/notes");
  revalidatePath(`/notes/${note!.id}`);
  redirect(`/notes/${note!.id}?saved=1`);
}

export async function deleteNoteAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const id = String(formData.get("noteId") ?? "");
  if (id) {
    const supabase = await createClient();
    await supabase.from("notes").delete().eq("id", id).eq("user_id", user!.id);
  }

  revalidatePath("/notes");
  redirect("/notes");
}
