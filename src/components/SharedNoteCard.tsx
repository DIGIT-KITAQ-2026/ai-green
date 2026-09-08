import Link from "next/link";
import {
  toggleSharedNoteLikeAction,
  toggleSharedNoteHideAction,
  deleteSharedNoteAction,
} from "@/app/actions/sharedNotes";
import { DEFAULT_TEAM_COLOR, TeamColor } from "@/lib/teamColors";
import SubmitButton from "./SubmitButton";
import ConfirmSubmitButton from "./ConfirmSubmitButton";

const FMT = new Intl.DateTimeFormat("ja-JP", {
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export type SharedNoteCardData = {
  id: string;
  title: string;
  body: string;
  createdAt: Date;
  editedAt: Date | null;
  authorName: string | null;
  likeCount: number;
  likedByMe: boolean;
  hiddenByMe: boolean;
  /** もとになった業務内容。色もこの資料の部門に合わせる。 */
  entry: { id: string; title: string; teamName: string } | null;
  /** 絞り込み用。もとの資料が無いメモは null。 */
  teamId: string | null;
  color: TeamColor | undefined;
  canEdit: boolean;
};

/**
 * みんなのメモ1件分のカード。
 *
 * 色は「もとになった業務内容の部門」に合わせている。
 * メモ自体のチームで塗ると全部同じ色になってしまい、
 * 業務内容のフォルダの色とも対応しないため。
 */
export default function SharedNoteCard({
  note,
  from,
}: {
  note: SharedNoteCardData;
  from: string;
}) {
  const color = note.color ?? DEFAULT_TEAM_COLOR;

  return (
    <li
      className={`flex flex-col overflow-hidden rounded-tile border border-line bg-surface ${
        note.hiddenByMe ? "opacity-60" : ""
      }`}
    >
      {/* 部門の色の帯。業務内容のフォルダと同じ色にしている。 */}
      <div className="h-1.5 w-full" style={{ backgroundColor: color.body }} />

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-base font-black leading-snug">
            <Link
              href={`/team-notes/${note.id}`}
              className="text-ink transition hover:text-matcha"
            >
              {note.title}
            </Link>
          </h2>
          {note.entry && (
            <span
              className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold text-ink/75"
              style={{ backgroundColor: color.body }}
            >
              {note.entry.teamName}
            </span>
          )}
        </div>

        <p className="flex-1 whitespace-pre-wrap text-sm leading-relaxed text-ink">
          {note.body}
        </p>

        {note.entry && (
          <Link
            href={`/tasks/${note.entry.id}`}
            className="self-start rounded-full border border-line px-3 py-1 text-[11px] font-bold text-inksoft transition hover:border-matcha hover:text-matcha"
          >
            もとの資料: {note.entry.title}
          </Link>
        )}

        <p className="text-[11px] text-inkfaint">
          {note.authorName ?? "退会したユーザー"}さんが共有 ・{" "}
          {FMT.format(note.createdAt)}
          {note.editedAt && " ・ 編集済み"}
        </p>

        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <form action={toggleSharedNoteLikeAction}>
            <input type="hidden" name="noteId" value={note.id} />
            <input type="hidden" name="from" value={from} />
            <SubmitButton
              pendingLabel="…"
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
                note.likedByMe
                  ? "border-matcha bg-matcha text-white"
                  : "border-line text-inksoft hover:border-matcha hover:text-matcha"
              }`}
            >
              <span aria-hidden="true">{note.likedByMe ? "♥" : "♡"}</span>
              <span>役に立った</span>
              <span className="tabular-nums">{note.likeCount}</span>
            </SubmitButton>
          </form>

          <form action={toggleSharedNoteHideAction}>
            <input type="hidden" name="noteId" value={note.id} />
            <input type="hidden" name="from" value={from} />
            <SubmitButton
              pendingLabel="…"
              className="rounded-full border border-line px-3 py-1.5 text-xs font-bold text-inksoft transition hover:border-matcha hover:text-matcha disabled:opacity-50"
            >
              {note.hiddenByMe ? "戻す" : "自分には不要"}
            </SubmitButton>
          </form>

          {note.canEdit && (
            <form action={deleteSharedNoteAction} className="ml-auto">
              <input type="hidden" name="noteId" value={note.id} />
              <input type="hidden" name="from" value={from} />
              <ConfirmSubmitButton
                confirmMessage={`「${note.title}」をみんなのメモから削除します。チーム全員から見えなくなります。よろしいですか？`}
                pendingLabel="…"
                className="rounded-full px-2.5 py-1.5 text-xs font-bold text-inkfaint transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              >
                削除
              </ConfirmSubmitButton>
            </form>
          )}
        </div>
      </div>
    </li>
  );
}
