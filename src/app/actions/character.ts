"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ selected_reward_id: reward!.id })
    .eq("id", user!.id);

  revalidatePath("/character");
  revalidatePath("/", "layout");
  redirect(`/character?selected=${encodeURIComponent(reward!.name)}`);
}
