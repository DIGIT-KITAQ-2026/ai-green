import Link from "next/link";
import { prisma } from "@/lib/db";
import { Icon } from "./IconSprite";

/**
 * 業務内容画面・マニュアル画面（一覧）で共用するレイアウト。
 * 「チームごとに分類されている」という手書きメモに対応し、
 * チームタブで絞り込めるようにしている。
 */
export default async function EntryListPage({
  type,
  newHref,
  detailBasePath,
  selectedTeamId,
}: {
  type: "task" | "manual";
  newHref: string;
  detailBasePath: string;
  selectedTeamId?: string;
}) {
  const label = type === "manual" ? "マニュアル" : "業務内容";
  const brandLabel = type === "manual" ? "New Tea" : "New Tea";

  const [teams, entries] = await Promise.all([
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    prisma.taskEntry.findMany({
      where: {
        type,
        ...(selectedTeamId ? { teamId: selectedTeamId } : {}),
      },
      include: { team: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="card flex min-h-[70vh] overflow-hidden">
      <div className="flex w-[26%] min-w-[140px] flex-col items-center justify-center gap-3 border-r border-line bg-surface px-4 py-10 text-center">
        <Icon name="cup" className="h-14 w-14 text-tea" />
        <span className="font-display text-lg font-semibold">{brandLabel}</span>
      </div>

      <div className="flex-1 p-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h1 className="inline-block border-b-2 border-tea pb-1 text-xl font-semibold">
            {label}
          </h1>
          <Link href={newHref} className="btn-primary">
            <Icon name="plus" className="h-4 w-4" />
            新規
          </Link>
        </div>

        <div className="mb-6 flex flex-wrap gap-2 text-xs">
          <Link
            href={detailBasePath === "/tasks" ? "/tasks" : "/manual"}
            className={`rounded-full border px-3 py-1 font-bold ${
              !selectedTeamId
                ? "border-tea bg-tea-soft text-tea-strong"
                : "border-line text-inksoft hover:border-pencil"
            }`}
          >
            すべて
          </Link>
          {teams.map((team) => (
            <Link
              key={team.id}
              href={`${detailBasePath === "/tasks" ? "/tasks" : "/manual"}?team=${team.id}`}
              className={`rounded-full border px-3 py-1 font-bold ${
                selectedTeamId === team.id
                  ? "border-tea bg-tea-soft text-tea-strong"
                  : "border-line text-inksoft hover:border-pencil"
              }`}
            >
              {team.name}
            </Link>
          ))}
        </div>

        {entries.length === 0 ? (
          <p className="rounded-lg border border-dashed border-pencil bg-surface2 px-4 py-10 text-center text-sm text-inkfaint">
            まだ{label}が登録されていません。「＋新規」から最初の1件を登録してみましょう。
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {entries.map((entry) => (
              <Link
                key={entry.id}
                href={`${detailBasePath}/${entry.id}`}
                className="flex flex-col gap-2 rounded-lg border border-line bg-surface2 p-4 transition hover:border-tea hover:bg-tea-soft/60"
              >
                <div className="flex items-center gap-2">
                  <Icon name="folder" className="h-5 w-5 shrink-0 text-tea" />
                  <span className="font-bold leading-tight">{entry.title}</span>
                </div>
                <span className="font-mono text-[11px] text-inkfaint">
                  {entry.team.name}
                </span>
                <p className="line-clamp-3 text-xs text-inksoft">{entry.summary}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
