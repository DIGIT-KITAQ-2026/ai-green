import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Icon } from "./IconSprite";

export default async function EntryDetail({
  id,
  backHref,
}: {
  id: string;
  backHref: string;
}) {
  const entry = await prisma.taskEntry.findUnique({
    where: { id },
    include: { team: true, createdBy: true, attachments: true },
  });
  if (!entry) notFound();

  return (
    <div className="card mx-auto max-w-3xl p-8">
      <Link href={backHref} className="btn-ghost mb-6 inline-flex">
        <Icon name="back" className="h-4 w-4" />
        一覧に戻る
      </Link>

      <div className="mb-1 flex items-center gap-2 font-mono text-xs text-inkfaint">
        <span>{entry.team.name}</span>
        <span>・</span>
        <span>{entry.type === "manual" ? "マニュアル" : "業務内容"}</span>
      </div>
      <h1 className="mb-4 text-2xl font-semibold">{entry.title}</h1>

      <div className="mb-6 rounded-lg border border-line bg-surface2 p-4">
        <p className="field-label mb-2">AIによる要約</p>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{entry.summary}</p>
      </div>

      <details className="mb-6 rounded-lg border border-line p-4">
        <summary className="cursor-pointer font-mono text-xs uppercase tracking-wide text-inkfaint">
          抽出された全文テキストを見る
        </summary>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-inksoft">
          {entry.rawText || "(テキストなし)"}
        </p>
      </details>

      <div>
        <p className="field-label mb-2">添付ファイル</p>
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
                  className="h-24 w-24 rounded-lg border border-line object-cover"
                />
              ) : (
                <div className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border border-line bg-surface2 text-hojicha">
                  <Icon name="file" className="h-8 w-8" />
                  <span className="text-[10px]">PDF</span>
                </div>
              )}
              <span className="max-w-[6rem] truncate font-mono text-[10px] text-inkfaint">
                {a.filename}
              </span>
            </a>
          ))}
        </div>
      </div>

      <p className="mt-8 font-mono text-[11px] text-inkfaint">
        登録者: {entry.createdBy.name} ／ {entry.createdAt.toLocaleString("ja-JP")}
      </p>
    </div>
  );
}
