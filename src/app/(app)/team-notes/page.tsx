import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildTeamColorMap, DEFAULT_TEAM_COLOR } from "@/lib/teamColors";
import PageTitle from "@/components/PageTitle";
import Mascot from "@/components/Mascot";
import SharedNoteCard, { SharedNoteCardData } from "@/components/SharedNoteCard";

/**
 * みんなのメモ。チャットで分かったことをAIが要約し、チーム全員が読めるようにした場所。
 *
 * 並び順は「役に立った」の多い順。誰が押したかは表示しない。
 * 自分には不要と判断したメモは、自分の画面でだけ下にまとめる
 * （チームの共有物そのものは消さない）。
 */
export default async function TeamNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; shared?: string; team?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { error, shared, team: selectedTeamId } = await searchParams;

  const [notes, likedRows, hiddenRows, teams] = await Promise.all([
    user.teamId
      ? prisma.sharedNote.findMany({
          where: { teamId: user.teamId },
          orderBy: { createdAt: "desc" },
          include: {
            author: { select: { name: true } },
            _count: { select: { likes: true } },
          },
        })
      : Promise.resolve([]),
    prisma.sharedNoteLike.findMany({
      where: { userId: user.id },
      select: { noteId: true },
    }),
    prisma.sharedNoteHide.findMany({
      where: { userId: user.id },
      select: { noteId: true },
    }),
    // 色は業務内容と同じ割り当てにするため、作成順で取る。
    prisma.team.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  const likedIds = new Set(likedRows.map((r) => r.noteId));
  const hiddenIds = new Set(hiddenRows.map((r) => r.noteId));
  const colorByTeam = buildTeamColorMap(teams.map((t) => t.id));

  // もとになった業務内容（色とリンクに使う）
  const entryIds = notes
    .map((n) => n.referencedTaskEntryId)
    .filter((id): id is string => Boolean(id));
  const entries = entryIds.length
    ? await prisma.taskEntry.findMany({
        where: { id: { in: entryIds } },
        select: { id: true, title: true, teamId: true, team: { select: { name: true } } },
      })
    : [];
  const entryMap = new Map(entries.map((e) => [e.id, e]));

  const cards: SharedNoteCardData[] = notes.map((n) => {
    const entry = n.referencedTaskEntryId ? entryMap.get(n.referencedTaskEntryId) : null;
    return {
      id: n.id,
      title: n.title,
      body: n.body,
      createdAt: n.createdAt,
      editedAt: n.editedAt,
      authorName: n.author?.name ?? null,
      likeCount: n._count.likes,
      likedByMe: likedIds.has(n.id),
      hiddenByMe: hiddenIds.has(n.id),
      entry: entry
        ? { id: entry.id, title: entry.title, teamName: entry.team.name }
        : null,
      teamId: entry?.teamId ?? null,
      // メモ自体のチームではなく、もとの資料の部門の色を使う。
      color: entry ? colorByTeam.get(entry.teamId) : undefined,
      canEdit: n.authorId === user.id || user.role === "admin",
    };
  });

  // 絞り込みは業務内容と同じく部門で行う。
  // メモ自体のチームは全員同じなので、ここでも「もとの資料の部門」で分ける。
  // チップは実際にメモがある部門だけ出す（押しても0件になるチップを作らない）。
  const teamsWithNotes = teams
    .filter((t) => cards.some((c) => c.teamId === t.id))
    .sort((a, b) => a.name.localeCompare(b.name, "ja"));

  // もとの資料が無いメモ（参照なしのチャットから共有されたもの）は
  // 部門で分けられないので、専用のチップを出して埋もれないようにする。
  const hasUnsourced = cards.some((c) => !c.teamId);

  const filtered = selectedTeamId
    ? cards.filter((c) =>
        selectedTeamId === "none" ? !c.teamId : c.teamId === selectedTeamId,
      )
    : cards;

  // 「役に立った」の多い順。同数なら新しい順。
  const byLikes = (a: SharedNoteCardData, b: SharedNoteCardData) =>
    b.likeCount - a.likeCount || b.createdAt.getTime() - a.createdAt.getTime();

  const visible = filtered.filter((c) => !c.hiddenByMe).sort(byLikes);
  const hidden = filtered.filter((c) => c.hiddenByMe).sort(byLikes);

  // 絞り込み中は、戻り先を保つため from に部門を含める。
  const from = selectedTeamId ? `/team-notes?team=${selectedTeamId}` : "/team-notes";

  return (
    <div>
      <PageTitle>みんなのメモ</PageTitle>

      {shared && <p className="banner-ok mb-5">チームに共有しました</p>}
      {error && <p className="banner-error mb-5">{error}</p>}
      {!user.teamId && (
        <p className="banner-error mb-5">
          所属が未設定のため表示できません。設定画面から所属を選んでください。
        </p>
      )}

      <p className="mb-6 max-w-2xl text-sm leading-relaxed text-inksoft">
        チャットで分かったことを、AIが短くまとめてここに並べています。
        「役に立った」が多いものほど上に出ます。押した人の名前は誰にも表示されません。
        自分のチャットからは「
        <Link href="/chat" className="font-bold text-matcha underline underline-offset-2">
          チャット
        </Link>
        」画面で共有できます。
      </p>

      {cards.length > 0 && teamsWithNotes.length + (hasUnsourced ? 1 : 0) > 1 && (
        <div className="mb-7 flex flex-wrap gap-2 text-xs">
          <Link
            href="/team-notes"
            className={`rounded-full border-2 px-3.5 py-1.5 font-bold transition ${
              !selectedTeamId
                ? "border-matcha bg-matcha text-white"
                : "border-matcha-line text-inksoft hover:border-matcha"
            }`}
          >
            すべて
          </Link>
          {teamsWithNotes.map((t) => (
            <Link
              key={t.id}
              href={`/team-notes?team=${t.id}`}
              className={`flex items-center gap-1.5 rounded-full border-2 px-3.5 py-1.5 font-bold transition ${
                selectedTeamId === t.id
                  ? "border-matcha bg-matcha text-white"
                  : "border-matcha-line text-inksoft hover:border-matcha"
              }`}
            >
              {/* 業務内容のフォルダ・チップと同じ色にそろえている */}
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: (colorByTeam.get(t.id) ?? DEFAULT_TEAM_COLOR).dot,
                }}
              />
              {t.name}
            </Link>
          ))}
          {hasUnsourced && (
            <Link
              href="/team-notes?team=none"
              className={`flex items-center gap-1.5 rounded-full border-2 px-3.5 py-1.5 font-bold transition ${
                selectedTeamId === "none"
                  ? "border-matcha bg-matcha text-white"
                  : "border-matcha-line text-inksoft hover:border-matcha"
              }`}
            >
              <span className="h-2.5 w-2.5 rounded-full bg-pencil" />
              資料なし
            </Link>
          )}
        </div>
      )}

      {cards.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-tile border-2 border-dashed border-matcha-line bg-matcha-soft px-6 py-12 text-center">
          <Mascot size={92} />
          <p className="font-hand leading-relaxed text-matcha-deep">
            まだ共有されたメモがないよ。
            <br />
            チャットで解決したことがあったら、みんなにも教えてあげてね！
          </p>
          <Link href="/chat" className="btn-secondary mt-1">
            チャットを見る
          </Link>
        </div>
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {visible.map((n) => (
              <SharedNoteCard key={n.id} note={n} from={from} />
            ))}
          </ul>

          {hidden.length > 0 && (
            <details className="mt-8">
              <summary className="cursor-pointer text-sm font-bold text-inksoft">
                自分には不要にしたメモ（{hidden.length}件）
              </summary>
              <p className="mb-4 mt-2 text-[11px] text-inkfaint">
                ここに下げているのはあなたの画面だけです。チームの他の人には通常どおり表示されています。
              </p>
              <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {hidden.map((n) => (
                  <SharedNoteCard key={n.id} note={n} from={from} />
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}
