import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getDifficultyColor, getDifficultyLabel } from '@/utils/courseUtils';

const MAX_SEGMENTS = 5;

interface DifficultyScaleProps {
  level: number | null;
  compact?: boolean;
}

export function DifficultyScale({ level, compact }: DifficultyScaleProps) {
  const filled = level ? Math.min(level, MAX_SEGMENTS) : 0;
  const color = getDifficultyColor(level);

  if (compact) {
    return (
      <Badge variant="outline" className="gap-1 px-1.5 py-0 text-[9px]">
        <span className={cn('size-1.5 rounded-full', color)} />N{level ?? '?'}
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5" aria-hidden>
        {Array.from({ length: MAX_SEGMENTS }).map((_, index) => (
          <span
            key={index}
            className={cn('h-1.5 w-3.5 rounded-sm', index < filled ? color : 'bg-muted')}
          />
        ))}
      </div>
      <span className="text-muted-foreground text-[10px]">{getDifficultyLabel(level)}</span>
    </div>
  );
}
