/**
 * ロゴ「新-cha-」。完成イメージでは緑地に白の丸ゴシックで、
 * 「新」だけ漢字なので少し大きく見えるようにサイズを分けている。
 */
export default function BrandLogo({
  className = "",
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const scale = {
    sm: "text-xl",
    md: "text-3xl",
    lg: "text-4xl sm:text-5xl",
  }[size];

  return (
    <span className={`brand-logo ${scale} ${className}`}>新-cha-</span>
  );
}
