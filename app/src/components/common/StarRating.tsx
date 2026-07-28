import { StarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  onRate?: (rating: number) => void;
  interactive?: boolean;
  size?: 'sm' | 'md';
}

export function StarRating({ rating, onRate, interactive = true, size = 'sm' }: StarRatingProps) {
  return (
    <div className="flex items-center gap-0.5" onClick={event => event.stopPropagation()}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onRate?.(star === rating ? 0 : star)}
          aria-label={star === rating ? 'Retirer la note' : `Noter ${star} sur 5`}
          className={cn(
            'focus-visible:ring-ring/50 rounded-sm p-0.5 focus-visible:ring-[3px] focus-visible:outline-none',
            interactive ? 'transition-transform hover:scale-115' : 'cursor-default'
          )}
        >
          <StarIcon
            className={cn(
              size === 'sm' ? 'size-3.5' : 'size-5',
              star <= rating ? 'fill-warning text-warning' : 'text-muted-foreground/50'
            )}
          />
        </button>
      ))}
    </div>
  );
}
