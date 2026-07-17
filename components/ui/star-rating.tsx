import { Icon } from "@/components/ui/icon";

export function StarRating({ rating = 5 }: { rating?: number }) {
  return (
    <div
      className="flex gap-1 text-candy-pink"
      aria-label={`${rating} out of 5 stars`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <Icon
          key={i}
          name="star"
          filled={i < rating}
          className="text-[20px]"
        />
      ))}
    </div>
  );
}
