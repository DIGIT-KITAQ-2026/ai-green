import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
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
  const teams = await prisma.team.findMany({ orderBy: { name: "asc" } });

  return (
    <RegisterForm
      teams={teams}
      defaultTeamId={user.teamId ?? undefined}
      errorMessage={error}
    />
  );
}
