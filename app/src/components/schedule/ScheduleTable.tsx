import { CalendarIcon, MessageSquareIcon, MessagesSquareIcon, StarIcon } from 'lucide-react';
import { DifficultyScale } from '@/components/common/DifficultyScale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  DAYS_FR,
  DAYS_SHORT,
  PERIODS_MAP
} from '@/constants/schedule';
import { cn } from '@/lib/utils';
import type { CommentThreads, ProcessedCourse, SelectedStats } from '@/types/course';
import { courseKey } from '@/utils/courseUtils';

interface ScheduleTableProps {
  selectedCourses: ProcessedCourse[];
  selectedStats: SelectedStats;
  threads: CommentThreads;
  onClearAll: () => void;
  onSelectCourseDetails: (course: ProcessedCourse) => void;
}

export function ScheduleTable({
  selectedCourses,
  selectedStats,
  threads,
  onClearAll,
  onSelectCourseDetails
}: ScheduleTableProps) {
  return (
    <Card>
      <CardHeader className="gap-3">
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="size-4" />
          Mon emploi du temps hebdomadaire
        </CardTitle>
        {selectedCourses.length > 0 && (
          <CardAction>
            <Button variant="ghost" size="xs" onClick={onClearAll}>
              Tout vider
            </Button>
          </CardAction>
        )}

        {/* Legend: makes the per-category colours readable at a glance. */}
        <div className="flex flex-wrap items-center gap-3">
          {CATEGORY_ORDER.map(category => (
            <span key={category} className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
              <span className={cn('size-2.5 rounded-full', CATEGORY_COLORS[category].accent)} aria-hidden />
              {CATEGORY_LABELS[category]}
            </span>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-xs">
            <thead>
              <tr className="text-muted-foreground border-b text-[10px] uppercase">
                <th className="w-[10%] px-2 py-3 font-medium">Période</th>
                {DAYS_SHORT.map(day => (
                  <th
                    key={day}
                    className={cn(
                      'w-[15%] px-2 py-3 text-center font-semibold',
                      selectedStats.activeDays.has(day) && 'text-foreground bg-muted/50'
                    )}
                  >
                    {DAYS_FR[day]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(PERIODS_MAP).map(([periodIndex, info]) => (
                <tr key={periodIndex} className="border-b last:border-0">
                  <td className="text-muted-foreground px-2 py-3 font-mono text-[11px]">
                    <div className="font-semibold">P{periodIndex}</div>
                    <div className="text-[9px]">{info.start}</div>
                  </td>
                  {DAYS_SHORT.map(day => {
                    const coursesAtSlot = selectedCourses.filter(course =>
                      course.parsedSchedules.some(
                        schedule =>
                          schedule.day === day && schedule.periods.includes(Number(periodIndex))
                      )
                    );
                    const hasConflict = coursesAtSlot.length > 1;

                    return (
                      <td
                        key={day}
                        className={cn(
                          'border-l p-1.5 align-top',
                          hasConflict && 'bg-destructive/10'
                        )}
                      >
                        {coursesAtSlot.map(course => {
                          const key = courseKey(course);
                          const colors = CATEGORY_COLORS[course.category] ?? CATEGORY_COLORS.OTHERS;
                          const discussionCount = threads[key]?.length ?? 0;

                          return (
                            <button
                              key={key}
                              type="button"
                              title={`${course.COUR_NM} (${course.COUR_CD})\n${course.college}`}
                              onClick={() => onSelectCourseDetails(course)}
                              className={cn(
                                'flex w-full flex-col gap-1 rounded-lg border p-2 text-left text-[10px] leading-tight transition',
                                colors.grid,
                                hasConflict && 'ring-destructive ring-2',
                                !course.openToExchange && 'ring-destructive/60 ring-1'
                              )}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="truncate font-semibold">{course.COUR_CD}</span>
                                {course.rating > 0 && (
                                  <span className="flex shrink-0 items-center gap-0.5 text-[9px] font-semibold">
                                    <StarIcon className="fill-warning text-warning size-2.5" />
                                    {course.rating}
                                  </span>
                                )}
                              </div>
                              <span className="truncate text-[9px] opacity-80">{course.COUR_NM}</span>

                              <div className="flex flex-wrap items-center gap-1">
                                <DifficultyScale level={course.difficultyLevel} compact />
                                {course.seatsLimited && (
                                  <Badge variant="outline" className="px-1 py-0 text-[8px]">
                                    Limité
                                  </Badge>
                                )}
                                {course.comment && <MessageSquareIcon className="size-2.5" />}
                                {discussionCount > 0 && (
                                  <span className="flex items-center gap-0.5 text-[8px]">
                                    <MessagesSquareIcon className="size-2.5" />
                                    {discussionCount}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center justify-between text-[8px] opacity-70">
                                <span className="truncate">{course.PROF_NM || 'N/A'}</span>
                                <span className="font-mono">
                                  {course.parsedSchedules.find(schedule => schedule.day === day)?.room ||
                                    'N/A'}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
