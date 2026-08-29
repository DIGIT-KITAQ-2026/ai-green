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

  const { error } = await searchParams;
  const teams = await prisma.team.findMany({ orderBy: { name: "asc" } });

  return (
    <RegisterForm
      type="task"
      teams={teams}
      defaultTeamId={user.teamId ?? undefined}
      backHref="/tasks"
      errorMessage={error}
    />
  );
}
