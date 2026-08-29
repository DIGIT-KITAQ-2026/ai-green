import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  updateNicknameAction,
  updateTeamAction,
  changePasswordAction,
} from "@/app/actions/settings";
import { logoutAction } from "@/app/actions/auth";
import TeamPicker from "@/components/TeamPicker";
import SubmitButton from "@/components/SubmitButton";

const SAVED_MESSAGES: Record<string, string> = {
  nickname: "呼び方を更新しました",
  team: "所属チームを更新しました",
  password: "パスワードを変更しました",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { saved, error } = await searchParams;
  const teams = await prisma.team.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <h1 className="text-2xl font-semibold">設定</h1>

      {saved && SAVED_MESSAGES[saved] && (
        <p className="rounded-lg border border-tea/40 bg-tea-soft px-4 py-3 text-sm text-tea-strong">
          {SAVED_MESSAGES[saved]}
        </p>
      )}
      {error && <p className="banner-error">{error}</p>}

      <section id="nickname" className="card scroll-mt-24 p-6">
        <h2 className="mb-1 text-lg font-semibold">呼び方</h2>
        <p className="mb-4 text-sm text-inksoft">
          マスコットがあなたを呼ぶときの名前を設定できます。
        </p>
        <form action={updateNicknameAction} className="flex gap-3">
          <input
            name="nickname"
            defaultValue={user.nickname ?? ""}
            placeholder="例: だいちゃん"
            className="field-input"
          />
          <SubmitButton pendingLabel="保存中…">保存</SubmitButton>
        </form>
      </section>

      <section className="card p-6">
        <h2 className="mb-1 text-lg font-semibold">プロフィール</h2>
        <dl className="mb-4 grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-inkfaint">氏名</dt>
          <dd>{user.name}</dd>
          <dt className="text-inkfaint">ID</dt>
          <dd className="font-mono">{user.loginId}</dd>
          <dt className="text-inkfaint">権限</dt>
          <dd>{user.role === "admin" ? "先輩・管理者" : "新人"}</dd>
        </dl>
        <p className="field-label mb-2">所属チーム</p>
        <form action={updateTeamAction} className="flex flex-col gap-3">
          <TeamPicker teams={teams} defaultTeamId={user.teamId ?? undefined} />
          <SubmitButton pendingLabel="保存中…" className="btn-secondary self-start">
            所属を変更する
          </SubmitButton>
        </form>
      </section>

      <section className="card p-6">
        <h2 className="mb-1 text-lg font-semibold">パスワード変更</h2>
        <form action={changePasswordAction} className="flex flex-col gap-4">
          <div>
            <label className="field-label" htmlFor="currentPassword">
              現在のパスワード
            </label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              required
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="newPassword">
              新しいパスワード（8文字以上）
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              minLength={8}
              required
              className="field-input"
            />
          </div>
          <SubmitButton pendingLabel="変更中…" className="btn-secondary self-start">
            パスワードを変更
          </SubmitButton>
        </form>
      </section>

      <section className="card p-6">
        <h2 className="mb-3 text-lg font-semibold">ログアウト</h2>
        <form action={logoutAction}>
          <button type="submit" className="btn-ghost">
            ログアウトする
          </button>
        </form>
      </section>
    </div>
  );
}
