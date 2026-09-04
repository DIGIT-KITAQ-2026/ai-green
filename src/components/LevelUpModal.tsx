"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "shincha:last-seen-level";

/**
 * レベルアップの通知ポップアップ。
 *
 * サーバーアクションは redirect() で終わるため、経験値付与の瞬間に
 * 「レベルが上がった」という結果を直接クライアントへ返せない。
 * 代わりに、レイアウトから渡ってくる現在のレベルを前回表示時の値
 * （localStorage）と比べ、増えていれば初めて気づいたタイミングで表示する。
 *
 * 初回アクセス（保存値なし）では出さない。既に到達済みのレベルを
 * 「上がった」と誤解させないため。
 */
export default function LevelUpModal({ level }: { level: number }) {
  const [shownLevel, setShownLevel] = useState<number | null>(null);

  useEffect(() => {
    let lastSeen: number | null = null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      lastSeen = raw ? Number(raw) : null;
    } catch {
      // 読めない場合はポップアップを出さず、今のレベルを基準にする
    }

    if (lastSeen !== null && level > lastSeen) {
      setShownLevel(level);
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, String(level));
    } catch {
      // 保存できなくても表示自体は動く
    }
  }, [level]);

  if (shownLevel === null) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="level-up-title"
    >
      <div className="w-full max-w-sm rounded-card bg-surface p-6 text-center shadow-lift">
        <p className="text-4xl">🎉</p>
        <h2 id="level-up-title" className="mt-2 font-display text-lg font-bold text-ink">
          レベルが上がりました！
        </h2>
        <p className="mt-1 text-sm text-inksoft">レベル {shownLevel} になりました</p>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => setShownLevel(null)}
            autoFocus
            className="rounded-full bg-matcha px-6 py-2 text-sm font-bold text-white transition hover:bg-matcha-deep"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
