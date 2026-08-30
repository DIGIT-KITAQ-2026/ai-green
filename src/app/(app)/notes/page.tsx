import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNoteAction } from "@/app/actions/notes";
import PageTitle from "@/components/PageTitle";
import SubmitButton from "@/components/SubmitButton";
import Mascot from "@/components/Mascot";

const FMT = new Intl.DateTimeFormat("ja-JP", {
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { error } = await searchParams;

  const notes = await prisma.note.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <PageTitle>メモ</PageTitle>

      {error && <p className="banner-error mb-5">{error}</p>}

      {/* 走り書きをすぐ残せるよう、一覧の先頭に入力欄を置く */}
      <section className="card rounded-tile p-5 sm:p-6">
        <form action={createNoteAction} className="flex flex-col gap-3">
          <input
            name="title"
            placeholder="見出し（空欄なら本文の1行目が使われます）"
            aria-label="見出し"
            className="field-input py-2 text-sm"
          />
          <textarea
            name="body"
            required
            rows={4}
            placeholder="気づいたこと、教わったことをここに書き留めよう…"
            aria-label="メモの内容"
            className="field-box resize-y text-sm leading-relaxed"
          />
          <SubmitButton pendingLabel="保存中…" className="btn-secondary self-end px-8">
            メモを保存
          </SubmitButton>
        </form>
      </section>

      <section className="mt-7">
        <div className="mb-4 flex items-baseline gap-2.5">
          <h2 className="section-title">保存したメモ</h2>
          {notes.length > 0 && (
            <span className="text-xs text-inkfaint">{notes.length}件</span>
          )}
        </div>

        {notes.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-tile border-2 border-dashed border-matcha-line bg-matcha-soft px-6 py-10 text-center">
            <Mascot size={80} />
            <p className="font-hand text-sm leading-relaxed text-matcha-deep">
              まだメモがないよ。
              <br />
              上の欄に書いて保存してみてね。
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {notes.map((n) => (
              <li key={n.id}>
                <Link
                  href={`/notes/${n.id}`}
                  className="flex h-full flex-col gap-2 rounded-tile border border-line bg-surface p-4 transition hover:-translate-y-0.5 hover:border-matcha hover:shadow-lift"
                >
                  <p className="line-clamp-2 font-bold leading-snug text-ink">
                    {n.title}
                  </p>
                  <p className="line-clamp-4 flex-1 whitespace-pre-wrap text-xs leading-relaxed text-inksoft">
                    {n.body}
                  </p>
                  <p className="text-[10px] text-inkfaint">
                    {FMT.format(n.updatedAt)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
