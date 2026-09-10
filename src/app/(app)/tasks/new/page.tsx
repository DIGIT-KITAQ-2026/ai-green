import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RegisterForm from "@/components/RegisterForm";

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") {
    redirect(`/tasks?error=${encodeURIComponent("業務内容の登録は先輩・管理者のみ行えます")}`);
  }

  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: teams } = await supabase.from("teams").select("id, name").order("name");

  return (
    <RegisterForm
      teams={teams ?? []}
      defaultTeamId={user.teamId ?? undefined}
      errorMessage={error}
    />
  );
}
