"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function selectTeamAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const teamId = String(formData.get("teamId") ?? "");
  const team = teamId ? await prisma.team.findUnique({ where: { id: teamId } }) : null;
  if (!team) {
    redirect(`/onboarding/team?error=${encodeURIComponent("所属を選択してください")}`);
  }

  await prisma.user.update({
    where: { id: user!.id },
    data: { teamId: team!.id },
  });

  redirect("/");
}
