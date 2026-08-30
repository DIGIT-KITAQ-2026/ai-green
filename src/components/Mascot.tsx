import Image from "next/image";

/**
 * 湯呑みマスコット。完成イメージでは常に白い円の中に置かれているので、
 * 既定では円の座布団つきで描画する（緑地の上でも輪郭が沈まない）。
 */
export default function Mascot({
  size = 96,
  circle = true,
  priority = false,
  className = "",
  accent,
  src = "/mascot.png",
}: {
  size?: number;
  circle?: boolean;
  priority?: boolean;
  className?: string;
  /** 選択中のキャラクター／着せ替えの色。円の背景に使う。 */
  accent?: string;
  /** 専用イラストがあるときの画像パス。未指定なら既定のマスコット。 */
  src?: string;
}) {
  const img = (
    <Image
      src={src}
      alt="新-cha- のマスコット"
      width={size}
      height={size}
      priority={priority}
      // 円の内側にきれいに収まるよう、少しだけ内側に描く。
      style={circle ? { width: size * 0.78, height: size * 0.78 } : undefined}
      className="select-none"
    />
  );

  if (!circle) {
    return (
      <span className={className} style={{ display: "inline-flex" }}>
        {img}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${
        accent ? "" : "bg-white"
      } ${className}`}
      style={{ width: size, height: size, ...(accent ? { backgroundColor: accent } : {}) }}
    >
      {img}
    </span>
  );
}
