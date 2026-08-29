"use client";

import { useRef, useState } from "react";
import { Icon } from "./IconSprite";

/** 業務内容登録・チャット添付で共用するドラッグ&ドロップ式ファイル選択欄。 */
export default function Dropzone({
  name = "files",
  compact = false,
}: {
  name?: string;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [isOver, setIsOver] = useState(false);

  function applyFiles(fileList: FileList | File[]) {
    const dt = new DataTransfer();
    Array.from(fileList).forEach((f) => dt.items.add(f));
    if (inputRef.current) inputRef.current.files = dt.files;
    setFileNames(Array.from(fileList).map((f) => f.name));
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsOver(true);
        }}
        onDragLeave={() => setIsOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsOver(false);
          if (e.dataTransfer.files.length) applyFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed text-center transition ${
          compact ? "min-h-[64px] px-3 py-3 text-xs" : "min-h-[140px] px-4 py-8 text-sm"
        } ${
          isOver
            ? "border-tea bg-tea-soft text-tea-strong"
            : "border-pencil bg-surface2 text-inkfaint"
        }`}
      >
        <Icon name="drop" className={compact ? "h-5 w-5" : "h-7 w-7"} />
        <p className="font-bold">ファイルをドラッグ＆ドロップ</p>
        {!compact && <p>または、クリックして選択（画像 jpg/png・PDF）</p>}
        {fileNames.length > 0 && (
          <ul className="mt-1 flex flex-wrap justify-center gap-1.5">
            {fileNames.map((n) => (
              <li
                key={n}
                className="rounded border border-line bg-surface px-2 py-0.5 font-mono text-[11px] text-ink"
              >
                {n}
              </li>
            ))}
          </ul>
        )}
        <input
          ref={inputRef}
          type="file"
          name={name}
          multiple
          accept="image/png,image/jpeg,application/pdf"
          className="hidden"
          onChange={(e) =>
            e.target.files &&
            setFileNames(Array.from(e.target.files).map((f) => f.name))
          }
        />
      </div>
    </div>
  );
}
