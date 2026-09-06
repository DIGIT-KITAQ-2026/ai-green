import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Icon } from "./IconSprite";
import FolderCard from "./FolderCard";
import Mascot from "./Mascot";
import PageTitle from "./PageTitle";
import { buildTeamColorMap, DEFAULT_TEAM_COLOR } from "@/lib/teamColors";

/**
 * 業務内容の一覧。
 * もとは「業務内容」と「マニュアル」で画面が分かれていたが、
 * 機能が同じだったため1つに統合した。チームでの絞り込みは引き継いでいる。
 */
export default async function EntryListPage({
  selectedTeamId,
}: {
  selectedTeamId?: string;
}) {
  // 認可はレイアウトに任せず、データを取る直前で必ず確認する。
  // レイアウトの redirect はページの描画自体は止めないため、これが無いと
  // 未ログインでもレスポンス本文に業務内容が載ってしまう。
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [teams, entries] = await Promise.all([
    // 色は作成順に配るので、この順で取得する（表示は名前順に並べ替える）。
    prisma.team.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.taskEntry.findMany({
      where: selectedTeamId ? { teamId: selectedTeamId } : {},
      include: { team: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const colorByTeam = buildTeamColorMap(teams.map((t) => t.id));
  const teamsByName = [...teams].sort((a, b) => a.name.localeCompare(b.name, "ja"));

  return (
    <div>
      <PageTitle
        action={
          <Link href="/tasks/new" className="btn-primary">
            <Icon name="plus" className="h-5 w-5" />
            新規追加はこちら
          </Link>
        }
      >
        業務内容
      </PageTitle>

      <div className="mb-7 flex flex-wrap gap-2 text-xs">
        <Link
          href="/tasks"
          className={`rounded-full border-2 px-3.5 py-1.5 font-bold transition ${
            !selectedTeamId
              ? "border-matcha bg-matcha text-white"
              : "border-matcha-line text-inksoft hover:border-matcha"
          }`}
        >
          すべて
        </Link>
        {teamsByName.map((team) => (
          <Link
            key={team.id}
            href={`/tasks?team=${team.id}`}
            className={`flex items-center gap-1.5 rounded-full border-2 px-3.5 py-1.5 font-bold transition ${
              selectedTeamId === team.id
                ? "border-matcha bg-matcha text-white"
                : "border-matcha-line text-inksoft hover:border-matcha"
            }`}
          >
            {/* フォルダの色と対応させて、どの色がどのチームか分かるようにする */}
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: (colorByTeam.get(team.id) ?? DEFAULT_TEAM_COLOR).dot,
              }}
            />
            {team.name}
          </Link>
        ))}
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-tile border-2 border-dashed border-matcha-line bg-matcha-soft px-6 py-12 text-center">
          <Mascot size={92} />
          <p className="font-hand leading-relaxed text-matcha-deep">
            まだ業務内容が登録されていないみたい。
            <br />
            「新規追加はこちら」から最初の1件を教えてね！
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-5 gap-y-6 sm:grid-cols-3">
          {entries.map((entry) => (
            <FolderCard
              key={entry.id}
              href={`/tasks/${entry.id}`}
              title={entry.title}
              teamName={entry.team.name}
              summary={entry.summary}
              color={colorByTeam.get(entry.team.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
