"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { REWARDS, isUnlocked, levelInfo } from "@/lib/rewards";

/**
 * 使うキャラクターを切り替える。
 * まだ解放していないものは選べないよう、サーバー側でもレベルを確認する。
 */
export async function selectRewardAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const rewardId = String(formData.get("rewardId") ?? "");
  const reward = REWARDS.find((r) => r.id === rewardId);
  if (!reward) redirect("/character");

  const { level } = levelInfo(user!.xp);
  if (!isUnlocked(reward!, level)) {
    redirect(
      `/character?error=${encodeURIComponent(
        `「${reward!.name}」はレベル${reward!.requiredLevel}で解放されます`,
      )}`,
    );
  }

  await prisma.user.update({
    where: { id: user!.id },
    data: { selectedRewardId: reward!.id },
  });

  revalidatePath("/character");
  revalidatePath("/", "layout");
  redirect(`/character?selected=${encodeURIComponent(reward!.name)}`);
}
