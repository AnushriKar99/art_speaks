export function Hero() {
  return (
    <section className="px-margin-mobile md:px-margin-desktop mb-16 pt-8 relative overflow-hidden">
      <div className="absolute inset-0 checkered-pattern z-[-1]" />
      <div className="max-w-4xl mx-auto text-center relative py-12">
        <h2 className="text-display-lg-mobile md:text-display-lg font-display-lg mb-6 text-primary leading-tight">
          A piece of heart in every creation.
        </h2>
        <p className="text-body-lg text-on-surface-variant mb-8 max-w-2xl mx-auto font-medium">
          Welcome to my little studio. I create objects that carry stories—
          handcrafted with love, intended to bring a whisper of whimsy to your
          everyday life.
        </p>
        <div className="flex justify-center gap-4">
          <button className="bg-white text-primary border-2 border-primary/20 px-8 py-4 rounded-full font-label-caps text-label-caps hover:bg-surface-container-high transition-colors">
            Artist&apos;s Note
          </button>
        </div>
      </div>
    </section>
  );
}
