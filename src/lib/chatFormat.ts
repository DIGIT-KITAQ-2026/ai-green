/**
 * チャット一覧カードの日時表示。
 * ConversationList（自分の会話一覧）とAdminConversationList
 * （adminが見るmemberの会話一覧）の両方で使う共通ロジック。
 */

const DATE_FMT = new Intl.DateTimeFormat("ja-JP", {
  month: "numeric",
  day: "numeric",
});
const TIME_FMT = new Intl.DateTimeFormat("ja-JP", {
  hour: "2-digit",
  minute: "2-digit",
});

/** 同じ日なら時刻、違う日なら日付を出す。 */
export function conversationStamp(d: Date): string {
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  return sameDay ? `今日 ${TIME_FMT.format(d)}` : DATE_FMT.format(d);
}
