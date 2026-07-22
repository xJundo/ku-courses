import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  onRate?: (r: number) => void;
  interactive?: boolean;
  size?: 'sm' | 'md';
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  onRate,
  interactive = true,
  size = 'sm'
}) => {
  const starSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5';
  return (
    <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onRate && onRate(star === rating ? 0 : star)}
          className={`${interactive ? 'hover:scale-125 transition-transform p-0.5 focus:outline-none' : 'cursor-default'}`}
          title={interactive ? (star === rating ? 'Supprimer la note' : `${star} étoile${star > 1 ? 's' : ''}`) : `${rating}/5 étoiles`}
        >
          <Star
            className={`${starSize} ${
              star <= rating
                ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]'
                : 'text-zinc-600 hover:text-amber-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
};
