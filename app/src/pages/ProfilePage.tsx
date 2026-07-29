import { useEffect, useState } from 'react';
import {
  ArrowLeftIcon,
  AtSignIcon,
  CalendarIcon,
  ClockIcon,
  DownloadIcon,
  GlobeIcon,
  LockIcon,
  MessagesSquareIcon,
  SettingsIcon,
  StarIcon,
  UserRoundIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { StarRating } from '@/components/common/StarRating';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { navigate, routes } from '@/hooks/useRouter';
import { ApiError, calendarApi, userApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { CalendarSummary, ProcessedCourse, Profile, ProfileRating } from '@/types/course';

interface ProfilePageProps {
  handle: string;
  /** Changing this value reloads the profile (e.g. after an access change). */
  refreshToken?: number;
  activeCalendarId: string | null;
  onOpenCalendar: (id: string) => void;
  onManageAccess: (calendar: CalendarSummary) => void;
  /** Resolves a course key against the loaded catalog, when it is known. */
  findCourse: (courseKey: string) => ProcessedCourse | undefined;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export function ProfilePage({
  handle,
  refreshToken,
  activeCalendarId,
  onOpenCalendar,
  onManageAccess,
  findCourse
}: ProfilePageProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [calendars, setCalendars] = useState<CalendarSummary[]>([]);
  const [ratings, setRatings] = useState<ProfileRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    const load = async () => {
      try {
        const { profile: found } = await userApi.get(handle);
        if (cancelled) return;
        setProfile(found);

        const [calendarRes, ratingRes] = await Promise.all([
          calendarApi.list(found.id),
          userApi.ratings(found.id)
        ]);
        if (cancelled) return;
        setCalendars(calendarRes.calendars);
        setRatings(ratingRes.ratings);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else toast.error(err instanceof ApiError ? err.message : 'Chargement du profil impossible.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [handle, refreshToken]);

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 p-4 md:p-6">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col p-4 md:p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UserRoundIcon />
            </EmptyMedia>
            <EmptyTitle>Profil introuvable</EmptyTitle>
            <EmptyDescription>Ce pseudo ne correspond à aucun compte.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-4 md:p-6">
      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        onClick={() => navigate(routes.profiles)}
      >
        <ArrowLeftIcon data-icon="inline-start" />
        Tous les profils
      </Button>

      <div className="flex flex-col gap-4 rounded-lg border p-5 sm:flex-row sm:items-center">
        <Avatar className="size-14">
          <AvatarFallback>{profile.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>

        <div className="flex flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-lg font-semibold tracking-tight">
              {profile.displayName}
            </h2>
            {profile.isSelf && <Badge variant="secondary">Vous</Badge>}
          </div>
          <span className="text-muted-foreground flex items-center gap-0.5 text-sm">
            <AtSignIcon className="size-3.5" />
            {profile.handle}
          </span>
          <div className="text-muted-foreground flex flex-wrap items-center gap-3 pt-1 text-xs">
            <span className="flex items-center gap-1">
              <CalendarIcon className="size-3.5" />
              {profile.calendarCount} calendrier(s)
            </span>
            <span className="flex items-center gap-1">
              <StarIcon className="size-3.5" />
              {profile.ratingCount} cours noté(s)
            </span>
            <span className="flex items-center gap-1">
              <ClockIcon className="size-3.5" />
              Inscrit le {formatDate(profile.createdAt)}
            </span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="calendars">
        <TabsList>
          <TabsTrigger value="calendars">Calendriers ({calendars.length})</TabsTrigger>
          <TabsTrigger value="ratings">Notes ({ratings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="calendars" className="flex flex-col gap-3 pt-4">
          {calendars.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CalendarIcon />
                </EmptyMedia>
                <EmptyTitle>Aucun calendrier visible</EmptyTitle>
                <EmptyDescription>
                  Ce profil n’a publié aucun calendrier public, ou ne vous a pas donné accès aux
                  siens.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            calendars.map(calendar => (
              <div
                key={calendar.id}
                className={cn(
                  'flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between',
                  activeCalendarId === calendar.id && 'border-primary/50 bg-muted/50'
                )}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-semibold">{calendar.name}</h4>
                    {calendar.visibility === 'public' ? (
                      <Badge variant="outline" className="gap-1">
                        <GlobeIcon />
                        Public
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <LockIcon />
                        {calendar.sharedCount} profil(s)
                      </Badge>
                    )}
                  </div>

                  {calendar.description && (
                    <p className="text-muted-foreground line-clamp-1 text-xs">
                      {calendar.description}
                    </p>
                  )}

                  <div className="text-muted-foreground flex flex-wrap items-center gap-3 pt-1 text-xs">
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="size-3.5" />
                      {calendar.courseCount} cours ({calendar.totalCredits} cr.)
                    </span>
                    <span className="flex items-center gap-1">
                      <MessagesSquareIcon className="size-3.5" />
                      {calendar.commentCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <ClockIcon className="size-3.5" />
                      {formatDate(calendar.updatedAt)}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5 self-end md:self-center">
                  {calendar.isOwner && (
                    <Button variant="outline" size="sm" onClick={() => onManageAccess(calendar)}>
                      <SettingsIcon data-icon="inline-start" />
                      Accès
                    </Button>
                  )}
                  <Button size="sm" onClick={() => onOpenCalendar(calendar.id)}>
                    <DownloadIcon data-icon="inline-start" />
                    Ouvrir
                  </Button>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="ratings" className="pt-4">
          {ratings.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <StarIcon />
                </EmptyMedia>
                <EmptyTitle>Aucune note</EmptyTitle>
                <EmptyDescription>Ce profil n’a encore noté aucun cours.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex flex-col rounded-lg border">
              {ratings.map((entry, index) => {
                const course = findCourse(entry.courseKey);
                return (
                  <div key={entry.courseKey}>
                    {index > 0 && <Separator />}
                    <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-medium">
                          {course?.COUR_NM || entry.courseKey}
                        </span>
                        <span className="text-muted-foreground truncate text-xs">
                          {course ? `${course.COUR_CD} · ${course.PROF_NM}` : 'Cours hors catalogue'}
                        </span>
                        {entry.note && (
                          <p className="text-muted-foreground mt-1 text-xs italic">{entry.note}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {entry.hasNote && !entry.note && (
                          <span className="text-muted-foreground text-xs">note privée</span>
                        )}
                        <StarRating rating={entry.rating} interactive={false} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
