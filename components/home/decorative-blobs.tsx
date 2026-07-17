/** Fixed, non-interactive kawaii blobs + doodles behind the homepage. */
export function DecorativeBlobs() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
      <div className="kawaii-blob top-[5%] left-[-5%] w-64 h-64 bg-candy-pink/20 wobbly-border animate-pulse" />
      <div
        className="kawaii-blob top-[20%] right-[-10%] w-80 h-80 bg-mint-green/20 wobbly-border"
        style={{ animation: "float 5s ease-in-out infinite" }}
      />
      <div
        className="kawaii-blob bottom-[10%] left-[5%] w-48 h-48 bg-lemon-yellow/30 wobbly-border"
        style={{ animation: "float 4s ease-in-out infinite reverse" }}
      />
      <svg
        className="absolute top-[15%] right-[10%] w-16 h-16 text-lavender-dream animate-bounce"
        fill="currentColor"
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <path d="M50,10 L60,40 L90,50 L60,60 L50,90 L40,60 L10,50 L40,40 Z" />
      </svg>
      <svg
        className="absolute bottom-[25%] left-[10%] w-20 h-20 text-candy-pink opacity-40 kawaii-float"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="8"
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <path d="M10,50 Q30,10 50,50 T90,50" />
      </svg>
    </div>
  );
}
