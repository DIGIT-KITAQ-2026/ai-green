import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { deleteConversationAction } from "@/app/actions/chat";
import { shareConversationAction } from "@/app/actions/sharedNotes";
import SubmitButton from "./SubmitButton";
import ChatPanel from "./ChatPanel";
import ChatMessage from "./ChatMessage";
import ConfirmSubmitButton from "./ConfirmSubmitButton";
import { Icon } from "./IconSprite";

const DATE_FMT = new Intl.DateTimeFormat("ja-JP", {
  month: "long",
  day: "numeric",
  weekday: "short",
});
const TIME_FMT = new Intl.DateTimeFormat("ja-JP", {
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * 1つの会話の画面。/chat/new（まだ会話が無い状態）と /chat/[id] の
 * どちらからも使う。会話の選択はチャットのホーム画面（/chat）が担当し、
 * ここには一覧へ戻る導線だけを置く。
 */
export default async function ChatView({
  user,
  conversationId,
  error,
  initialText = "",
}: {
  user: { id: string; name: string; teamId: string | null };
  conversationId: string | null;
  error?: string;
  /** 質問例から始めたときに、あらかじめ入力欄へ入れておく文章。 */
  initialText?: string;
}) {
  const supabase = await createClient();
  const entryQuery = supabase
    .from("task_entries")
    .select("title")
    .order("created_at", { ascending: false })
    .limit(4);

  const [conversationRes, messageRes, entryRes] = await Promise.all([
    conversationId
      ? supabase
          .from("conversations")
          .select("id, title, sharedNote:shared_notes(id)")
          .eq("id", conversationId)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    conversationId
      ? supabase
          .from("chat_messages")
          .select(
            "id, role, text, createdAt:created_at, referencedTaskEntryId:referenced_task_entry_id, attachments(id, filename)",
          )
          .eq("conversation_id", conversationId)
          .eq("user_id", user.id)
          .order("created_at")
      : Promise.resolve({ data: [] }),
    // 質問例は実際に登録されている業務内容から作る。
    // 何も登録されていないときは例を出さない（答えられない質問を勧めないため）。
    user.teamId ? entryQuery.eq("team_id", user.teamId) : entryQuery,
  ]);

  const conversation = conversationRes.data;
  const messages = messageRes.data ?? [];

  const referencedIds = messages
    .map((m) => m.referencedTaskEntryId)
    .filter((id): id is string => Boolean(id));
  const { data: referenced } = referencedIds.length
    ? await supabase.from("task_entries").select("id, title").in("id", referencedIds)
    : { data: [] };
  const referencedMap = new Map((referenced ?? []).map((r) => [r.id, r]));

  const suggestions = (entryRes.data ?? []).map((e) => `${e.title}について教えて`);
  const greetName = user.name;

  let lastDate = "";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/chat"
            className="flex shrink-0 items-center gap-1 text-xs font-bold text-inksoft transition hover:text-matcha"
          >
            <Icon name="back" className="h-4 w-4" />
            チャット一覧
          </Link>
          <span className="h-4 w-px shrink-0 bg-line" />
          <div className="min-w-0">
            <h1 className="truncate font-display text-base font-bold text-ink">
              {conversation ? conversation.title : "新しいチャット"}
            </h1>
            <p className="text-[11px] text-inkfaint">
              {conversation
                ? `${messages.length}件のやりとり ・ この会話は${greetName}さんだけに表示されます`
                : "最初の質問を送ると、この会話が履歴に保存されます"}
            </p>
          </div>
        </div>

        {conversation && (
          <div className="flex shrink-0 items-center gap-2">
            {/* この会話をチームのナレッジとして共有するかどうか */}
            {conversation.sharedNote ? (
              <Link
                href="/team-notes"
                className="rounded-full border border-matcha-line bg-matcha-soft px-3 py-1.5 text-xs font-bold text-matcha-deep transition hover:border-matcha"
              >
                みんなのメモに共有済み
              </Link>
            ) : (
              messages.length > 0 && (
                <form action={shareConversationAction}>
                  <input type="hidden" name="conversationId" value={conversation.id} />
                  <input
                    type="hidden"
                    name="from"
                    value={`/chat/${conversation.id}`}
                  />
                  <SubmitButton
                    pendingLabel="要約中…"
                    className="rounded-full border border-matcha px-3 py-1.5 text-xs font-bold text-matcha-deep transition hover:bg-matcha hover:text-white disabled:opacity-50"
                  >
                    みんなのメモに共有
                  </SubmitButton>
                </form>
              )
            )}
          <form action={deleteConversationAction} className="shrink-0">
            <input type="hidden" name="conversationId" value={conversation.id} />
            <ConfirmSubmitButton
              confirmMessage={`会話「${conversation.title}」を削除します。やり取りと添付ファイルも消え、元に戻せません。よろしいですか？`}
              pendingLabel="削除中…"
              className="rounded-full border border-line px-3 py-1.5 text-xs font-bold text-inksoft transition hover:border-red-400 hover:text-red-600 disabled:opacity-50"
            >
              この会話を削除
            </ConfirmSubmitButton>
          </form>
          </div>
        )}
      </div>

      {error && <p className="banner-error mb-4">{error}</p>}

      <ChatPanel
        conversationId={conversationId}
        hasMessages={messages.length > 0}
        suggestions={suggestions}
        greetName={greetName}
        initialText={initialText}
      >
        {messages.map((m) => {
          const date = DATE_FMT.format(new Date(m.createdAt));
          const showDate = date !== lastDate;
          lastDate = date;
          const ref = m.referencedTaskEntryId
            ? referencedMap.get(m.referencedTaskEntryId)
            : null;

          return (
            <div key={m.id} className="space-y-5">
              {showDate && (
                <div className="flex items-center gap-3 pt-1">
                  <span className="h-px flex-1 bg-line" />
                  <span className="text-[11px] font-bold text-inkfaint">{date}</span>
                  <span className="h-px flex-1 bg-line" />
                </div>
              )}
              <ChatMessage
                role={m.role === "user" ? "user" : "assistant"}
                text={m.text}
                time={TIME_FMT.format(new Date(m.createdAt))}
                attachments={m.attachments.map((a) => ({
                  id: a.id,
                  filename: a.filename,
                }))}
                reference={ref ? { id: ref.id, title: ref.title } : null}
              />
            </div>
          );
        })}
      </ChatPanel>
    </div>
  );
}
