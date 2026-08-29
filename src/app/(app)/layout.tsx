import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import TopNav from "@/components/TopNav";

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

  return (
    <div className="min-h-screen">
      <TopNav displayName={displayName} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
