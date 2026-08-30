"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { sendChatMessageAction } from "@/app/actions/chat";
import ChatMessage from "./ChatMessage";
import Mascot from "./Mascot";
import { Icon } from "./IconSprite";

/**
 * チャット画面のインタラクション部分。
 *
 * AIの回答には5〜10秒かかるため、送信した瞬間に自分の吹き出しと
 * 「考え中」を表示する（楽観的表示）。これがないと、送信してから
 * ページが再描画されるまで画面が固まったように見える。
 *
 * 過去ログはサーバー側で描画したものを children として受け取り、
 * この中では送信中の分だけを追加で描画する。
 */
export default function ChatPanel({
  children,
  conversationId,
  hasMessages,
  suggestions,
  greetName,
  initialText = "",
}: {
  children: React.ReactNode;
  /** 続きを書き込む会話。null なら送信時に新しい会話が作られる。 */
  conversationId: string | null;
  hasMessages: boolean;
  suggestions: string[];
  greetName: string;
  /** 質問例から始めたときに、あらかじめ入力欄へ入れておく文章。 */
  initialText?: string;
}) {
  return (
    <form
      action={sendChatMessageAction}
      className="flex min-h-[calc(100vh-12rem)] flex-col"
    >
      <input type="hidden" name="conversationId" value={conversationId ?? ""} />
      <ChatBody
        hasMessages={hasMessages}
        suggestions={suggestions}
        greetName={greetName}
      >
        {children}
      </ChatBody>
      <Composer
        suggestions={suggestions}
        hasMessages={hasMessages}
        initialText={initialText}
      />
    </form>
  );
}

/** 送信中のFormDataから、これから送られる添付ファイル名を取り出す。 */
function pendingFileNames(data: FormData | null): string[] {
  if (!data) return [];
  return data
    .getAll("files")
    .filter((v): v is File => v instanceof File && v.size > 0)
    .map((f) => f.name);
}

