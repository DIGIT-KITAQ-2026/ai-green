import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Icon } from "./IconSprite";
import Mascot from "./Mascot";
import PageTitle from "./PageTitle";
import ConfirmSubmitButton from "./ConfirmSubmitButton";
import { deleteTaskEntryAction } from "@/app/actions/tasks";

export default async function EntryDetail({
  id,
  backHref,
}: {
  id: string;
  backHref: string;
}) {
  // 認可はレイアウトに任せず、データを取る直前で必ず確認する（EntryListPageと同じ理由）。
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const entry = await prisma.taskEntry.findUnique({
    where: { id },
    include: { team: true, createdBy: true, attachments: true },
  });
  if (!entry) notFound();

  return (
    <div>
      <Link href={backHref} className="btn-ghost mb-6 inline-flex">
        <Icon name="back" className="h-4 w-4" />
        一覧に戻る
      </Link>

      <div className="mb-2 flex items-center gap-2 text-xs font-bold text-matcha">
        <span>{entry.team.name}</span>
      </div>
      <PageTitle>{entry.title}</PageTitle>

      {/* AIの要約はマスコットが読み上げている体裁にする。 */}
      <div className="mb-6 flex gap-4 rounded-tile border border-matcha-line bg-matcha-soft p-5">
        <Mascot size={56} className="hidden shrink-0 sm:inline-flex" />
        <div>
          <p className="mb-1.5 text-xs font-bold text-matcha-deep">
            AIによる要約
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {entry.summary}
          </p>
        </div>
      </div>

      <details className="mb-6 rounded-tile border border-line bg-surface p-5">
        <summary className="cursor-pointer text-sm font-bold text-inksoft">
          抽出された全文テキストを見る
        </summary>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-inksoft">
          {entry.rawText || "(テキストなし)"}
        </p>
      </details>

      <div>
        <p className="section-title mb-3">添付ファイル</p>
        {entry.attachments.length === 0 ? (
          <p className="text-sm text-inkfaint">添付ファイルはありません。</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {entry.attachments.map((a) => (
              <a
                key={a.id}
                href={`/api/files/${a.id}`}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center gap-1"
              >
                {a.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/files/${a.id}`}
                    alt={a.filename}
                    className="h-24 w-24 rounded-xl border border-line object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl bg-folder text-matcha-deep">
                    <Icon name="file" className="h-8 w-8" />
                    <span className="text-[10px] font-bold">PDF</span>
                  </div>
                )}
                <span className="max-w-[6rem] truncate text-[10px] text-inkfaint">
                  {a.filename}
                </span>
              </a>
            ))}
          </div>
        )}
      </div>

      <p className="mt-8 text-[11px] text-inkfaint">
        登録者: {entry.createdBy?.name ?? "退会したユーザー"} ／{" "}
        {entry.createdAt.toLocaleString("ja-JP")}
      </p>

      <form
        action={deleteTaskEntryAction}
        className="mt-6 border-t border-line pt-4"
      >
        <input type="hidden" name="entryId" value={entry.id} />
        <ConfirmSubmitButton
          confirmMessage={`「${entry.title}」を削除します。添付ファイルも消え、元に戻せません。よろしいですか？`}
          pendingLabel="削除中…"
          className="rounded-xl border border-line px-4 py-2.5 text-sm font-bold text-inksoft transition hover:border-red-400 hover:text-red-600 disabled:opacity-50"
        >
          この業務内容を削除
        </ConfirmSubmitButton>
        <p className="mt-2 text-[11px] text-inkfaint">
          チーム全員が見る資料です。削除すると他のメンバーからも見えなくなります。
        </p>
      </form>
    </div>
  );
}
