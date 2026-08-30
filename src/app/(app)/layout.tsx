import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import SideNav from "@/components/SideNav";
import { levelInfo, rewardById } from "@/lib/rewards";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.teamId) redirect("/onboarding/team");

  const displayName = user.nickname
    ? `${user.nickname}（${user.name}）`
    : user.name;

  const reward = rewardById(user.selectedRewardId);
  const info = levelInfo(user.xp);

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <SideNav
        displayName={displayName}
        mascotAccent={reward.accent}
        mascotSrc={reward.image}
        level={{
          level: info.level,
          totalXp: info.totalXp,
          progress: info.progress,
          isMax: info.isMax,
          remaining: info.neededXp - info.currentXp,
        }}
      />
      <main className="min-w-0 flex-1 px-5 py-8 sm:px-10 sm:py-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