function ChatBody({
  children,
  hasMessages,
  suggestions,
  greetName,
}: {
  children: React.ReactNode;
  hasMessages: boolean;
  suggestions: string[];
  greetName: string;
}) {
  const { pending, data } = useFormStatus();

  const pendingText = pending ? String(data?.get("text") ?? "") : "";
  const pendingFiles = pending ? pendingFileNames(data ?? null) : [];

  // チャットは最新が下にあるので、開いた直後と送信直後は最下部を見せる。
  // 入力欄が sticky で最下部に重なるため、要素へのscrollIntoViewではなく
  // ページ自体を末尾まで送る（そうしないと最新の1件が入力欄の裏に隠れる）。
  useEffect(() => {
    const el = document.scrollingElement ?? document.documentElement;
    el.scrollTo({ top: el.scrollHeight, behavior: pending ? "smooth" : "auto" });
  }, [pending]);

  const showEmptyState = !hasMessages && !pending;

  // 新しいチャットを書き始める画面。ホーム(/chat)の上半分と役割が違うので、
  // マスコットは控えめにして入力欄へ視線が向くようにしている。
  if (showEmptyState) {
    return (
      <div className="flex flex-1 flex-col items-center justify-end gap-5 pb-6 pt-10 text-center">
        <Mascot size={104} circle={false} priority />
        <p className="text-sm leading-relaxed text-inksoft">
          {greetName}さん、下の入力欄に質問を書いてね。
          <br />
          写真やPDFを送ってくれてもいいよ。
        </p>

        {suggestions.length > 0 && (
          <div className="w-full max-w-xl">
            <p className="mb-2.5 text-xs font-bold text-inkfaint">
              押すとそのまま質問できます
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <SuggestionChip key={s} text={s} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-5 py-1" role="log" aria-live="polite">
      {children}

      {pending && (
        <>
          <ChatMessage
            role="user"
            text={pendingText}
            attachments={pendingFiles.map((n) => ({ id: n, filename: n }))}
            pending
          />
          <div className="flex items-end gap-2.5">
            <Mascot size={38} className="mb-1 bg-matcha-soft" />
            <div className="rounded-2xl rounded-bl-sm border border-matcha-line bg-matcha-soft px-4 py-3.5">
              <span className="sr-only">回答を作成しています</span>
              <span className="flex gap-1.5" aria-hidden="true">
                <Dot delay="0ms" />
                <Dot delay="150ms" />
                <Dot delay="300ms" />
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="h-2 w-2 animate-bounce rounded-full bg-matcha/70"
      style={{ animationDelay: delay, animationDuration: "1s" }}
    />
  );
}

/**
 * 質問例のチップ。押すと入力欄に文章を入れてそのまま送信する。
 * 同じ form の中にあるので、DOM経由で入力欄を引ける。
 */
function SuggestionChip({ text }: { text: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={(e) => {
        const form = e.currentTarget.form;
        const field = form?.elements.namedItem("text");
        if (!form || !(field instanceof HTMLTextAreaElement)) return;
        field.value = text;
        form.requestSubmit();
      }}
      className="rounded-full border border-matcha-line bg-white px-3.5 py-2 text-xs font-bold text-matcha-deep transition hover:border-matcha hover:bg-matcha-soft disabled:opacity-50"
    >
      {text}
    </button>
  );
}

function Composer({
  suggestions,
  hasMessages,
  initialText,
}: {
  suggestions: string[];
  hasMessages: boolean;
  initialText: string;
}) {
  const { pending } = useFormStatus();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isOver, setIsOver] = useState(false);
  const [hasText, setHasText] = useState(initialText.trim().length > 0);

  // 送信が始まった時点で FormData は確定しているので、入力欄と添付チップを空にする。
  // 送信中の内容は楽観表示の吹き出しに出ているため、ここに残すと二重に見えてしまう。
  useEffect(() => {
    if (!pending) return;
    if (textRef.current) {
      textRef.current.value = "";
      textRef.current.style.height = "auto";
    }
    setFiles([]);
    setHasText(false);
  }, [pending]);

  // 新しいチャットを開いたときは、すぐ書き始められるよう入力欄にカーソルを置く。
  // 質問例から来た場合は高さも合わせ、文末にカーソルを置いて書き足せるようにする。
  useEffect(() => {
    const el = textRef.current;
    if (!el || hasMessages) return;
    if (initialText) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [initialText, hasMessages]);

  /** state のファイル一覧を <input type=file> に反映する（送信されるのはこちら）。 */
  function syncToInput(next: File[]) {
    const dt = new DataTransfer();
    next.forEach((f) => dt.items.add(f));
    if (fileInputRef.current) fileInputRef.current.files = dt.files;
    setFiles(next);
  }

  function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list);
    const merged = [...files];
    for (const f of incoming) {
      if (!merged.some((m) => m.name === f.name && m.size === f.size)) merged.push(f);
    }
    syncToInput(merged);
  }

  function autoGrow(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  const canSend = (hasText || files.length > 0) && !pending;

  return (
    <div className="sticky bottom-0 z-10 -mx-1 bg-paper px-1 pb-2 pt-3">
      {/* 会話が続いているときは、入力欄の上に質問例を小さく出す */}
      {hasMessages && !pending && suggestions.length > 0 && (
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
          {suggestions.slice(0, 3).map((s) => (
            <span key={s} className="shrink-0">
              <SuggestionChip text={s} />
            </span>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {files.map((f) => (
            <span
              key={`${f.name}-${f.size}`}
              className="flex items-center gap-1.5 rounded-full border border-matcha-line bg-white py-1 pl-3 pr-1.5 text-xs"
            >
              <span className="max-w-[12rem] truncate">📎 {f.name}</span>
              <button
                type="button"
                aria-label={`${f.name} を添付から外す`}
                onClick={() => syncToInput(files.filter((x) => x !== f))}
                className="flex h-5 w-5 items-center justify-center rounded-full text-inkfaint transition hover:bg-matcha-soft hover:text-ink"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsOver(true);
        }}
        onDragLeave={() => setIsOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsOver(false);
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        }}
        className={`flex items-end gap-2 rounded-3xl border-2 bg-surface py-2 pl-2 pr-2 transition ${
          isOver ? "border-matcha bg-matcha-soft" : "border-ink/80"
        }`}
      >
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={pending}
          aria-label="画像・PDFを添付する"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-matcha-soft text-matcha-deep transition hover:bg-matcha hover:text-white disabled:opacity-50"
        >
          <Icon name="plus" className="h-5 w-5" strokeWidth={2} />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          name="files"
          multiple
          accept="image/png,image/jpeg,application/pdf"
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />

        <textarea
          ref={textRef}
          name="text"
          rows={1}
          defaultValue={initialText}
          disabled={pending}
          placeholder={isOver ? "ここにドロップしてね" : "ここに書いてね…"}
          onChange={(e) => {
            setHasText(e.target.value.trim().length > 0);
            autoGrow(e.target);
          }}
          onKeyDown={(e) => {
            // Enterで送信、Shift+Enterで改行。日本語変換の確定Enterは送信しない。
            if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
            e.preventDefault();
            if (!canSend) return;
            e.currentTarget.form?.requestSubmit();
          }}
          className="max-h-40 flex-1 resize-none self-center bg-transparent px-1 py-1.5 text-sm leading-relaxed outline-none placeholder:font-hand placeholder:text-inkfaint disabled:opacity-60"
        />

        <button
          type="submit"
          disabled={!canSend}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-accent px-5 text-sm font-bold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Icon name="send" className="h-4 w-4" />
          {pending ? "送信中…" : "送信"}
        </button>
      </div>

      {/* キーボード操作の説明なので、狭い画面では出さない（折り返して読みにくくなるため）。 */}
      <p className="mt-1.5 hidden px-2 text-[10px] text-inkfaint sm:block">
        Enterで送信 ／ Shift+Enterで改行 ／ 画像・PDFはドラッグ＆ドロップでも添付できます
      </p>
    </div>
  );
}
