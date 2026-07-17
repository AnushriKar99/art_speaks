/** Rotated "sticker" badge with hard offset shadow. */
export function BadgeSticker({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`badge-sticker ${className}`}>{children}</div>;
}
