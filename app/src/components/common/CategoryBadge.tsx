import { TagIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/constants/schedule';
import { cn } from '@/lib/utils';
import type { Category } from '@/types/course';

interface CategoryBadgeProps {
  category: Category;
  onCycle?: () => void;
  className?: string;
}

export function CategoryBadge({ category, onCycle, className }: CategoryBadgeProps) {
  const colors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.OTHERS;

  const badge = (
    <Badge
      variant="outline"
      asChild={Boolean(onCycle)}
      className={cn('gap-1 border', colors.badge, className)}
    >
      {onCycle ? (
        <button type="button" onClick={onCycle}>
          <TagIcon />
          {CATEGORY_LABELS[category]}
        </button>
      ) : (
        <>
          <TagIcon />
          {CATEGORY_LABELS[category]}
        </>
      )}
    </Badge>
  );

  if (!onCycle) return badge;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent>Cliquer pour changer la catégorie</TooltipContent>
    </Tooltip>
  );
}
