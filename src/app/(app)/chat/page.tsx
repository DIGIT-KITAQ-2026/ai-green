import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Icon } from "@/components/IconSprite";
import ChatComposer from "@/components/ChatComposer";
import Link from "next/link";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { error } = await searchParams;

  const messages = await prisma.chatMessage.findMany({
    where: { userId: user.id },
    include: { attachments: true },
    orderBy: { createdAt: "asc" },
  });

  const referencedIds = messages
    .map((m) => m.referencedTaskEntryId)
    .filter((id): id is string => Boolean(id));
  const referenced = referencedIds.length
    ? await prisma.taskEntry.findMany({ where: { id: { in: referencedIds } } })
    : [];
  const referencedMap = new Map(referenced.map((r) => [r.id, r]));

  return (
    <div className="card flex min-h-[75vh] overflow-hidden">
      <div className="flex w-[26%] min-w-[150px] flex-col items-center justify-center gap-4 border-r border-line bg-surface px-4 py-10 text-center">
        <Icon name="cup-face" className="h-16 w-16 text-tea" />
        <p className="max-w-[10rem] rounded-lg border border-line bg-surface2 px-3 py-2 font-hand text-sm text-inksoft">
          何か困っていることある？
        </p>
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {messages.length === 0 && (
            <p className="text-center text-sm text-inkfaint">
              質問文を入力するか、写真・PDFを送ってみましょう。
            </p>
          )}
          {messages.map((m) => {
            const ref = m.referencedTaskEntryId
              ? referencedMap.get(m.referencedTaskEntryId)
              : null;
            const isUser = m.role === "user";
            return (
              <div
                key={m.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
                    isUser
                      ? "bg-tea text-white"
                      : "border border-line bg-surface2 text-ink"
                  }`}
                >
                  {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                  {m.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {m.attachments.map((a) => (
                        <a
                          key={a.id}
                          href={`/api/files/${a.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded border border-white/40 bg-white/10 px-2 py-1 font-mono text-[11px]"
                        >
                          📎 {a.filename}
                        </a>
                      ))}
                    </div>
                  )}
                  {ref && (
                    <Link
                      href={`/tasks/${ref.id}`}
                      className="mt-2 inline-block rounded border border-tea/50 bg-white/40 px-2 py-1 text-[11px] font-bold text-tea-strong"
                    >
                      参照: {ref.title}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-line p-4">
          {error && <p className="banner-error mb-3">{error}</p>}
          <ChatComposer />
        </div>
      </div>
    </div>
  );
}
