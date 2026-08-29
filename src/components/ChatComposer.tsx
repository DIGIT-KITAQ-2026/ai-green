"use client";

import { useState } from "react";
import { sendChatMessageAction } from "@/app/actions/chat";
import { Icon } from "./IconSprite";
import Dropzone from "./Dropzone";
import SubmitButton from "./SubmitButton";

export default function ChatComposer() {
  const [showAttach, setShowAttach] = useState(false);

  return (
    <form action={sendChatMessageAction} className="flex flex-col gap-2">
      {showAttach && (
        <div>
          <Dropzone compact />
        </div>
      )}
      <div className="flex items-center gap-2 rounded-full border border-line bg-surface px-2 py-1.5">
        <button
          type="button"
          onClick={() => setShowAttach((v) => !v)}
          aria-label="画像・PDFを添付する"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition ${
            showAttach ? "bg-tea text-white" : "bg-tea-soft text-tea-strong"
          }`}
        >
          <Icon name="plus" className="h-5 w-5" />
        </button>
        <input
          type="text"
          name="text"
          placeholder="ここに書くよ…"
          className="flex-1 bg-transparent px-1 text-sm outline-none placeholder:font-hand placeholder:text-inkfaint"
        />
        <SubmitButton
          pendingLabel="送信中…"
          className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-tea px-4 text-sm font-bold text-white transition hover:bg-tea-strong disabled:opacity-50"
        >
          <Icon name="send" className="h-4 w-4" />
          送信
        </SubmitButton>
      </div>
    </form>
  );
}
