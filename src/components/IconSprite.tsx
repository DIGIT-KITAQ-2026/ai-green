/**
 * 全画面共通のモノラインアイコン定義。仕様書のワイヤーフレームに合わせた
 * シンプルな線画（湯呑み・本・チャット・歯車・人物など）。
 * ルートレイアウトで一度だけ描画し、各所で <Icon name="cup" /> のように使う。
 */
export default function IconSprite() {
  return (
    <svg
      aria-hidden="true"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <defs>
        <symbol id="ic-cup" viewBox="0 0 24 24">
          <path d="M6 10c0-1 .3-1.6 1-1.6h8c.7 0 1 .6 1 1.6v5.2c0 2-1.6 3.8-3.6 3.8H9.6C7.6 19 6 17.2 6 15.2V10z" />
          <path d="M16 11h1.6c1.1 0 2 .9 2 2v.4c0 1.1-.9 2-2 2H16" />
          <path d="M9 6.2c0-1 .5-1.4.9-2M12 6.2c0-1 .5-1.4.9-2M15 6.2c0-1 .3-1.2.6-1.8" />
        </symbol>
        <symbol id="ic-cup-face" viewBox="0 0 24 24">
          <path d="M6 10c0-1 .3-1.6 1-1.6h8c.7 0 1 .6 1 1.6v5.2c0 2-1.6 3.8-3.6 3.8H9.6C7.6 19 6 17.2 6 15.2V10z" />
          <path d="M16 11h1.6c1.1 0 2 .9 2 2v.4c0 1.1-.9 2-2 2H16" />
          <path d="M9 6.2c0-1 .5-1.4.9-2M12 6.2c0-1 .5-1.4.9-2M15 6.2c0-1 .3-1.2.6-1.8" />
          <circle cx="9.6" cy="12.6" r=".55" fill="currentColor" stroke="none" />
          <circle cx="14.4" cy="12.6" r=".55" fill="currentColor" stroke="none" />
          <path d="M9.8 15c.7.6 3.7.6 4.4 0" />
        </symbol>
        <symbol id="ic-book" viewBox="0 0 24 24">
          <path d="M12 6.5c-1.6-1-3.6-1.4-5.6-1.2-.5.05-.9.4-.9.9v10.6c0 .5.4.9.9.85 2-.2 4 .2 5.6 1.2 1.6-1 3.6-1.4 5.6-1.2.5.05.9-.3.9-.85V6.2c0-.5-.4-.85-.9-.9-2-.2-4 .2-5.6 1.2z" />
          <path d="M12 6.5v11.3" />
        </symbol>
        <symbol id="ic-chat" viewBox="0 0 24 24">
          <path d="M5 6.5h14c.8 0 1.5.7 1.5 1.5v6c0 .8-.7 1.5-1.5 1.5H10l-3.5 3v-3H5c-.8 0-1.5-.7-1.5-1.5V8c0-.8.7-1.5 1.5-1.5z" />
          <path d="M8 10.3h8M8 12.8h5" />
        </symbol>
        <symbol id="ic-gear" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="7" strokeDasharray="1.6 3.2" />
          <circle cx="12" cy="12" r="3.2" />
        </symbol>
        <symbol id="ic-person" viewBox="0 0 24 24">
          <circle cx="12" cy="7.6" r="3" />
          <path d="M5.5 19c0-3.6 2.9-5.6 6.5-5.6s6.5 2 6.5 5.6" />
        </symbol>
        <symbol id="ic-plus" viewBox="0 0 24 24">
          <path d="M12 5.5v13M5.5 12h13" />
        </symbol>
        <symbol id="ic-list" viewBox="0 0 24 24">
          <rect x="5" y="6" width="14" height="3.2" rx="1" />
          <rect x="5" y="10.4" width="14" height="3.2" rx="1" />
          <rect x="5" y="14.8" width="14" height="3.2" rx="1" />
        </symbol>
        <symbol id="ic-folder" viewBox="0 0 24 24">
          <path d="M4 7.5c0-.6.5-1 1-1h4.2l1.4 1.6H19c.6 0 1 .4 1 1v8c0 .6-.4 1-1 1H5c-.6 0-1-.4-1-1v-9.6z" />
        </symbol>
        <symbol id="ic-back" viewBox="0 0 24 24">
          <path d="M15 5.5 8 12l7 6.5M8.5 12H19" />
        </symbol>
        <symbol id="ic-drop" viewBox="0 0 24 24">
          <path d="M6 15v2.5c0 .8.7 1.5 1.5 1.5h9c.8 0 1.5-.7 1.5-1.5V15" />
          <path d="M12 4.5v9M8.5 10.5 12 14l3.5-3.5" />
        </symbol>
        <symbol id="ic-send" viewBox="0 0 24 24">
          <path d="M5 12 19 5l-4.5 14-3-6.5L5 12z" />
        </symbol>
        <symbol id="ic-calendar" viewBox="0 0 24 24">
          <rect x="3.5" y="5.5" width="17" height="15" rx="2" />
          <path d="M3.5 10h17M8 3.5v4M16 3.5v4" />
          <path d="M7.5 13.5h3M13.5 13.5h3M7.5 17h3M13.5 17h3" />
        </symbol>
        <symbol id="ic-check-list" viewBox="0 0 24 24">
          <path d="M4 7l1.8 1.8L9 5.5M4 16l1.8 1.8L9 14.5" />
          <path d="M12 7.5h8M12 16.5h8" />
        </symbol>
        <symbol id="ic-note" viewBox="0 0 24 24">
          <path d="M6 3.5h9L19.5 8v12.5h-13z" />
          <path d="M14.5 3.5V8H19" />
          <path d="M9 12h6M9 15.5h6" />
        </symbol>
        <symbol id="ic-star" viewBox="0 0 24 24">
          <path d="M12 4.2l2.3 4.9 5.2.7-3.8 3.7.9 5.3-4.6-2.5-4.6 2.5.9-5.3L4.5 9.8l5.2-.7z" />
        </symbol>
        <symbol id="ic-file" viewBox="0 0 24 24">
          <path d="M7 4.5h7l3.5 3.5v11.5H7z" />
          <path d="M14 4.5V8h3.5" />
        </symbol>
      </defs>
    </svg>
  );
}

const ICON_IDS = [
  "cup",
  "cup-face",
  "book",
  "chat",
  "gear",
  "person",
  "plus",
  "list",
  "folder",
  "calendar",
  "check-list",
  "note",
  "star",
  "back",
  "drop",
  "send",
  "file",
] as const;

export type IconName = (typeof ICON_IDS)[number];

export function Icon({
  name,
  className,
  strokeWidth = 1.6,
}: {
  name: IconName;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <use href={`#ic-${name}`} />
    </svg>
  );
}
