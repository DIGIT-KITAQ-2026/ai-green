"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { summarizeConversationForSharing } from "@/lib/claudeAgent";

/**
 * みんなのメモ = 全部門で読めるナレッジ。
 * 読むのは全員、直せるのは書いた本人と先輩・管理者。
 * team_id は「どの部門が貯めたメモか」を表す分類として持つ（絞り込みに使う）。
 * 元になるチャットは本人しか見られないので、共有できるのは会話の持ち主だけ。
 */

/** チャットの会話を要約して、みんなのメモにする。 */
export async function shareConversationAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const conversationId = String(formData.get("conversationId") ?? "").trim();
  const from = String(formData.get("from") ?? "/chat");
  const fail = (message: string) =>
    redirect(`${from}${from.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`);

  if (!user!.teamId) fail("所属チームが未設定のため共有できません");

  // 自分の会話しか共有できない。
  const { data: conversation } = conversationId
    ? await supabase
        .from("conversations")
        .select("id, messages:chat_messages(role, text, referenced_task_entry_id, created_at)")
        .eq("id", conversationId)
        .eq("user_id", user!.id)
        .maybeSingle()
    : { data: null };

  if (!conversation) fail("共有するチャットが見つかりませんでした");

  // 同じ会話を二重に共有しない。
  const { data: alreadyShared } = await supabase
    .from("shared_notes")
    .select("id")
    .eq("conversation_id", conversation!.id)
    .maybeSingle();
  if (alreadyShared) redirect("/team-notes");

  const messages = [...(conversation!.messages ?? [])].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );
  if (messages.length === 0) fail("まだやり取りがないため共有できません");

  let summary;
  try {
    summary = await summarizeConversationForSharing({
      messages: messages.map((m) => ({ role: m.role, text: m.text })),
    });
  } catch (err) {
    console.error("共有メモの要約に失敗しました", err);
    fail("要約の作成に失敗しました。少し時間を置いてもう一度お試しください。");
  }

  // 回答の根拠になった業務内容があれば、読んだ人が原典に当たれるよう引き継ぐ。
  const referenced = messages
    .map((m) => m.referenced_task_entry_id)
    .filter((id): id is string => Boolean(id));

  // 実際に使った言葉を、チャットの検索の手がかりとして残す。
  // 要約は「である調」に整うため、この言い回しは本文には残らない。
  const sourceQuestions = messages
    .filter((m) => m.role === "user" && m.text.trim())
    .map((m) => m.text.trim())
    .join("\n");

  await supabase.from("shared_notes").insert({
    title: summary!.title,
    body: summary!.body,
    team_id: user!.teamId!,
    author_id: user!.id,
    conversation_id: conversation!.id,
    referenced_task_entry_id: referenced[referenced.length - 1] ?? null,
    source_questions: sourceQuestions || null,
  });

  // 共有そのものには経験値を付けない。
  // 付けると「共有すべきか」の判断に点数が混ざり、点のために薄いメモを出す
  // 動機になってしまうため。役に立ったかどうかは、読んだ人のいいねで測る。
  revalidatePath("/team-notes");
  revalidatePath("/chat");
  redirect("/team-notes?shared=1");
}

/**
 * 共有メモを直す。AIの要約が間違っていたときに、消さずに直せるようにするためのもの。
 * 直せるのは書いた本人と、先輩・管理者（誤った内容が全社に残り続けないように）。
 */
export async function updateSharedNoteAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const id = String(formData.get("noteId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  const { data: note } = id
    ? await supabase.from("shared_notes").select("id, author_id").eq("id", id).maybeSingle()
    : { data: null };
  if (!note) redirect("/team-notes");

  const backTo = `/team-notes/${note!.id}`;
  if (note!.author_id !== user!.id && user!.role !== "admin") {
    redirect(`${backTo}?error=${encodeURIComponent("このメモを直せるのは、書いた本人と先輩・管理者だけです")}`);
  }
  if (!title || !body) {
    redirect(`${backTo}?error=${encodeURIComponent("見出しと本文を入力してください")}`);
  }

  await supabase
    .from("shared_notes")
    .update({ title: title.slice(0, 60), body, edited_at: new Date().toISOString() })
    .eq("id", note!.id);

  revalidatePath("/team-notes");
  revalidatePath(backTo);
  redirect(`${backTo}?saved=1`);
}

/**
 * 共有をやめる。書いた本人と、先輩・管理者が消せる
 * （間違った内容が全社に残り続けないように）。
 * いいね・非表示の記録は外部キーの on delete cascade で一緒に消える。
 */
export async function deleteSharedNoteAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const id = String(formData.get("noteId") ?? "").trim();
  const from = String(formData.get("from") ?? "/team-notes");

  const { data: note } = id
    ? await supabase.from("shared_notes").select("id, author_id").eq("id", id).maybeSingle()
    : { data: null };
  if (!note) redirect(from);

  const canDelete = note!.author_id === user!.id || user!.role === "admin";
  if (!canDelete) {
    redirect(`${from}?error=${encodeURIComponent("このメモを消せるのは、書いた本人と先輩・管理者だけです")}`);
  }

  await supabase.from("shared_notes").delete().eq("id", note!.id);

  revalidatePath("/team-notes");
  revalidatePath("/chat");
  redirect("/team-notes");
}

/**
 * いいねを押す／取り消す。
 *
 * 画面に出すのは件数だけで、誰が押したかは表示しない（匿名）。
 * 行そのものも本人以外は読めないようにしてあり、件数は shared_notes.like_count
 * をトリガで同期して見せている。
 *
 * 中身をDBの関数（toggle_shared_note_like）に置いているのは、いいねが付いたときに
 * 「書いた人」のXPを増やす必要があるため。他人のプロフィールは通常のポリシーでは
 * 更新できないので、付け外しと加算をまとめて1つの関数で行っている。
 */
export async function toggleSharedNoteLikeAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const noteId = String(formData.get("noteId") ?? "").trim();
  const from = String(formData.get("from") ?? "/team-notes");

  if (noteId) {
    const { error } = await supabase.rpc("toggle_shared_note_like", { p_note_id: noteId });
    if (error) console.error("いいねの更新に失敗しました", error);
  }

  revalidatePath("/team-notes");
  revalidatePath("/", "layout");
  redirect(from);
}

/**
 * 自分の画面でだけメモを下げる／戻す。
 * 共有物は消さず、見え方だけを個人ごとに変える。
 */
export async function toggleSharedNoteHideAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const noteId = String(formData.get("noteId") ?? "").trim();
  const from = String(formData.get("from") ?? "/team-notes");

  if (noteId) {
    const { data: existing } = await supabase
      .from("shared_note_hides")
      .select("id")
      .eq("note_id", noteId)
      .eq("user_id", user!.id)
      .maybeSingle();

    if (existing) {
      await supabase.from("shared_note_hides").delete().eq("id", existing.id);
    } else {
      await supabase
        .from("shared_note_hides")
        .insert({ note_id: noteId, user_id: user!.id });
    }
  }

  revalidatePath("/team-notes");
  redirect(from);
}
