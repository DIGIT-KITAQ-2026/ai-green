"use client";

import { useMemo, useState } from "react";
import { Icon } from "./IconSprite";

type Team = { id: string; name: string };

/**
 * 所属選択画面のプルダウン部分。手書きメモの「頭文字検索できたらhappy」に
 * 対応し、入力した文字でチーム名を絞り込めるようにしている。
 */
export default function TeamPicker({
  teams,
  name = "teamId",
  defaultTeamId,
}: {
  teams: Team[];
  name?: string;
  defaultTeamId?: string;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | undefined>(defaultTeamId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter((t) => t.name.toLowerCase().includes(q));
  }, [teams, query]);

  return (
    <div>
      <input type="hidden" name={name} value={selected ?? ""} />
      <div className="relative mb-2">
        <Icon
          name="list"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-inkfaint"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="チーム名で絞り込み（頭文字検索）"
          className="field-input pl-9"
        />
      </div>

      {/* 選択行が角丸の内側できれいに切れるよう、枠とスクロール領域を分けている。 */}
      <div className="overflow-hidden rounded-2xl border-2 border-ink/80 bg-surface">
        <div className="max-h-56 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="px-4 py-3 text-sm text-inkfaint">
              該当するチームがありません
            </p>
          )}
          {filtered.map((team) => (
            <button
              key={team.id}
              type="button"
              onClick={() => setSelected(team.id)}
              className={`block w-full border-b border-line px-4 py-2.5 text-left text-sm transition last:border-b-0 ${
                selected === team.id
                  ? "bg-matcha font-bold text-white"
                  : "bg-surface text-inksoft hover:bg-matcha-soft"
              }`}
            >
              {team.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
