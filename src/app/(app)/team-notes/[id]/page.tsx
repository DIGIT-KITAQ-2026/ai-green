import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  updateSharedNoteAction,
  deleteSharedNoteAction,
  toggleSharedNoteLikeAction,
} from "@/app/actions/sharedNotes";
import { buildTeamColorMap, DEFAULT_TEAM_COLOR } from "@/lib/teamColors";
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

  const supabase = await createClient();

  // メモは部門を問わず読める。直せるかどうかは下の canEdit で判定する。
  const { data: note } = await supabase
    .from("shared_notes")
    .select(
      "id, title, body, createdAt:created_at, editedAt:edited_at, likeCount:like_count, authorId:author_id, sourceQuestions:source_questions, referencedTaskEntryId:referenced_task_entry_id, author:profiles(name)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!note) notFound();

  const [entryRes, teamRes, myLikeRes] = await Promise.all([
    note.referencedTaskEntryId
      ? supabase
          .from("task_entries")
          .select("id, title, teamId:team_id, team:teams(name)")
          .eq("id", note.referencedTaskEntryId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    // 色は業務内容と同じ割り当てにするため、作成順で取る。
    supabase.from("teams").select("id").order("created_at"),
    // 自分が押したかどうか。他の人の分は読めないので、件数は like_count を使う。
    supabase
      .from("shared_note_likes")
      .select("id")
      .eq("note_id", note.id)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const entry = entryRes.data;
  const likeCount = note.likeCount;
  const myLike = myLikeRes.data;

  // メモ自体のチームではなく、もとの資料の部門の色を使う（業務内容の色と揃える）。
  const color =
    (entry && buildTeamColorMap((teamRes.data ?? []).map((t) => t.id)).get(entry.teamId)) ??
    DEFAULT_TEAM_COLOR;

  const canEdit = note.authorId === user.id || user.role === "admin";
  const author = note.author?.name ?? "退会したユーザー";

  return (
    <div className="max-w-3xl">
      {/* 部門の色。業務内容のフォルダと同じ色にしている。 */}
      <div
        className="mb-4 h-1.5 w-full rounded-full"
        style={{ backgroundColor: color.body }}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <Link
          href="/team-notes"
          className="flex items-center gap-1 text-xs font-bold text-inksoft transition hover:text-matcha"
        >
          <Icon name="back" className="h-4 w-4" />
          みんなのメモ
        </Link>
        <p className="text-[11px] text-inkfaint">
          {entry && (
            <span
              className="mr-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-ink/75"
              style={{ backgroundColor: color.body }}
            >
              {entry.team.name}
            </span>
          )}
          {author}さんが共有 ・ {FMT.format(new Date(note.createdAt))}
          {note.editedAt && ` ／ ${FMT.format(new Date(note.editedAt))}に編集`}
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
              全部門の人がここを読みます。
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

      <div className="mt-7 border-t border-line pt-5">
        <form action={toggleSharedNoteLikeAction}>
          <input type="hidden" name="noteId" value={note.id} />
          <input type="hidden" name="from" value={`/team-notes/${note.id}`} />
          <SubmitButton
            pendingLabel="…"
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition disabled:opacity-50 ${
              myLike
                ? "border-matcha bg-matcha text-white"
                : "border-line text-inksoft hover:border-matcha hover:text-matcha"
            }`}
          >
            <span aria-hidden="true">{myLike ? "♥" : "♡"}</span>
            <span>役に立った</span>
            <span className="tabular-nums">{likeCount}</span>
          </SubmitButton>
        </form>
        <p className="mt-2 text-[11px] text-inkfaint">
          押した人の名前は誰にも表示されません。多く押されたメモが一覧の上に並びます。
        </p>
      </div>

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
