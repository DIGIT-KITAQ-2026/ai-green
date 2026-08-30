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
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-[3px] border-dashed text-center transition ${
          compact ? "min-h-[72px] px-3 py-3 text-xs" : "min-h-[200px] px-4 py-10 text-sm"
        } ${
          isOver
            ? "border-matcha bg-matcha-soft text-matcha-deep"
            : "border-matcha/60 bg-surface text-inksoft hover:bg-matcha-soft/50"
        }`}
      >
        <Icon name="drop" className={compact ? "h-6 w-6" : "h-12 w-12"} strokeWidth={1.4} />
        <p className="font-bold">ファイルをドラッグ＆ドロップ</p>
        {!compact && <p>または、クリックして選択（画像 jpg/png・PDF）</p>}
        {fileNames.length > 0 && (
          <ul className="mt-1 flex flex-wrap justify-center gap-1.5">
            {fileNames.map((n) => (
              <li
                key={n}
                className="rounded-full border border-matcha-line bg-white px-2.5 py-0.5 text-[11px] text-ink"
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
