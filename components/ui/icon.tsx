/** Thin wrapper around the Material Symbols Outlined variable icon font. */
export function Icon({
  name,
  className = "",
  filled = false,
  style,
}: {
  name: string;
  className?: string;
  filled?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={`material-symbols-outlined${filled ? " icon-fill" : ""} ${className}`}
      style={style}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
