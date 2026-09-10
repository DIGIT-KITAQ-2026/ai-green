import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { computeQuestionTrend } from "@/lib/questionTrends";
import { Icon } from "@/components/IconSprite";
import Mascot from "@/components/Mascot";
import PageTitle from "@/components/PageTitle";
import QuestionTrendChart from "@/components/QuestionTrendChart";
import ConversationList, {
  ConversationSummary,
} from "@/components/ConversationList";

/**
 * チャットのホーム画面。
 * 上半分で新しいチャットを始め、下半分から過去のチャットを再開する。
 * 個々の会話は /chat/[id] で開く。
 * 一番下には自分の質問傾向グラフ、adminの場合はさらにチームメンバーごとの
 * 質問傾向グラフを積み重ねて表示する。
 */
export default async function ChatHomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const [conversationRes, entryRes, myTrend, memberRes] = await Promise.all([
    // カードに出すのは最後のやり取りだけなので、本文は1件に絞って持ってくる。
    // 件数は別に数える（同じテーブルを件数と本文の両方で埋め込むと、
    // 並べ替えと集計がぶつかってPostgRESTがエラーになるため）。
    supabase
      .from("conversations")
      .select(
        "id, title, updatedAt:updated_at, messages:chat_messages(text), sharedNote:shared_notes(id)",
      )
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .order("created_at", { referencedTable: "chat_messages", ascending: false })
      .limit(1, { referencedTable: "chat_messages" }),
    // 質問例は実際に登録されている業務内容から作る。
    // 何も登録されていないときは例を出さない（答えられない質問を勧めないため）。
    user.teamId
      ? supabase
          .from("task_entries")
          .select("title")
          .eq("team_id", user.teamId)
          .order("created_at", { ascending: false })
          .limit(4)
      : supabase
          .from("task_entries")
          .select("title")
          .order("created_at", { ascending: false })
          .limit(4),
    computeQuestionTrend(user.id),
    // admin専用: 同じチームのmember一覧（メンバーごとの質問傾向グラフ用）。
    user.role === "admin" && user.teamId
      ? supabase
          .from("profiles")
          .select("id, name")
          .eq("team_id", user.teamId)
          .eq("role", "member")
          .order("name")
      : Promise.resolve({ data: [] }),
  ]);

  // 会話ごとのやり取りの件数。自分の分しか読めないので、まとめて数える。
  const { data: messageRows } = await supabase
    .from("chat_messages")
    .select("conversation_id")
    .eq("user_id", user.id);
  const messageCountByConversation = new Map<string, number>();
  for (const m of messageRows ?? []) {
    messageCountByConversation.set(
      m.conversation_id,
      (messageCountByConversation.get(m.conversation_id) ?? 0) + 1,
    );
  }

  const teamMembers = memberRes.data ?? [];
  const memberTrends =
    teamMembers.length > 0
      ? await Promise.all(
          teamMembers.map(async (m) => ({
            member: m,
            trend: await computeQuestionTrend(m.id),
          })),
        )
      : [];

  const summaries: ConversationSummary[] = (conversationRes.data ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    updatedAt: new Date(c.updatedAt),
    messageCount: messageCountByConversation.get(c.id) ?? 0,
    lastMessage: c.messages[0]?.text ?? "",
    isShared: c.sharedNote !== null,
  }));

  const suggestions = (entryRes.data ?? []).map((e) => `${e.title}について教えて`);
  const greetName = user.name;

  return (
    <div>
      <PageTitle>チャット</PageTitle>

      {/* 上半分: 新しいチャットを始める */}
      <section className="rounded-tile border border-matcha-line bg-matcha-soft px-6 py-9 text-center">
        <Mascot size={132} circle={false} priority />
        <h2 className="mt-3 font-display text-xl font-black text-ink">
          何かお困りごとですか？
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-inksoft">
          {greetName}さん、わからないことを聞いてね。写真やPDFを送ってくれてもいいよ。
        </p>

        <Link href="/chat/new" className="btn-primary mt-6">
          <Icon name="plus" className="h-5 w-5" strokeWidth={2} />
          新しいチャットを始める
        </Link>

        {suggestions.length > 0 && (
          <div className="mt-7">
            <p className="mb-2.5 text-xs font-bold text-inkfaint">
              こんなことが聞けます
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <Link
                  key={s}
                  href={`/chat/new?q=${encodeURIComponent(s)}`}
                  className="rounded-full border border-matcha-line bg-white px-3.5 py-2 text-xs font-bold text-matcha-deep transition hover:border-matcha hover:bg-white/60"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 下半分: 過去のチャットを再開する */}
      <section className="mt-9">
        <div className="mb-4 flex items-baseline gap-2.5">
          <h2 className="section-title">これまでのチャット</h2>
          {summaries.length > 0 && (
            <span className="text-xs text-inkfaint">{summaries.length}件</span>
          )}
        </div>
        <ConversationList conversations={summaries} />
      </section>

      {/* 自分の質問傾向 */}
      <section className="mt-9">
        <div className="mb-4 flex items-baseline gap-2.5">
          <h2 className="section-title">自分の質問傾向</h2>
        </div>
        <QuestionTrendChart title="質問した業務内容の割合" trend={myTrend} />
      </section>

      {/* admin専用: 同じチームのmemberごとの質問傾向 */}
      {user.role === "admin" && (
        <section className="mt-9">
          <div className="mb-4 flex items-baseline gap-2.5">
            <h2 className="section-title">メンバーの質問傾向</h2>
            {memberTrends.length > 0 && (
              <span className="text-xs text-inkfaint">{memberTrends.length}人</span>
            )}
          </div>
          {memberTrends.length === 0 ? (
            <p className="rounded-tile border-2 border-dashed border-matcha-line bg-matcha-soft px-6 py-8 text-center text-sm leading-relaxed text-matcha-deep">
              同じチームに新人がまだいないようです。
            </p>
          ) : (
            <div className="flex flex-col gap-5">
              {memberTrends.map(({ member, trend }) => (
                <QuestionTrendChart
                  key={member.id}
                  title={`${member.name}さんの質問した業務内容の割合`}
                  trend={trend}
                  emptyMessage={`${member.name}さんはまだ質問していません。`}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
