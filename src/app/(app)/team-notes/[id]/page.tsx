import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  updateSharedNoteAction,
  deleteSharedNoteAction,
} from "@/app/actions/sharedNotes";
import { Icon } from "@/components/IconSprite";
import SubmitButton from "@/components/SubmitButton";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";

const FMT = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * 共有メモの詳細。書いた本人と先輩・管理者はその場で直せる。
 * AIの要約が間違っていたときに、消さずに直せるようにするための画面。
 */
export default async function SharedNoteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const { error, saved } = await searchParams;

  // 同じチームのメモしか開けない。
  const note = await prisma.sharedNote.findFirst({
    where: { id, teamId: user.teamId ?? undefined },
    include: { author: { select: { name: true, nickname: true } } },
  });
  if (!note) notFound();

  const entry = note.referencedTaskEntryId
    ? await prisma.taskEntry.findUnique({
        where: { id: note.referencedTaskEntryId },
        select: { id: true, title: true },
      })
    : null;

  const canEdit = note.authorId === user.id || user.role === "admin";
  const author = note.author?.nickname ?? note.author?.name ?? "退会したユーザー";

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <Link
          href="/team-notes"
          className="flex items-center gap-1 text-xs font-bold text-inksoft transition hover:text-matcha"
        >
          <Icon name="back" className="h-4 w-4" />
          みんなのメモ
        </Link>
        <p className="text-[11px] text-inkfaint">
          {author}さんが共有 ・ {FMT.format(note.createdAt)}
          {note.editedAt && ` ／ ${FMT.format(note.editedAt)}に編集`}
        </p>
      </div>

      {saved && <p className="banner-ok mb-4">メモを更新しました</p>}
      {error && <p className="banner-error mb-4">{error}</p>}

      {canEdit ? (
        <form action={updateSharedNoteAction} className="flex flex-col gap-3">
          <input type="hidden" name="noteId" value={note.id} />
          <div>
            <label className="field-label" htmlFor="title">
              見出し
            </label>
            <input
              id="title"
              name="title"
              defaultValue={note.title}
              required
              className="field-input font-bold"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="body">
              本文
            </label>
            <textarea
              id="body"
              name="body"
              rows={12}
              defaultValue={note.body}
              required
              className="field-box resize-y text-sm leading-relaxed"
            />
            <p className="mt-2 text-[11px] text-inkfaint">
              AIがまとめた文章です。内容に誤りがあれば直してください。
              チーム全員がここを読みます。
            </p>
          </div>
          <SubmitButton pendingLabel="保存中…" className="btn-primary self-end px-10">
            保存
          </SubmitButton>
        </form>
      ) : (
        <>
          <h1 className="font-display text-xl font-black leading-snug text-ink">
            {note.title}
          </h1>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink">
            {note.body}
          </p>
          <p className="mt-5 text-[11px] text-inkfaint">
            直せるのは、書いた本人と先輩・管理者だけです。
          </p>
        </>
      )}

      {note.sourceQuestions && (
        <div className="mt-7 border-t border-line pt-5">
          <p className="mb-2 text-xs font-bold text-inksoft">もとの質問</p>
          <p className="whitespace-pre-wrap rounded-xl bg-surface2 px-4 py-3 text-sm leading-relaxed text-inksoft">
            {note.sourceQuestions}
          </p>
          <p className="mt-2 text-[11px] text-inkfaint">
            この言い回しは、チャットで似た質問をした人を同じ資料へ案内するための
            手がかりとしても使われます。
          </p>
        </div>
      )}

      {entry && (
        <div className="mt-7 border-t border-line pt-5">
          <p className="mb-2 text-xs font-bold text-inksoft">もとの資料</p>
          <Link
            href={`/tasks/${entry.id}`}
            className="inline-block rounded-full border border-matcha-line bg-matcha-soft px-3.5 py-1.5 text-xs font-bold text-matcha-deep transition hover:border-matcha"
          >
            {entry.title}
          </Link>
          <p className="mt-2 text-[11px] text-inkfaint">
            このメモの元になった業務内容です。正確な条件はこちらで確認してください。
          </p>
        </div>
      )}

      {canEdit && (
        <form
          action={deleteSharedNoteAction}
          className="mt-7 border-t border-line pt-5"
        >
          <input type="hidden" name="noteId" value={note.id} />
          <input type="hidden" name="from" value={`/team-notes/${note.id}`} />
          <ConfirmSubmitButton
            confirmMessage={`「${note.title}」をみんなのメモから削除します。元に戻せません。よろしいですか？`}
            pendingLabel="削除中…"
            className="rounded-xl border border-line px-4 py-2.5 text-sm font-bold text-inksoft transition hover:border-red-400 hover:text-red-600 disabled:opacity-50"
          >
            このメモを削除
          </ConfirmSubmitButton>
        </form>
      )}
    </div>
  );
}
