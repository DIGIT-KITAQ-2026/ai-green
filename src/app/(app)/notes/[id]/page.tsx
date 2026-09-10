import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateNoteAction, deleteNoteAction } from "@/app/actions/notes";
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

/** メモの閲覧と編集。開いたらそのまま書き換えられるようにしている。 */
export default async function NoteDetailPage({
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

  // 他人のメモは開けないよう、必ず userId とセットで確認する。
  const supabase = await createClient();
  const { data: note } = await supabase
    .from("notes")
    .select("id, title, body, createdAt:created_at, updatedAt:updated_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!note) notFound();

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <Link
          href="/notes"
          className="flex items-center gap-1 text-xs font-bold text-inksoft transition hover:text-matcha"
        >
          <Icon name="back" className="h-4 w-4" />
          メモ一覧
        </Link>
        <p className="text-[11px] text-inkfaint">
          最終更新 {FMT.format(new Date(note.updatedAt))}
        </p>
      </div>

      {saved && <p className="banner-ok mb-4">メモを保存しました</p>}
      {error && <p className="banner-error mb-4">{error}</p>}

      <form action={updateNoteAction} className="flex flex-col gap-3">
        <input type="hidden" name="noteId" value={note.id} />
        <input
          name="title"
          defaultValue={note.title}
          aria-label="見出し"
          className="field-input font-bold"
        />
        <textarea
          name="body"
          required
          rows={14}
          defaultValue={note.body}
          aria-label="メモの内容"
          className="field-box resize-y text-sm leading-relaxed"
        />
        <SubmitButton pendingLabel="保存中…" className="btn-primary self-end px-10">
          保存
        </SubmitButton>
      </form>

      {/* 削除は編集フォームと分ける。同じフォームに置くと保存が走ってしまうため。 */}
      <form action={deleteNoteAction} className="mt-6 border-t border-line pt-4">
        <input type="hidden" name="noteId" value={note.id} />
        <ConfirmSubmitButton
          confirmMessage={`メモ「${note.title}」を削除します。元に戻せません。よろしいですか？`}
          pendingLabel="削除中…"
          className="rounded-xl border border-line px-4 py-2.5 text-sm font-bold text-inksoft transition hover:border-red-400 hover:text-red-600 disabled:opacity-50"
        >
          このメモを削除
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}
