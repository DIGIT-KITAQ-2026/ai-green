"use client";

import { useFormStatus } from "react-dom";

/**
 * 取り消せない操作用の送信ボタン。押すと確認ダイアログを出し、
 * キャンセルされたら送信しない。
 */
export default function ConfirmSubmitButton({
  confirmMessage,
  children,
  pendingLabel,
  className,
}: {
  confirmMessage: string;
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
      }}
      className={className}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
