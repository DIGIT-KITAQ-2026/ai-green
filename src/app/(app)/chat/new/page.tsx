import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import ChatView from "@/components/ChatView";

/**
 * 新しいチャットを書き始める画面。
 * 会話はまだ作らず、最初のメッセージを送った時点で作られる
 * （ここで離脱しても空の会話が履歴に残らないようにするため）。
 *
 * この静的セグメントは /chat/[id] より優先されるので、
 * cuid と衝突する心配はない。
 */
export default async function NewChatPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { error, q } = await searchParams;

  return (
    <ChatView
      user={user}
      conversationId={null}
      error={error}
      initialText={q ?? ""}
    />
  );
}
