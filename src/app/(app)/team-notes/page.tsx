import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { buildTeamColorMap, DEFAULT_TEAM_COLOR } from "@/lib/teamColors";
import PageTitle from "@/components/PageTitle";
import Mascot from "@/components/Mascot";
import SharedNoteCard, { SharedNoteCardData } from "@/components/SharedNoteCard";

/**
 * みんなのメモ。チャットで分かったことをAIが要約し、全部門が読めるようにした場所。
 *
 * もとは自分の所属チームのメモしか出していなかったが、人事のナレッジが総務の人に
 * 届かず、部門をまたぐ疑問（総務の人が経理の請求書ルールを見るなど）に使えなかった。
 * 業務内容も全部門を出しているので、そちらに揃えている。
 * 部門は「どの部門が貯めたメモか」を表す分類として、絞り込みに使う。
 *
 * 並び順は「役に立った」の多い順。誰が押したかは表示しない。
 * 自分には不要と判断したメモは、自分の画面でだけ下にまとめる
 * （共有物そのものは消さない）。
 */
export default async function TeamNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; shared?: string; team?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { error, shared, team: selectedTeamId } = await searchParams;

  const supabase = await createClient();

  // いいねは匿名なので、押した人の行は本人の分しか読めない。
  // 画面に出す件数は shared_notes.like_count（トリガで同期）を使う。
  const [noteRes, likedRes, hiddenRes, teamRes] = await Promise.all([
    supabase
      .from("shared_notes")
      .select(
        "id, title, body, createdAt:created_at, editedAt:edited_at, likeCount:like_count, authorId:author_id, referencedTaskEntryId:referenced_task_entry_id, author:profiles(name)",
      )
      .order("created_at", { ascending: false }),
    supabase.from("shared_note_likes").select("note_id").eq("user_id", user.id),
    supabase.from("shared_note_hides").select("note_id").eq("user_id", user.id),
    // 色は業務内容と同じ割り当てにするため、作成順で取る。
    supabase.from("teams").select("id, name").order("created_at"),
  ]);

  const notes = noteRes.data ?? [];
  const teams = teamRes.data ?? [];
  const likedIds = new Set((likedRes.data ?? []).map((r) => r.note_id));
  const hiddenIds = new Set((hiddenRes.data ?? []).map((r) => r.note_id));
  const colorByTeam = buildTeamColorMap(teams.map((t) => t.id));

  // もとになった業務内容（色とリンクに使う）
  const entryIds = notes
    .map((n) => n.referencedTaskEntryId)
    .filter((id): id is string => Boolean(id));
  const { data: entries } = entryIds.length
    ? await supabase
        .from("task_entries")
        .select("id, title, teamId:team_id, team:teams(name)")
        .in("id", entryIds)
    : { data: [] };
  const entryMap = new Map((entries ?? []).map((e) => [e.id, e]));

  const cards: SharedNoteCardData[] = notes.map((n) => {
    const entry = n.referencedTaskEntryId ? entryMap.get(n.referencedTaskEntryId) : null;
    return {
      id: n.id,
      title: n.title,
      body: n.body,
      createdAt: new Date(n.createdAt),
      editedAt: n.editedAt ? new Date(n.editedAt) : null,
      authorName: n.author?.name ?? null,
      likeCount: n.likeCount,
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
  // 色分けと同じく「もとの資料の部門」で分ける。どの部門の話題かで探せるようにするため。
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

      {shared && <p className="banner-ok mb-5">みんなのメモに共有しました</p>}
      {error && <p className="banner-error mb-5">{error}</p>}
      {!user.teamId && (
        <p className="banner-ok mb-5">
          読むのは所属がなくてもできます。自分のチャットを共有するには、
          設定画面から所属を選んでください。
        </p>
      )}

      <p className="mb-6 max-w-2xl text-sm leading-relaxed text-inksoft">
        チャットで分かったことを、AIが短くまとめてここに並べています。部門を問わず全部見えます。
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
                ここに下げているのはあなたの画面だけです。他の人には通常どおり表示されています。
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
