import Link from "next/link";
import { prisma } from "@/lib/db";
import ChatMessage from "./ChatMessage";
import FeedbackNote from "./FeedbackNote";
import SubmitButton from "./SubmitButton";
import { Icon } from "./IconSprite";
import { createChatFeedbackAction } from "@/app/actions/feedback";

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
 * adminがmemberの会話を閲覧する画面。
 * ChatViewと違い送信欄は無く、代わりにコメント(フィードバック)を送るフォームを置く。
 * memberの吹き出しは自分のチャット(ChatView)と同じ見た目にして、
 * 何を見ているかが分かりやすいようにしている。
 */
export default async function AdminChatView({
  member,
  conversationId,
  conversationTitle,
  error,
}: {
  member: { id: string; name: string; nickname: string | null };
  conversationId: string;
  conversationTitle: string;
  error?: string;
}) {
  const [messages, feedbacks] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { conversationId },
      include: { attachments: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.chatFeedback.findMany({
      where: { conversationId },
      include: { admin: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const referencedIds = messages
    .map((m) => m.referencedTaskEntryId)
    .filter((id): id is string => Boolean(id));
  const referenced = referencedIds.length
    ? await prisma.taskEntry.findMany({ where: { id: { in: referencedIds } } })
    : [];
  const referencedMap = new Map(referenced.map((r) => [r.id, r]));

  type TimelineItem =
    | { kind: "message"; at: Date; message: (typeof messages)[number] }
    | { kind: "feedback"; at: Date; feedback: (typeof feedbacks)[number] };
  const timeline: TimelineItem[] = [
    ...messages.map((m) => ({ kind: "message" as const, at: m.createdAt, message: m })),
    ...feedbacks.map((f) => ({ kind: "feedback" as const, at: f.createdAt, feedback: f })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  const memberName = member.nickname ?? member.name;
  let lastDate = "";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={`/chat/team/${member.id}`}
            className="flex shrink-0 items-center gap-1 text-xs font-bold text-inksoft transition hover:text-matcha"
          >
            <Icon name="back" className="h-4 w-4" />
            {memberName}さんの一覧
          </Link>
          <span className="h-4 w-px shrink-0 bg-line" />
          <div className="min-w-0">
            <h1 className="truncate font-display text-base font-bold text-ink">
              {conversationTitle}
            </h1>
            <p className="text-[11px] text-inkfaint">
              {memberName}さんの質問を閲覧しています（閲覧のみ・下からコメントを送れます）
            </p>
          </div>
        </div>
      </div>

      {error && <p className="banner-error mb-4">{error}</p>}

      <div className="space-y-5 py-1">
        {timeline.map((item) => {
          const date = DATE_FMT.format(item.at);
          const showDate = date !== lastDate;
          lastDate = date;
          const key = item.kind === "message" ? item.message.id : item.feedback.id;

          return (
            <div key={key} className="space-y-5">
              {showDate && (
                <div className="flex items-center gap-3 pt-1">
                  <span className="h-px flex-1 bg-line" />
                  <span className="text-[11px] font-bold text-inkfaint">{date}</span>
                  <span className="h-px flex-1 bg-line" />
                </div>
              )}
              {item.kind === "message" ? (
                <ChatMessage
                  role={item.message.role === "user" ? "user" : "assistant"}
                  text={item.message.text}
                  time={TIME_FMT.format(item.message.createdAt)}
                  attachments={item.message.attachments.map((a) => ({
                    id: a.id,
                    filename: a.filename,
                  }))}
                  reference={
                    item.message.referencedTaskEntryId
                      ? (() => {
                          const ref = referencedMap.get(item.message.referencedTaskEntryId!);
                          return ref ? { id: ref.id, title: ref.title } : null;
                        })()
                      : null
                  }
                />
              ) : (
                <FeedbackNote
                  authorName={item.feedback.admin.nickname ?? item.feedback.admin.name}
                  text={item.feedback.text}
                  time={TIME_FMT.format(item.feedback.createdAt)}
                />
              )}
            </div>
          );
        })}
      </div>

      <form
        action={createChatFeedbackAction}
        className="sticky bottom-2 mt-6 rounded-tile border border-line bg-surface p-4 shadow-lift"
      >
        <input type="hidden" name="conversationId" value={conversationId} />
        <input type="hidden" name="memberId" value={member.id} />
        <label className="field-label mb-1.5 block" htmlFor="feedback-text">
          {memberName}さんへのコメント
        </label>
        <textarea
          id="feedback-text"
          name="text"
          rows={3}
          required
          placeholder="この質問への補足やアドバイスを書いてね"
          className="w-full resize-none rounded-xl border border-line bg-paper px-3 py-2 text-sm leading-relaxed outline-none focus:border-matcha"
        />
        <div className="mt-2 flex justify-end">
          <SubmitButton pendingLabel="送信中…" className="btn-primary">
            コメントを送る
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
