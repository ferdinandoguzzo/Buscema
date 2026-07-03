import { Star } from "lucide-react";

export const StarRating = ({ value, onChange }) => {
  return (
    <div className="flex items-center gap-2" data-testid="star-rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          data-testid={`star-rating-${n}`}
          onClick={() => onChange(n === value ? 0 : n)}
          className="p-1 transition-transform active:scale-90 hover:scale-110"
          aria-label={`${n} stelle`}
        >
          <Star
            className="w-9 h-9 transition-colors"
            strokeWidth={2}
            fill={n <= value ? "#C5A059" : "none"}
            color={n <= value ? "#C5A059" : "#D1D5DB"}
          />
        </button>
      ))}
    </div>
  );
};
