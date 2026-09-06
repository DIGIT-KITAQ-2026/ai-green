/**
 * 先輩・管理者がチャットに残したフィードバックの表示。
 * 通常のAI回答の吹き出し(ChatMessage)と区別できるよう、
 * 点線の枠と黄色(folder)のアクセントにしている。
 * member本人の画面・admin側の閲覧画面の両方から使う。
 */
export default function FeedbackNote({
  authorName,
  text,
  time,
}: {
  authorName: string;
  text: string;
  time?: string;
}) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[78%] rounded-2xl rounded-bl-sm border-2 border-dashed border-folder bg-white px-4 py-3">
        <p className="mb-1 text-[11px] font-bold text-folder-deep">
          💬 {authorName}からのコメント
        </p>
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">
          {text}
        </p>
        {time && <p className="mt-1.5 text-[10px] text-inkfaint">{time}</p>}
      </div>
    </div>
  );
}
