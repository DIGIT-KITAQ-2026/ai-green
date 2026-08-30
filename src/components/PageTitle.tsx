/**
 * 各画面の見出し。完成イメージ共通の「極太タイトル＋下に緑のバー」。
 * 右側には新規追加ボタンなどの操作を置けるようにしている。
 */
export default function PageTitle({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="page-title">{children}</h1>
        <div className="page-title-bar" />
      </div>
      {action}
    </div>
  );
}
