import Link from "next/link";
import { conversationStamp as stamp } from "@/lib/chatFormat";
import type { ConversationSummary } from "./ConversationList";

/**
 * adminがmemberの会話一覧を見るためのカード一覧。
 * ConversationListと見た目は揃えつつ、削除ボタンは出さない（閲覧・コメント専用のため）。
 */
export default function AdminConversationList({
  memberId,
  conversations,
}: {
  memberId: string;
  conversations: ConversationSummary[];
}) {
  if (conversations.length === 0) {
    return (
      <p className="rounded-tile border-2 border-dashed border-matcha-line bg-matcha-soft px-6 py-10 text-center text-sm leading-relaxed text-matcha-deep">
        まだチャットの履歴がありません。
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {conversations.map((c) => (
        <li key={c.id}>
          <Link
            href={`/chat/team/${memberId}/${c.id}`}
            className="flex h-full flex-col gap-2 rounded-tile border border-line bg-surface p-4 transition hover:-translate-y-0.5 hover:border-matcha hover:shadow-lift"
          >
            <p className="line-clamp-2 font-bold leading-snug text-ink">
              {c.title}
            </p>
            <p className="line-clamp-2 flex-1 text-xs leading-relaxed text-inksoft">
              {c.lastMessage}
            </p>
            <p className="text-[10px] text-inkfaint">
              {stamp(c.updatedAt)} ・ {c.messageCount}件のやりとり
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
