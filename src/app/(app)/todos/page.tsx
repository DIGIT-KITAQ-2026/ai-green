import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import PageTitle from "@/components/PageTitle";
import TodoList from "@/components/TodoList";
import TodoQuickAdd from "@/components/TodoQuickAdd";
import Mascot from "@/components/Mascot";

export default async function TodosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { error } = await searchParams;

  const todos = await prisma.todo.findMany({
    where: { userId: user.id },
    // 未完了を先に。期限があるものを早い順、期限なしは後ろへ。
    orderBy: [{ done: "asc" }, { dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
  });

  const open = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);
  const greetName = user.nickname ?? user.name;

  return (
    <div className="max-w-3xl">
      <PageTitle>ToDoリスト</PageTitle>

      {error && <p className="banner-error mb-5">{error}</p>}

      <section className="card rounded-tile p-5 sm:p-6">
        <TodoQuickAdd from="/todos" />
      </section>

      <section className="mt-6">
        <div className="mb-2 flex items-baseline gap-2.5">
          <h2 className="section-title">やること</h2>
          <span className="text-xs text-inkfaint">{open.length}件</span>
        </div>
        <div className="card rounded-tile px-5 py-1 sm:px-6">
          {open.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Mascot size={72} />
              <p className="font-hand text-sm leading-relaxed text-matcha-deep">
                {greetName}さん、いまやることはないよ。
                <br />
                思いついたら上から追加してね。
              </p>
            </div>
          ) : (
            <TodoList todos={open} from="/todos" />
          )}
        </div>
      </section>

      {done.length > 0 && (
        <section className="mt-6">
          <div className="mb-2 flex items-baseline gap-2.5">
            <h2 className="section-title">終わったこと</h2>
            <span className="text-xs text-inkfaint">{done.length}件</span>
          </div>
          <div className="card rounded-tile px-5 py-1 opacity-80 sm:px-6">
            <TodoList todos={done} from="/todos" />
          </div>
        </section>
      )}
    </div>
  );
}
