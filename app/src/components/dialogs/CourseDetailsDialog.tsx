import { useEffect, useState } from 'react';
import { ExternalLinkIcon, PlusIcon, StarIcon, Trash2Icon } from 'lucide-react';
import { CategoryBadge } from '@/components/common/CategoryBadge';
import { DifficultyScale } from '@/components/common/DifficultyScale';
import { StarRating } from '@/components/common/StarRating';
import { CourseDiscussion } from '@/components/discussion/CourseDiscussion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { DAYS_FR } from '@/constants/schedule';
import type { CourseComment, ProcessedCourse } from '@/types/course';
import { courseKey, getSyllabusUrl } from '@/utils/courseUtils';

interface CourseDetailsDialogProps {
  course: ProcessedCourse | null;
  isSelected: boolean;
  rating: number;
  note: string;
  comments: CourseComment[];
  calendarId: string | null;
  calendarName?: string;
  onOpenChange: (open: boolean) => void;
  onSetRating: (course: ProcessedCourse, rating: number) => void;
  onSetNote: (course: ProcessedCourse, note: string) => void;
  onToggleCourse: (course: ProcessedCourse) => void;
  onSendComment: (courseKey: string, body: string) => Promise<void>;
  onDeleteComment: (courseKey: string, commentId: string) => Promise<void>;
  onRequireAuth: () => void;
}

export function CourseDetailsDialog({
  course,
  isSelected,
  rating,
  note,
  comments,
  calendarId,
  calendarName,
  onOpenChange,
  onSetRating,
  onSetNote,
  onToggleCourse,
  onSendComment,
  onDeleteComment,
  onRequireAuth
}: CourseDetailsDialogProps) {
  const [draftNote, setDraftNote] = useState(note);

  useEffect(() => {
    setDraftNote(note);
  }, [note, course?.COUR_CD, course?.COUR_CLS]);

  if (!course) return null;

  const key = courseKey(course);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          {/* pr-8 keeps the badge clear of the dialog's absolute close button. */}
          <div className="flex items-center justify-between gap-2 pr-8">
            <span className="text-muted-foreground font-mono text-sm font-semibold">{key}</span>
            <CategoryBadge category={course.category} />
          </div>
          <DialogTitle className="text-base leading-snug">{course.COUR_NM}</DialogTitle>
          <DialogDescription className="text-xs">
            {course.college} · {course.DEPARTMENT || 'Département non précisé'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details">
          <TabsList className="w-full">
            <TabsTrigger value="details">Détails & avis</TabsTrigger>
            <TabsTrigger value="discussion">Discussion ({comments.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="flex flex-col gap-4">
            <div className="bg-muted/50 flex items-center justify-between rounded-lg px-3 py-2">
              <span className="flex items-center gap-1.5 text-xs font-medium">
                <StarIcon className="fill-warning text-warning size-4" />
                Note d’intérêt
              </span>
              <StarRating rating={rating} size="md" onRate={value => onSetRating(course, value)} />
            </div>

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="course-note">Notes personnelles</FieldLabel>
                <Textarea
                  id="course-note"
                  value={draftNote}
                  onChange={event => {
                    setDraftNote(event.target.value);
                    onSetNote(course, event.target.value);
                  }}
                  placeholder="Remarques, retours d’anciens étudiants, charge de travail…"
                  className="min-h-24 resize-none text-xs"
                />
                <FieldDescription>
                  Visible seulement par vous, et publié avec votre calendrier.
                </FieldDescription>
              </Field>
            </FieldGroup>

            <Separator />

            <dl className="text-muted-foreground flex flex-col gap-1.5 text-xs">
              <div className="flex items-center gap-1.5">
                <dt className="font-medium">Prof :</dt>
                <dd className="text-foreground">{course.PROF_NM || 'Non spécifié'}</dd>
              </div>
              <div className="flex items-start gap-1.5">
                <dt className="shrink-0 font-medium">Horaires :</dt>
                <dd className="text-foreground flex flex-col gap-0.5">
                  {course.parsedSchedules.length > 0 ? (
                    course.parsedSchedules.map((schedule, index) => (
                      <span key={index}>
                        <span className="font-semibold">
                          {DAYS_FR[schedule.day] || schedule.day}
                        </span>{' '}
                        P{schedule.periods.join('-')} · {schedule.room || 'N/A'}
                      </span>
                    ))
                  ) : (
                    <span className="italic">Non planifié</span>
                  )}
                </dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt className="font-medium">Crédits :</dt>
                <dd className="text-foreground">{course.CREDIT}</dd>
              </div>
            </dl>

            <Separator />

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[10px] font-semibold uppercase">
                  Langue
                </span>
                <Badge variant="outline">{course.isEnglish ? '🇬🇧 Anglais' : '🇰🇷 Coréen'}</Badge>
              </div>
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
                <Badge variant={course.openToExchange ? 'secondary' : 'destructive'}>
                  {course.openToExchange ? 'Ouvert' : 'Fermé'}
                </Badge>
              </div>
              {course.seatsLimited && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-[10px] font-semibold uppercase">
                    Places (L)
                  </span>
                  <Badge variant="outline">Limitées</Badge>
                </div>
              )}
            </div>

            <Button variant="outline" asChild>
              <a href={getSyllabusUrl(course)} target="_blank" rel="noopener noreferrer">
                <ExternalLinkIcon data-icon="inline-start" />
                Syllabus officiel (Korea University)
              </a>
            </Button>
          </TabsContent>

          <TabsContent value="discussion">
            <CourseDiscussion
              courseKey={key}
              comments={comments}
              calendarId={calendarId}
              calendarName={calendarName}
              onSend={onSendComment}
              onDelete={onDeleteComment}
              onRequireAuth={onRequireAuth}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button
            variant={isSelected ? 'destructive' : 'default'}
            onClick={() => {
              onToggleCourse(course);
              onOpenChange(false);
            }}
          >
            {isSelected ? (
              <>
                <Trash2Icon data-icon="inline-start" />
                Retirer de l’emploi du temps
              </>
            ) : (
              <>
                <PlusIcon data-icon="inline-start" />
                Ajouter à l’emploi du temps
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
