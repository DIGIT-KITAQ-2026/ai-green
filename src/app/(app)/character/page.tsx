import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { selectRewardAction } from "@/app/actions/character";
import {
  REWARDS,
  XP_RULE_LABELS,
  isUnlocked,
  levelInfo,
  rewardById,
  thresholdFor,
} from "@/lib/rewards";
import Mascot from "@/components/Mascot";
import PageTitle from "@/components/PageTitle";
import SubmitButton from "@/components/SubmitButton";

export default async function CharacterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; selected?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { error, selected } = await searchParams;

  const info = levelInfo(user.xp);
  const current = rewardById(user.selectedRewardId);
  const greetName = user.name;

  // 何をどれだけやったかを出して、次に何をすれば伸びるか分かるようにする。
  // 並びは「経験値の貯まりかた」と同じにしてある。
  const supabase = await createClient();
  const [questionRes, todoRes, myNotesRes] = await Promise.all([
    supabase
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("role", "user"),
    supabase
      .from("todos")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("done", true),
    // 自分のメモに付いたいいねの数。件数は shared_notes 側に持たせてある
    // （いいねは匿名なので、誰が押したかの行は本人以外読めない）。
    supabase.from("shared_notes").select("like_count").eq("author_id", user.id),
  ]);

  const questions = questionRes.count ?? 0;
  const todosDone = todoRes.count ?? 0;
  const likesReceived = (myNotesRes.data ?? []).reduce((sum, n) => sum + n.like_count, 0);

  const unlockedCount = REWARDS.filter((r) => isUnlocked(r, info.level)).length;
  const nextReward = REWARDS.find((r) => !isUnlocked(r, info.level));

  return (
    <div>
      <PageTitle>キャラクター</PageTitle>

      {selected && <p className="banner-ok mb-5">「{selected}」に切り替えました</p>}
      {error && <p className="banner-error mb-5">{error}</p>}

      {/* いまのキャラクターとレベル */}
      <section className="rounded-tile border border-matcha-line bg-matcha-soft p-6">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          <Mascot
            size={150}
            accent={current.accent}
            src={current.image}
            priority
            className="shadow-lift"
          />

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-xs font-bold text-matcha-deep">いまのすがた</p>
            <h2 className="font-display text-2xl font-black text-ink">
              {current.name}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-inksoft">
              {current.description}
            </p>

            <div className="mt-5">
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className="font-display text-lg font-black text-matcha-deep">
                  レベル {info.level}
                </span>
                <span className="text-xs text-inksoft">
                  {info.isMax
                    ? `${info.totalXp} XP ・ 最大レベル`
                    : `あと ${info.neededXp - info.currentXp} XP で レベル${info.level + 1}`}
                </span>
              </div>
              <div
                className="h-3 w-full overflow-hidden rounded-full bg-white"
                role="progressbar"
                aria-valuenow={info.progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`レベル${info.level}の進捗`}
              >
                <div
                  className="h-full rounded-full bg-matcha transition-all"
                  style={{ width: `${Math.max(info.progress, 3)}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-inkfaint">
                合計 {info.totalXp} XP ・ {unlockedCount}/{REWARDS.length} 種類を解放
                {nextReward &&
                  ` ・ 次は レベル${nextReward.requiredLevel} で「${nextReward.name}」`}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 何をすると増えるか */}
      <section className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
        <div className="card rounded-tile p-5">
          <h2 className="section-title mb-3">経験値の貯まりかた</h2>
          <ul className="flex flex-col divide-y divide-line">
            {XP_RULE_LABELS.map((r) => (
              <li key={r.label} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-sm text-ink">{r.label}</span>
                <span className="shrink-0 rounded-full bg-matcha-soft px-2.5 py-1 text-xs font-bold text-matcha-deep">
                  +{r.xp} XP
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] leading-relaxed text-inkfaint">
            一度もらった経験値は減りません。ToDoは1件につき1回だけ加算されます。
            みんなのメモは、共有しただけでは増えません。読んだ人の役に立ったときだけ、
            そのメモを書いた人に入ります（押した人と、自分で押した分は入りません）。
          </p>
        </div>

        <div className="card rounded-tile p-5">
          <h2 className="section-title mb-3">{greetName}さんのこれまで</h2>
          <dl className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: "質問した", value: questions },
              { label: "ToDo完了", value: todosDone },
              { label: "もらったいいね", value: likesReceived },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-matcha-soft px-2 py-4">
                <dd className="font-display text-2xl font-black text-matcha-deep">
                  {s.value}
                </dd>
                <dt className="mt-0.5 text-[11px] text-inksoft">{s.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* もらえるキャラクター一覧 */}
      <section className="mt-8">
        <div className="mb-4 flex items-baseline gap-2.5">
          <h2 className="section-title">コレクション</h2>
          <span className="text-xs text-inkfaint">
            {unlockedCount}/{REWARDS.length}
          </span>
        </div>

        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {REWARDS.map((r) => {
            const unlocked = isUnlocked(r, info.level);
            const active = r.id === current.id;
            return (
              <li key={r.id}>
                <div
                  className={`flex h-full flex-col items-center gap-2 rounded-tile border-2 p-4 text-center transition ${
                    active
                      ? "border-matcha bg-matcha-soft"
                      : unlocked
                        ? "border-line bg-surface"
                        : "border-dashed border-line bg-surface2"
                  }`}
                >
                  <div className={unlocked ? "" : "opacity-30 grayscale"}>
                    <Mascot size={84} accent={r.accent} src={r.image} />
                  </div>

                  <p className="text-sm font-bold leading-snug text-ink">{r.name}</p>

                  {unlocked ? (
                    <>
                      <p className="flex-1 text-[11px] leading-relaxed text-inksoft">
                        {r.description}
                      </p>
                      {active ? (
                        <span className="mt-1 w-full rounded-full bg-matcha px-3 py-1.5 text-xs font-bold text-white">
                          選択中
                        </span>
                      ) : (
                        <form action={selectRewardAction} className="mt-1 w-full">
                          <input type="hidden" name="rewardId" value={r.id} />
                          <SubmitButton
                            pendingLabel="切替中…"
                            className="w-full rounded-full border-2 border-matcha px-3 py-1.5 text-xs font-bold text-matcha-deep transition hover:bg-matcha hover:text-white disabled:opacity-50"
                          >
                            これにする
                          </SubmitButton>
                        </form>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="flex-1 text-[11px] leading-relaxed text-inkfaint">
                        レベル{r.requiredLevel}で解放されます
                      </p>
                      <span className="mt-1 w-full rounded-full bg-surface2 px-3 py-1.5 text-xs font-bold text-inkfaint">
                        🔒 レベル{r.requiredLevel}
                      </span>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
