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
import PageTitle from "@/components/PageTitle";
import Mascot from "@/components/Mascot";

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
    <div className="max-w-2xl">
      <PageTitle>設定</PageTitle>

      {saved && SAVED_MESSAGES[saved] && (
        <p className="banner-ok mb-6">{SAVED_MESSAGES[saved]}</p>
      )}
      {error && <p className="banner-error mb-6">{error}</p>}

      <div className="flex flex-col gap-6">
        <section
          id="nickname"
          className="card scroll-mt-24 rounded-tile border-matcha-line bg-matcha-soft p-6"
        >
          <div className="mb-4 flex items-center gap-4">
            <Mascot size={64} />
            <div>
              <h2 className="section-title">呼び方</h2>
              <p className="text-sm text-inksoft">
                マスコットがあなたを呼ぶときの名前を設定できます。
              </p>
            </div>
          </div>
          <form action={updateNicknameAction} className="flex flex-wrap gap-3">
            <input
              name="nickname"
              defaultValue={user.nickname ?? ""}
              placeholder="例: だいちゃん"
              className="field-input flex-1 basis-52"
            />
            <SubmitButton pendingLabel="保存中…" className="btn-secondary">
              保存
            </SubmitButton>
          </form>
        </section>

        <section className="card rounded-tile p-6">
          <h2 className="section-title mb-3">プロフィール</h2>
          <dl className="mb-5 grid grid-cols-[auto,1fr] gap-x-5 gap-y-1.5 text-sm">
            <dt className="text-inkfaint">氏名</dt>
            <dd>{user.name}</dd>
            <dt className="text-inkfaint">ID</dt>
            <dd className="font-mono">{user.loginId}</dd>
            <dt className="text-inkfaint">権限</dt>
            <dd>{user.role === "admin" ? "先輩・管理者" : "新人"}</dd>
          </dl>
          <p className="field-label">所属チーム</p>
          <form action={updateTeamAction} className="flex flex-col gap-3">
            <TeamPicker teams={teams} defaultTeamId={user.teamId ?? undefined} />
            <SubmitButton pendingLabel="保存中…" className="btn-secondary self-start">
              所属を変更する
            </SubmitButton>
          </form>
        </section>

        <section className="card rounded-tile p-6">
          <h2 className="section-title mb-4">パスワード変更</h2>
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

        <section className="card rounded-tile p-6">
          <h2 className="section-title mb-4">ログアウト</h2>
          <form action={logoutAction}>
            <button type="submit" className="btn-ghost">
              ログアウトする
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
