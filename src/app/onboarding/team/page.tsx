import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { selectTeamAction } from "@/app/actions/onboarding";
import AuthCard from "@/components/AuthCard";
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
  const teams = await prisma.team.findMany({ orderBy: { name: "asc" } });

  return (
    <AuthCard>
      <p className="mb-6 text-lg">所属を選択してください。</p>

      {error && <p className="banner-error mb-4">{error}</p>}

      <form action={selectTeamAction} className="flex flex-col gap-5">
        <TeamPicker teams={teams} />
        <button type="submit" className="btn-primary">
          決定
        </button>
      </form>
    </AuthCard>
  );
}
