import {
  updateMemberRoleAction,
  updateMemberActiveAction,
} from "@/app/actions/settings";
import SubmitButton from "./SubmitButton";
import ConfirmSubmitButton from "./ConfirmSubmitButton";

export type ManagedMember = {
  id: string;
  name: string;
  loginId: string;
  role: string;
  isActive: boolean;
};

/**
 * 管理者が同じチームのメンバーを管理する表。
 * 権限の変更と、退職者のアカウント停止・再開ができる。
 * 自分自身は対象外にしている（最後の管理者が自分を降格・停止して詰むのを防ぐ）。
 */
export default function MemberManager({
  members,
  currentUserId,
}: {
  members: ManagedMember[];
  currentUserId: string;
}) {
  if (members.length === 0) {
    return (
      <p className="py-4 text-sm text-inkfaint">
        同じ部門に他のメンバーがいません。
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-line">
      {members.map((m) => {
        const isSelf = m.id === currentUserId;
        return (
          <li key={m.id} className="flex flex-wrap items-center gap-3 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink">
                {m.name}
                {isSelf && (
                  <span className="rounded-full bg-matcha-soft px-2 py-0.5 text-[10px] font-bold text-matcha-deep">
                    自分
                  </span>
                )}
                {!m.isActive && (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
                    停止中
                  </span>
                )}
              </p>
              <p className="font-mono text-[11px] text-inkfaint">{m.loginId}</p>
            </div>

            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                m.role === "admin"
                  ? "bg-matcha text-white"
                  : "bg-surface2 text-inksoft"
              }`}
            >
              {m.role === "admin" ? "先輩・管理者" : "新人"}
            </span>

            {!isSelf && (
              <div className="flex shrink-0 flex-wrap gap-2">
                <form action={updateMemberRoleAction}>
                  <input type="hidden" name="userId" value={m.id} />
                  <input
                    type="hidden"
                    name="role"
                    value={m.role === "admin" ? "member" : "admin"}
                  />
                  <SubmitButton
                    pendingLabel="変更中…"
                    className="rounded-full border border-line px-3 py-1.5 text-[11px] font-bold text-inksoft transition hover:border-matcha hover:text-matcha disabled:opacity-50"
                  >
                    {m.role === "admin" ? "新人にする" : "管理者にする"}
                  </SubmitButton>
                </form>

                <form action={updateMemberActiveAction}>
                  <input type="hidden" name="userId" value={m.id} />
                  <input type="hidden" name="active" value={m.isActive ? "0" : "1"} />
                  {m.isActive ? (
                    <ConfirmSubmitButton
                      confirmMessage={`${m.name}さんの利用を停止します。ログイン中の端末もその場でログアウトされます。よろしいですか？`}
                      pendingLabel="停止中…"
                      className="rounded-full border border-line px-3 py-1.5 text-[11px] font-bold text-inksoft transition hover:border-red-400 hover:text-red-600 disabled:opacity-50"
                    >
                      利用を停止
                    </ConfirmSubmitButton>
                  ) : (
                    <SubmitButton
                      pendingLabel="再開中…"
                      className="rounded-full border border-matcha px-3 py-1.5 text-[11px] font-bold text-matcha-deep transition hover:bg-matcha hover:text-white disabled:opacity-50"
                    >
                      利用を再開
                    </SubmitButton>
                  )}
                </form>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
