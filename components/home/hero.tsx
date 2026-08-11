export function Hero() {
  return (
    <section className="px-margin-mobile md:px-margin-desktop mb-16 pt-8 relative overflow-hidden">
      <div className="absolute inset-0 checkered-pattern z-[-1]" />
      <div className="max-w-4xl mx-auto text-center relative py-12">
        <h2 className="text-display-lg-mobile md:text-display-lg font-display-lg mb-6 text-primary leading-tight text-center">
          A Break from the Algorithms.
          <br />
          Just Pure Craft.
        </h2>
        <p className="text-body-lg text-on-surface-variant mb-8 max-w-2xl mx-auto font-medium">
          Welcome to my studio—where imagination meets passion. A home for
          everything handmade, from paintings and stitching to claywork and
          beyond.
        </p>
      </div>
    </section>
  );
}
