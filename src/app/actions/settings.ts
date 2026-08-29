"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";

export async function updateNicknameAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const nickname = String(formData.get("nickname") ?? "").trim();
  await prisma.user.update({
    where: { id: user!.id },
    data: { nickname: nickname || null },
  });

  redirect("/settings?saved=nickname");
}

export async function updateTeamAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const teamId = String(formData.get("teamId") ?? "");
  const team = teamId ? await prisma.team.findUnique({ where: { id: teamId } }) : null;
  if (!team) redirect("/settings?error=所属を選択してください");

  await prisma.user.update({ where: { id: user!.id }, data: { teamId: team!.id } });
  redirect("/settings?saved=team");
}

export async function changePasswordAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");

  if (!(await verifyPassword(currentPassword, user!.passwordHash))) {
    redirect(`/settings?error=${encodeURIComponent("現在のパスワードが正しくありません")}`);
  }
  if (newPassword.length < 8) {
    redirect(`/settings?error=${encodeURIComponent("新しいパスワードは8文字以上にしてください")}`);
  }

  await prisma.user.update({
    where: { id: user!.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  redirect("/settings?saved=password");
}
