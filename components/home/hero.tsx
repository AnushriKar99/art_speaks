import Image from "next/image";

export function Hero() {
  return (
    <section className="px-margin-mobile md:px-margin-desktop mb-16 pt-8 relative overflow-hidden">
      <div className="absolute inset-0 checkered-pattern z-[-1]" />
      <div className="max-w-4xl mx-auto text-center relative py-12">
        <div className="flex justify-center mb-8">
          <div className="w-40 h-52 md:w-48 md:h-64 rounded-[3rem] overflow-hidden border-4 border-white ring-4 ring-candy-pink/40 shadow-xl rotate-[-3deg] kawaii-float relative">
            <Image
              src="/brand/logo.png"
              alt="The artist of _a_r_t_speaks holding a basket of handmade pieces"
              fill
              sizes="(min-width: 768px) 12rem, 10rem"
              className="object-cover"
              priority
            />
          </div>
        </div>
        <h2 className="text-display-lg-mobile md:text-display-lg font-display-lg mb-6 text-primary leading-tight">
          A piece of heart in every creation.
        </h2>
        <p className="text-body-lg text-on-surface-variant mb-8 max-w-2xl mx-auto font-medium">
          Welcome to my little studio. I create objects that carry stories—
          handcrafted with love, intended to bring a whisper of whimsy to your
          everyday life.
        </p>
      </div>
    </section>
  );
}
