import Link from "next/link";
import Mascot from "./Mascot";

export type ChatBubbleAttachment = {
  id: string;
  filename: string;
};

/**
 * チャット1件分の吹き出し。新人（右・青）とマスコット（左・抹茶色）で
 * 向きと色を変え、マスコット側には根拠にした業務内容へのリンクを添える。
 */
export default function ChatMessage({
  role,
  text,
  time,
  attachments = [],
  reference,
  pending = false,
}: {
  role: "user" | "assistant";
  text: string;
  time?: string;
  attachments?: ChatBubbleAttachment[];
  reference?: { id: string; title: string } | null;
  /** 送信中の楽観表示。時刻を出さず、少し淡く見せる。 */
  pending?: boolean;
}) {
  const isUser = role === "user";

  return (
    <div
      className={`flex items-end gap-2.5 ${isUser ? "justify-end" : "justify-start"} ${
        pending ? "opacity-70" : ""
      }`}
    >
      {!isUser && <Mascot size={38} className="mb-5 bg-matcha-soft" />}

      <div className={`flex max-w-[78%] flex-col ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "rounded-br-sm bg-accent text-white"
              : "rounded-bl-sm border border-matcha-line bg-matcha-soft text-ink"
          }`}
        >
          {text && <p className="whitespace-pre-wrap break-words">{text}</p>}

          {attachments.length > 0 && (
            <div className={`flex flex-wrap gap-1.5 ${text ? "mt-2" : ""}`}>
              {attachments.map((a) => (
                <a
                  key={a.id}
                  href={`/api/files/${a.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className={`max-w-[14rem] truncate rounded-full px-2.5 py-1 text-[11px] ${
                    isUser
                      ? "border border-white/40 bg-white/10 hover:bg-white/20"
                      : "border border-matcha-line bg-white hover:bg-matcha-soft"
                  }`}
                >
                  📎 {a.filename}
                </a>
              ))}
            </div>
          )}
        </div>

        <div
          className={`mt-1 flex items-center gap-2 px-1 ${
            isUser ? "flex-row-reverse" : "flex-row"
          }`}
        >
          {time && <span className="text-[10px] text-inkfaint">{time}</span>}
          {reference && (
            <Link
              href={`/tasks/${reference.id}`}
              className="max-w-[16rem] truncate rounded-full border border-matcha-line bg-white px-2.5 py-0.5 text-[11px] font-bold text-matcha-deep transition hover:border-matcha hover:bg-matcha-soft"
            >
              参照: {reference.title}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
