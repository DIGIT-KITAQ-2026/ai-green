"use client";

import { useFormStatus } from "react-dom";

/** フォーム送信中は文言を変えてボタンを無効化する共通の送信ボタン。 */
export default function SubmitButton({
  children,
  pendingLabel,
  className = "btn-primary",
}: {
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}
