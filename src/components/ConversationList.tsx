import Link from "next/link";
import { deleteConversationAction } from "@/app/actions/chat";
import ConfirmSubmitButton from "./ConfirmSubmitButton";

export type ConversationSummary = {
  id: string;
  title: string;
  updatedAt: Date;
  messageCount: number;
  /** 一覧で中身を思い出せるように、最後のやり取りを少しだけ見せる。 */
  lastMessage: string;
};

const DATE_FMT = new Intl.DateTimeFormat("ja-JP", {
  month: "numeric",
  day: "numeric",
});
const TIME_FMT = new Intl.DateTimeFormat("ja-JP", {
  hour: "2-digit",
  minute: "2-digit",
});

/** 同じ日なら時刻、違う日なら日付を出す。 */
function stamp(d: Date): string {
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  return sameDay ? `今日 ${TIME_FMT.format(d)}` : DATE_FMT.format(d);
}

/**
 * チャットのホーム画面に並べる、過去の会話のカード一覧。
 * 選ぶとその会話を開いて続きから話せる。右上の × でその場から削除もできる。
 *
 * 削除ボタンはカードのリンクの中に置けない（aの中にformは入れられない）ので、
 * 兄弟要素として重ねている。
 */
export default function ConversationList({
  conversations,
}: {
  conversations: ConversationSummary[];
}) {
  if (conversations.length === 0) {
    return (
      <p className="rounded-tile border-2 border-dashed border-matcha-line bg-matcha-soft px-6 py-10 text-center text-sm leading-relaxed text-matcha-deep">
        まだチャットの履歴がありません。
        <br />
        上の「新しいチャットを始める」から質問してみてね。
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {conversations.map((c) => (
        <li key={c.id} className="relative">
          <Link
            href={`/chat/${c.id}`}
            className="flex h-full flex-col gap-2 rounded-tile border border-line bg-surface p-4 pr-11 transition hover:-translate-y-0.5 hover:border-matcha hover:shadow-lift"
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

          <form action={deleteConversationAction} className="absolute right-2 top-2">
            <input type="hidden" name="conversationId" value={c.id} />
            <ConfirmSubmitButton
              confirmMessage={`会話「${c.title}」を削除します。やり取りと添付ファイルも消え、元に戻せません。よろしいですか？`}
              pendingLabel="…"
              className="flex h-7 w-7 items-center justify-center rounded-full text-inkfaint transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              <span aria-hidden="true">×</span>
              <span className="sr-only">{c.title} を削除</span>
            </ConfirmSubmitButton>
          </form>
        </li>
      ))}
    </ul>
  );
}
