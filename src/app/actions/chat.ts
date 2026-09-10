"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { awardXp } from "@/lib/xp";
import { parseUploadedFiles, UploadValidationError } from "@/lib/uploads";
import { answerChatQuestion } from "@/lib/claudeAgent";
import { saveChatAttachments } from "@/lib/attachments";
import { rankEntriesByQuery, type SearchHint } from "@/lib/retrieval";
import { XP_RULES, QUESTION_DAILY_LIMIT, rewardById } from "@/lib/rewards";

/** AIに渡す過去のやり取りの上限。長くなりすぎないよう直近のみを見せる。 */
const HISTORY_LIMIT = 10;

/** 会話の見出しを最初の質問文から作る。 */
function conversationTitle(source: string): string {
  const t = source.replace(/\s+/g, " ").trim();
  if (!t) return "新しい会話";
  return t.length > 24 ? `${t.slice(0, 24)}…` : t;
}

/**
 * チャット画面: 質問（＋画像/PDF添付）を会話に保存し、データベースに
 * 蓄積された業務内容から関連しそうな候補を絞り込んだうえでAIに回答させる。
 *
 * conversationId が空のときは新しい会話を作る。過去の会話は消さずに残るので、
 * 一覧からいつでも開き直して続きを話せる。
 */
export async function sendChatMessageAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const text = String(formData.get("text") ?? "").trim();
  const requestedId = String(formData.get("conversationId") ?? "").trim();

  /** エラー時に戻る先。会話が特定できていればその会話へ、無ければ新規チャット画面へ。 */
  const errorPath = (message: string) =>
    `${requestedId ? `/chat/${requestedId}` : "/chat/new"}?error=${encodeURIComponent(message)}`;

  let files;
  try {
    files = await parseUploadedFiles(formData, "files");
  } catch (err) {
    const message =
      err instanceof UploadValidationError ? err.message : "ファイルの読み込みに失敗しました";
    redirect(errorPath(message));
  }

  if (!text && (!files || files.length === 0)) {
    redirect(errorPath("質問内容か添付ファイルを入力してください"));
  }

  // 指定された会話が自分のものか確認する。無効なら新しい会話として扱う。
  const { data: existing } = requestedId
    ? await supabase
        .from("conversations")
        .select("id")
        .eq("id", requestedId)
        .eq("user_id", user!.id)
        .maybeSingle()
    : { data: null };

  // 今回の質問より前のやり取りをAIに渡すため、保存する前に取得しておく。
  const history = existing
    ? ((
        await supabase
          .from("chat_messages")
          .select("role, text")
          .eq("conversation_id", existing.id)
          .order("created_at", { ascending: false })
          .limit(HISTORY_LIMIT)
      ).data ?? []).reverse()
    : [];

  let conversationId = existing?.id ?? null;
  if (!conversationId) {
    const { data: created, error } = await supabase
      .from("conversations")
      .insert({
        user_id: user!.id,
        title: conversationTitle(text || files![0]?.filename || ""),
      })
      .select("id")
      .single();
    if (error || !created) {
      console.error("会話の作成に失敗しました", error);
      redirect(errorPath("チャットを開始できませんでした"));
    }
    conversationId = created!.id;
  }

  const { data: userMessage, error: userMessageError } = await supabase
    .from("chat_messages")
    .insert({
      user_id: user!.id,
      conversation_id: conversationId!,
      role: "user",
      text,
    })
    .select("id")
    .single();
  if (userMessageError || !userMessage) {
    console.error("質問の保存に失敗しました", userMessageError);
    redirect(errorPath("質問を保存できませんでした"));
  }

  if (files && files.length > 0) {
    try {
      await saveChatAttachments(supabase, user!.id, userMessage!.id, files);
    } catch (err) {
      console.error("添付ファイルの保存に失敗しました", err);
    }
  }

  // 質問したこと自体に経験値を付ける（回答の成否には左右させない）。
  // ただし1日 QUESTION_DAILY_LIMIT 問まで。質問は毎回AIを呼ぶので、
  // 連打でレベルを上げる形にはしない（上限を超えても質問自体はできる）。
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const { count: askedToday } = await supabase
    .from("chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user!.id)
    .eq("role", "user")
    .gte("created_at", startOfToday.toISOString());
  if ((askedToday ?? 0) <= QUESTION_DAILY_LIMIT) {
    await awardXp(user!.id, XP_RULES.question);
  }
  revalidatePath("/", "layout");

  // 回答の候補は全チームの業務内容から探す（他部署の手順を知りたいこともあるため）。
  const { data: allEntries } = await supabase
    .from("task_entries")
    .select("id, title, summary, rawText:raw_text, team:teams(id, name)")
    .order("created_at", { ascending: false });

  // みんなのメモを「どの言い方をした人がどの資料に辿り着いたか」の手がかりとして使う。
  // 回答の根拠に渡すのはあくまで業務内容そのもので、メモの本文は渡さない
  // （原典から内容がブレたり、古いメモが最新の資料より優先されるのを防ぐため）。
  const { data: noteHints } = user!.teamId
    ? await supabase
        .from("shared_notes")
        .select("referenced_task_entry_id, source_questions")
        .eq("team_id", user!.teamId)
        .not("referenced_task_entry_id", "is", null)
    : { data: [] };

  const hints: SearchHint[] = (noteHints ?? []).flatMap((n) =>
    // 質問文1件ずつを手がかりにする。見出しや本文は混ぜない
    // （文章が長いほど偶然の一致が増え、無関係な資料が上がってしまうため）。
    (n.source_questions ?? "")
      .split("\n")
      .map((q) => q.trim())
      .filter(Boolean)
      .map((q) => ({ entryId: n.referenced_task_entry_id!, text: q })),
  );

  const candidates = rankEntriesByQuery(
    text || (files ?? []).map((f) => f.filename).join(" "),
    allEntries ?? [],
    5,
    hints,
  );

  let answerText: string;
  let referencedId: string | null = null;
  try {
    const result = await answerChatQuestion({
      question: text,
      files: files ?? [],
      history: history.map((h) => ({
        role: h.role === "user" ? ("user" as const) : ("assistant" as const),
        text: h.text,
      })),
      candidates: candidates.map((c) => ({
        id: c.id,
        title: c.title,
        summary: c.summary,
        teamName: c.team.name,
      })),
      // 選んでいるキャラクターの話し方。変わるのは口調だけで、
      // 答える内容や詳しさはキャラクターによらず同じになるようにしている。
      voice: rewardById(user!.selectedRewardId).voice,
    });
    answerText = result.answer;
    referencedId = result.referencedTaskEntryId;
  } catch (err) {
    console.error("AI回答の生成に失敗しました", err);
    answerText =
      "ごめんね、いまAIに接続できなかったみたい。少し時間を置いてもう一度試してみてね。（管理者の方はサーバーで `claude login` が済んでいるかご確認ください）";
  }

  // AIの応答には数秒かかるため、その間に別のタブでこの会話が削除されている
  // ことがある。消えた会話に書き込むと外部キー違反で落ちるので、書き込む前に
  // 生存を確認し、無ければ黙って一覧へ戻す。
  const { data: stillExists } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId!)
    .maybeSingle();
  if (!stillExists) redirect("/chat");

  const { error: answerError } = await supabase.from("chat_messages").insert({
    user_id: user!.id,
    conversation_id: conversationId!,
    role: "assistant",
    text: answerText,
    referenced_task_entry_id: referencedId,
  });
  if (answerError) {
    // 確認した直後に削除された場合の保険。
    console.error("回答の保存に失敗しました（会話が削除された可能性）", answerError);
    redirect("/chat");
  }

  // 一覧を新しい順に並べるため、最終更新を更新する。
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId!);

  redirect(`/chat/${conversationId}`);
}

/**
 * 会話を1件削除する。
 * ぶら下がるメッセージと添付は外部キーの on delete cascade で一緒に消える。
 */
export async function deleteConversationAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const id = String(formData.get("conversationId") ?? "").trim();
  if (!id) redirect("/chat");

  const supabase = await createClient();
  await supabase.from("conversations").delete().eq("id", id).eq("user_id", user!.id);

  redirect("/chat");
}
