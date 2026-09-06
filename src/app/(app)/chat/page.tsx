import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Icon } from "@/components/IconSprite";
import Mascot from "@/components/Mascot";
import PageTitle from "@/components/PageTitle";
import ConversationList, {
  ConversationSummary,
} from "@/components/ConversationList";

/**
 * チャットのホーム画面。
 * 上半分で新しいチャットを始め、下半分から過去のチャットを再開する。
 * 個々の会話は /chat/[id] で開く。
 */
export default async function ChatHomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [conversations, recentEntries, teamMembers] = await Promise.all([
    prisma.conversation.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { messages: true } },
        // カードに出す「最後のやり取り」の分だけ取る。
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { text: true },
        },
      },
    }),
    // 質問例は実際に登録されている業務内容から作る。
    // 何も登録されていないときは例を出さない（答えられない質問を勧めないため）。
    prisma.taskEntry.findMany({
      where: user.teamId ? { teamId: user.teamId } : {},
      orderBy: { createdAt: "desc" },
      take: 4,
      select: { title: true },
    }),
    // admin専用: 同じチームのmemberの一覧（チャットの閲覧・コメント用）。
    user.role === "admin" && user.teamId
      ? prisma.user.findMany({
          where: { teamId: user.teamId, role: "member" },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const summaries: ConversationSummary[] = conversations.map((c) => ({
    id: c.id,
    title: c.title,
    updatedAt: c.updatedAt,
    messageCount: c._count.messages,
    lastMessage: c.messages[0]?.text ?? "",
  }));

  const suggestions = recentEntries.map((e) => `${e.title}について教えて`);
  const greetName = user.nickname ?? user.name;

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

      {/* 下下部: admin専用。同じチームのmemberのチャットを見に行く導線。 */}
      {user.role === "admin" && (
        <section className="mt-9">
          <div className="mb-4 flex items-baseline gap-2.5">
            <h2 className="section-title">チームメンバーのチャット</h2>
            {teamMembers.length > 0 && (
              <span className="text-xs text-inkfaint">{teamMembers.length}人</span>
            )}
          </div>
          {teamMembers.length === 0 ? (
            <p className="rounded-tile border-2 border-dashed border-matcha-line bg-matcha-soft px-6 py-8 text-center text-sm leading-relaxed text-matcha-deep">
              同じチームに新人がまだいないようです。
            </p>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {teamMembers.map((m) => (
                <Link
                  key={m.id}
                  href={`/chat/team/${m.id}`}
                  className="flex items-center gap-1.5 rounded-full border border-matcha-line bg-white px-3.5 py-2 text-xs font-bold text-matcha-deep transition hover:border-matcha hover:bg-matcha-soft"
                >
                  <Icon name="person" className="h-4 w-4" />
                  {m.nickname ?? m.name}さんのチャットを見る
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
