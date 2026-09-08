import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteSharedNoteAction } from "@/app/actions/sharedNotes";
import PageTitle from "@/components/PageTitle";
import Mascot from "@/components/Mascot";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";

const FMT = new Intl.DateTimeFormat("ja-JP", {
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * みんなのメモ。チャットで分かったことをAIが要約し、チーム全員が読めるようにした場所。
 * 個人の「メモ」と違い、同じチームの人が書いたものが並ぶ。
 */
export default async function TeamNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; shared?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { error, shared } = await searchParams;

  const notes = user.teamId
    ? await prisma.sharedNote.findMany({
        where: { teamId: user.teamId },
        orderBy: { createdAt: "desc" },
        include: { author: { select: { name: true, nickname: true } } },
      })
    : [];

  // 根拠になった業務内容へのリンク用。
  const entryIds = notes
    .map((n) => n.referencedTaskEntryId)
    .filter((id): id is string => Boolean(id));
  const entries = entryIds.length
    ? await prisma.taskEntry.findMany({
        where: { id: { in: entryIds } },
        select: { id: true, title: true },
      })
    : [];
  const entryMap = new Map(entries.map((e) => [e.id, e]));

  return (
    <div>
      <PageTitle>みんなのメモ</PageTitle>

      {shared && <p className="banner-ok mb-5">チームに共有しました</p>}
      {error && <p className="banner-error mb-5">{error}</p>}
      {!user.teamId && (
        <p className="banner-error mb-5">
          所属チームが未設定のため表示できません。設定画面から所属を選んでください。
        </p>
      )}

      <p className="mb-6 max-w-2xl text-sm leading-relaxed text-inksoft">
        チャットで分かったことを、AIが短くまとめてここに並べています。
        誰かが一度聞いたことは、次の人が聞かなくても済むようにするための場所です。
        自分のチャットからは「
        <Link href="/chat" className="font-bold text-matcha underline underline-offset-2">
          チャット
        </Link>
        」画面で共有できます。AIがまとめた文章なので、
        内容に誤りがあれば書いた本人と先輩・管理者が直せます。
      </p>

      {notes.length === 0 ? (
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
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {notes.map((n) => {
            const entry = n.referencedTaskEntryId
              ? entryMap.get(n.referencedTaskEntryId)
              : null;
            const author = n.author?.nickname ?? n.author?.name ?? "退会したユーザー";
            // 直すのも消すのも、書いた本人と先輩・管理者だけ
            const canEdit = n.authorId === user.id || user.role === "admin";

            return (
              <li
                key={n.id}
                className="flex flex-col gap-3 rounded-tile border border-line bg-surface p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-base font-black leading-snug">
                    <Link
                      href={`/team-notes/${n.id}`}
                      className="text-ink transition hover:text-matcha"
                    >
                      {n.title}
                    </Link>
                  </h2>
                  {canEdit && (
                    <form action={deleteSharedNoteAction} className="shrink-0">
                      <input type="hidden" name="noteId" value={n.id} />
                      <input type="hidden" name="from" value="/team-notes" />
                      <ConfirmSubmitButton
                        confirmMessage={`「${n.title}」をみんなのメモから削除します。よろしいですか？`}
                        pendingLabel="…"
                        className="flex h-7 w-7 items-center justify-center rounded-full text-inkfaint transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        <span aria-hidden="true">×</span>
                        <span className="sr-only">{n.title} を削除</span>
                      </ConfirmSubmitButton>
                    </form>
                  )}
                </div>

                <p className="flex-1 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                  {n.body}
                </p>

                {entry && (
                  <Link
                    href={`/tasks/${entry.id}`}
                    className="self-start rounded-full border border-matcha-line bg-matcha-soft px-3 py-1 text-[11px] font-bold text-matcha-deep transition hover:border-matcha"
                  >
                    もとの資料: {entry.title}
                  </Link>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] text-inkfaint">
                    {author}さんが共有 ・ {FMT.format(n.createdAt)}
                    {n.editedAt && " ・ 編集済み"}
                  </p>
                  {canEdit && (
                    <Link
                      href={`/team-notes/${n.id}`}
                      className="text-[11px] font-bold text-matcha underline underline-offset-2 hover:text-matcha-deep"
                    >
                      直す
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
