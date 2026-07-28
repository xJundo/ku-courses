import { TagIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/constants/schedule';
import { cn } from '@/lib/utils';
import type { Category } from '@/types/course';

interface CategoryBadgeProps {
  category: Category;
  onCycle?: () => void;
  className?: string;
}

/**
 * Deliberately uses a native `title` rather than a Radix `Tooltip`: this badge
 * renders once per course card, so a tooltip instance each would mount hundreds
 * of floating-ui subscriptions and dominate the catalog's render cost.
 */
export function CategoryBadge({ category, onCycle, className }: CategoryBadgeProps) {
  const colors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.OTHERS;

  return (
    <Badge
      variant="outline"
      asChild={Boolean(onCycle)}
      className={cn('gap-1 border', colors.badge, className)}
    >
      {onCycle ? (
        <button type="button" onClick={onCycle} title="Cliquer pour changer la catégorie">
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
}
