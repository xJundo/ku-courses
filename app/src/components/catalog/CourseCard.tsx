import {
  ExternalLinkIcon,
  MessageSquareIcon,
  MessagesSquareIcon,
  PlusIcon,
  Trash2Icon
} from 'lucide-react';
import { CategoryBadge } from '@/components/common/CategoryBadge';
import { DifficultyScale } from '@/components/common/DifficultyScale';
import { StarRating } from '@/components/common/StarRating';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CATEGORY_COLORS, DAYS_FR } from '@/constants/schedule';
import { cn } from '@/lib/utils';
import type { ProcessedCourse } from '@/types/course';
import { courseKey, getSyllabusUrl } from '@/utils/courseUtils';

interface CourseCardProps {
  course: ProcessedCourse;
  isSelected: boolean;
  discussionCount: number;
  onToggle: (course: ProcessedCourse) => void;
  onCycleCategory: (course: ProcessedCourse) => void;
  onSetRating: (course: ProcessedCourse, rating: number) => void;
  onOpenDetails: (course: ProcessedCourse) => void;
}

export function CourseCard({
  course,
  isSelected,
  discussionCount,
  onToggle,
  onCycleCategory,
  onSetRating,
  onOpenDetails
}: CourseCardProps) {
  const colors = CATEGORY_COLORS[course.category] ?? CATEGORY_COLORS.OTHERS;

  return (
    <Card
      size="sm"
      className={cn(
        'relative pl-1 transition-shadow',
        isSelected && 'ring-primary/50 shadow-md ring-2',
        !course.openToExchange && 'ring-destructive/40'
      )}
    >
      {/* Category stripe: the fastest way to tell course types apart in a grid. */}
      <span className={cn('absolute inset-y-0 left-0 w-1', colors.accent)} aria-hidden />

      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground font-mono text-[11px] font-semibold">
            {courseKey(course)}
          </span>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px]">
              {course.isEnglish ? '🇬🇧 Anglais' : '🇰🇷 Coréen'}
            </Badge>
            <CategoryBadge
              category={course.category}
              onCycle={() => onCycleCategory(course)}
              className="text-[10px]"
            />
          </div>
        </div>
        <CardTitle className="line-clamp-2 text-sm">{course.COUR_NM}</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <div className="bg-muted/50 flex items-center justify-between rounded-lg px-2.5 py-1.5">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-[10px] font-semibold uppercase">Note</span>
            <StarRating rating={course.rating} onRate={rating => onSetRating(course, rating)} />
          </div>
          <div className="flex items-center gap-1">
            {discussionCount > 0 && (
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <MessagesSquareIcon />
                {discussionCount}
              </Badge>
            )}
            <Button variant="ghost" size="xs" onClick={() => onOpenDetails(course)}>
              <MessageSquareIcon data-icon="inline-start" />
              {course.comment ? 'Avis' : 'Noter'}
            </Button>
          </div>
        </div>

        {course.comment && (
          <button
            type="button"
            onClick={() => onOpenDetails(course)}
            className="border-border hover:bg-muted/50 rounded-lg border border-dashed px-2.5 py-2 text-left text-[11px] italic"
          >
            <span className="line-clamp-2">{course.comment}</span>
          </button>
        )}

        <dl className="text-muted-foreground flex flex-col gap-1 text-[11px]">
          <div className="flex items-start gap-1.5">
            <dt className="shrink-0 font-medium">Collège :</dt>
            <dd className="text-foreground leading-tight">{course.college}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt className="shrink-0 font-medium">Dépt :</dt>
            <dd className="text-foreground truncate">{course.DEPARTMENT || 'N/A'}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt className="shrink-0 font-medium">Prof :</dt>
            <dd className="text-foreground truncate">{course.PROF_NM || 'Non spécifié'}</dd>
          </div>
          <div className="flex items-start gap-1.5">
            <dt className="shrink-0 font-medium">Horaires :</dt>
            <dd className="text-foreground flex flex-col gap-0.5">
              {course.parsedSchedules.length > 0 ? (
                course.parsedSchedules.map((schedule, index) => (
                  <span key={index} className="leading-tight">
                    <span className="font-semibold">{DAYS_FR[schedule.day] || schedule.day}</span> P
                    {schedule.periods.join('-')} · {schedule.room || 'N/A'}
                  </span>
                ))
              ) : (
                <span className="text-muted-foreground italic">Non planifié</span>
              )}
            </dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt className="shrink-0 font-medium">Crédits :</dt>
            <dd className="text-foreground">{course.CREDIT}</dd>
          </div>
        </dl>

        <Separator />

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-[10px] font-semibold uppercase">
              Difficulté
            </span>
            <DifficultyScale level={course.difficultyLevel} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-[10px] font-semibold uppercase">
              Échange (X)
            </span>
            <Badge variant={course.openToExchange ? 'secondary' : 'destructive'} className="text-[10px]">
              {course.openToExchange ? 'Ouvert' : 'Fermé'}
            </Badge>
          </div>
          {course.seatsLimited && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[10px] font-semibold uppercase">
                Places (L)
              </span>
              <Badge variant="outline" className="text-[10px]">
                Limitées
              </Badge>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="xs" onClick={() => onOpenDetails(course)}>
            Détails
          </Button>
          <Button variant="ghost" size="xs" asChild>
            <a href={getSyllabusUrl(course)} target="_blank" rel="noopener noreferrer">
              <ExternalLinkIcon data-icon="inline-start" />
              Syllabus
            </a>
          </Button>
        </div>

        <Button
          variant={isSelected ? 'destructive' : 'default'}
          size="sm"
          onClick={() => onToggle(course)}
        >
          {isSelected ? (
            <>
              <Trash2Icon data-icon="inline-start" />
              Retirer
            </>
          ) : (
            <>
              <PlusIcon data-icon="inline-start" />
              Ajouter
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
