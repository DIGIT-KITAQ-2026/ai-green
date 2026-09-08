import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  updateProfileAction,
  updateTeamAction,
  changePasswordAction,
  revokeOtherSessionsAction,
  deleteAccountAction,
} from "@/app/actions/settings";
import { logoutAction } from "@/app/actions/auth";
import { rewardById } from "@/lib/rewards";
import TeamPicker from "@/components/TeamPicker";
import SubmitButton from "@/components/SubmitButton";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import SettingsNav from "@/components/SettingsNav";
import MemberManager, { ManagedMember } from "@/components/MemberManager";
import Mascot from "@/components/Mascot";
import PageTitle from "@/components/PageTitle";

const SAVED_MESSAGES: Record<string, string> = {
  profile: "氏名とIDを更新しました",
  team: "所属を更新しました",
  password: "パスワードを変更しました。他の端末のログインも解除されています",
  sessions: "他の端末のログインを解除しました",
  role: "権限を変更しました",
  deactivated: "利用を停止しました",
  reactivated: "利用を再開しました",
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

  const isAdmin = user.role === "admin";
  const members: ManagedMember[] = isAdmin && user.teamId
    ? await prisma.user.findMany({
        where: { teamId: user.teamId },
        orderBy: [{ role: "asc" }, { name: "asc" }],
        select: {
          id: true, name: true, loginId: true, role: true, isActive: true,
        },
      })
    : [];

  const [conversations, todos, notes, entries] = await Promise.all([
    prisma.conversation.count({ where: { userId: user.id } }),
    prisma.todo.count({ where: { userId: user.id } }),
    prisma.note.count({ where: { userId: user.id } }),
    prisma.taskEntry.count({ where: { createdById: user.id } }),
  ]);

  const reward = rewardById(user.selectedRewardId);

  const navItems = [
    { id: "profile", label: "プロフィール" },
    { id: "mascot", label: "マスコット" },
    { id: "security", label: "セキュリティ" },
    ...(isAdmin ? [{ id: "members", label: "メンバー管理" }] : []),
    { id: "account", label: "アカウント" },
  ];

  return (
    <div>
      <PageTitle>設定</PageTitle>

      {saved && SAVED_MESSAGES[saved] && (
        <p className="banner-ok mb-5">{SAVED_MESSAGES[saved]}</p>
      )}
      {error && <p className="banner-error mb-5">{error}</p>}

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-9">
        <div className="lg:w-44 lg:shrink-0">
          <SettingsNav items={navItems} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {/* プロフィール */}
          <section id="profile" className="card scroll-mt-8 rounded-tile p-6">
            <h2 className="section-title mb-4">プロフィール</h2>

            <form action={updateProfileAction} className="flex flex-col gap-4">
              <div>
                <label className="field-label" htmlFor="name">氏名</label>
                <input id="name" name="name" defaultValue={user.name} required className="field-input" />
              </div>
              <div>
                <label className="field-label" htmlFor="loginId">ID（社員ID・メールアドレスなど）</label>
                <input id="loginId" name="loginId" defaultValue={user.loginId} required className="field-input font-mono" />
                <p className="mt-1.5 text-[11px] text-inkfaint">
                  変更すると、次回のログインから新しいIDを使います。
                </p>
              </div>
              <SubmitButton pendingLabel="保存中…" className="btn-secondary self-start">
                保存
              </SubmitButton>
            </form>

            <div className="mt-6 border-t border-line pt-5">
              <p className="field-label">所属部門</p>
              <p className="mb-3 text-[11px] text-inkfaint">
                いまの所属: {user.team?.name ?? "未設定"} ／ 権限:{" "}
                {isAdmin ? "先輩・管理者" : "新人"}
              </p>
              <form action={updateTeamAction} className="flex flex-col gap-3">
                <TeamPicker teams={teams} defaultTeamId={user.teamId ?? undefined} />
                <SubmitButton pendingLabel="保存中…" className="btn-secondary self-start">
                  所属を変更する
                </SubmitButton>
              </form>
            </div>
          </section>

          {/* マスコット：呼び方と見た目をここに集めた */}
          <section
            id="mascot"
            className="card scroll-mt-8 rounded-tile border-matcha-line bg-matcha-soft p-6"
          >
            <h2 className="section-title mb-4">マスコット</h2>

            <div className="flex items-center gap-4">
              <Mascot size={64} accent={reward.accent} src={reward.image} />
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink">{reward.name}</p>
                <p className="text-xs leading-relaxed text-inksoft">{reward.description}</p>
                <Link
                  href="/character"
                  className="mt-1 inline-block text-xs font-bold text-matcha underline underline-offset-2 hover:text-matcha-deep"
                >
                  ほかのキャラクターに変える
                </Link>
              </div>
            </div>
            <p className="mt-4 text-[11px] text-inkfaint">
              マスコットは、プロフィールに登録した氏名であなたを呼びます。
            </p>
          </section>

          {/* セキュリティ */}
          <section id="security" className="card scroll-mt-8 rounded-tile p-6">
            <h2 className="section-title mb-4">セキュリティ</h2>

            <form action={changePasswordAction} className="flex flex-col gap-4">
              <div>
                <label className="field-label" htmlFor="currentPassword">現在のパスワード</label>
                <input id="currentPassword" name="currentPassword" type="password" required className="field-input" />
              </div>
              <div>
                <label className="field-label" htmlFor="newPassword">新しいパスワード（8文字以上）</label>
                <input id="newPassword" name="newPassword" type="password" minLength={8} required className="field-input" />
              </div>
              <SubmitButton pendingLabel="変更中…" className="btn-secondary self-start">
                パスワードを変更
              </SubmitButton>
            </form>

            <div className="mt-6 border-t border-line pt-5">
              <p className="mb-1 text-sm font-bold text-ink">他の端末からログアウト</p>
              <p className="mb-3 text-xs leading-relaxed text-inksoft">
                共用パソコンでログインしたままにした、端末をなくしたといったときに使います。
                この端末以外のログインをすべて解除します。
              </p>
              <form action={revokeOtherSessionsAction}>
                <ConfirmSubmitButton
                  confirmMessage="この端末以外のログインをすべて解除します。よろしいですか？"
                  pendingLabel="解除中…"
                  className="btn-ghost"
                >
                  他の端末からログアウトする
                </ConfirmSubmitButton>
              </form>
            </div>
          </section>

          {/* メンバー管理（管理者のみ） */}
          {isAdmin && (
            <section id="members" className="card scroll-mt-8 rounded-tile p-6">
              <h2 className="section-title mb-1">メンバー管理</h2>
              <p className="mb-4 text-xs leading-relaxed text-inksoft">
                {user.team?.name ?? "所属"}のメンバーです。権限の変更と、
                退職された方のアカウント停止ができます。停止しても、その方が登録した
                業務内容や共有メモはチームに残ります。
              </p>
              <MemberManager members={members} currentUserId={user.id} />
            </section>
          )}

          {/* アカウント */}
          <section id="account" className="card scroll-mt-8 rounded-tile p-6">
            <h2 className="section-title mb-4">ログアウト</h2>
            <form action={logoutAction}>
              <button type="submit" className="btn-ghost">ログアウトする</button>
            </form>
          </section>

          <section className="rounded-tile border-2 border-red-200 bg-red-50/60 p-6">
            <h2 className="section-title mb-1 text-red-700">アカウントの削除</h2>
            <p className="mb-4 text-sm leading-relaxed text-inksoft">
              アカウントを削除すると、
              <strong className="font-bold">チャットの履歴・ToDo・メモ</strong>
              はすべて消えます。元に戻すことはできません。
              <br />
              <strong className="font-bold">
                登録した業務内容とカレンダーの予定はチームに残ります
              </strong>
              （登録者の表示は「退会したユーザー」になります）。
            </p>

            <dl className="mb-4 flex flex-wrap gap-x-5 gap-y-1 rounded-xl bg-white px-4 py-3 text-xs">
              <div className="flex gap-1.5"><dt className="text-inkfaint">消えるチャット</dt><dd className="font-bold">{conversations}件</dd></div>
              <div className="flex gap-1.5"><dt className="text-inkfaint">消えるToDo</dt><dd className="font-bold">{todos}件</dd></div>
              <div className="flex gap-1.5"><dt className="text-inkfaint">消えるメモ</dt><dd className="font-bold">{notes}件</dd></div>
              <div className="flex gap-1.5"><dt className="text-inkfaint">チームに残る業務内容</dt><dd className="font-bold">{entries}件</dd></div>
            </dl>

            <form action={deleteAccountAction} className="flex flex-col gap-3">
              <div>
                <label className="field-label" htmlFor="deletePassword">
                  確認のため、パスワードを入力してください
                </label>
                <input id="deletePassword" name="password" type="password" required autoComplete="current-password" className="field-input max-w-sm" />
              </div>
              <ConfirmSubmitButton
                confirmMessage={`アカウント「${user.loginId}」を削除します。チャット履歴・ToDo・メモがすべて消え、元に戻せません。本当によろしいですか？`}
                pendingLabel="削除中…"
                className="self-start rounded-xl bg-red-600 px-6 py-2.5 font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                アカウントを削除する
              </ConfirmSubmitButton>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
