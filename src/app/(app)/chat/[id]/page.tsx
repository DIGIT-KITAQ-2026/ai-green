import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ChatView from "@/components/ChatView";

/** 過去の会話を開いて続きから話す画面。 */
export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const { error } = await searchParams;

  // 他人の会話は開けないよう、必ず userId とセットで確認する。
  const supabase = await createClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!conversation) notFound();

  return <ChatView user={user} conversationId={conversation.id} error={error} />;
}
