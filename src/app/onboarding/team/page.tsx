import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { selectTeamAction } from "@/app/actions/onboarding";
import AuthCard from "@/components/AuthCard";
import PageTitle from "@/components/PageTitle";
import TeamPicker from "@/components/TeamPicker";

export default async function TeamOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.teamId) redirect("/");

  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: teams } = await supabase.from("teams").select("id, name").order("name");

  return (
    <AuthCard>
      <PageTitle>所属選択</PageTitle>

      <p className="mb-5 text-inksoft">所属部署を選択してください</p>

      {error && <p className="banner-error mb-5">{error}</p>}

      <form action={selectTeamAction} className="flex flex-col gap-5">
        <TeamPicker teams={teams ?? []} defaultTeamId={teams?.[0]?.id} />
        <button type="submit" className="btn-primary self-end px-12">
          決定
        </button>
      </form>
    </AuthCard>
  );
}
