import { useCallback, useEffect, useState } from 'react';
import {
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  CopyIcon,
  DownloadIcon,
  GlobeIcon,
  MessagesSquareIcon,
  PlusIcon,
  RefreshCwIcon,
  SaveIcon,
  Share2Icon,
  Trash2Icon,
  UserIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import { ApiError, calendarApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { CalendarSummary, CommunityCalendar } from '@/types/course';

interface CommunityCalendarsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeCalendarId: string | null;
  canSaveActive: boolean;
  onSelectCalendar: (id: string) => void;
  onOpenCreate: () => void;
  onSaveActive: () => void;
  onDuplicate: (calendar: CommunityCalendar) => Promise<unknown>;
  onDelete: (id: string) => Promise<boolean>;
  onRequireAuth: () => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function CommunityCalendarsDialog({
  open,
  onOpenChange,
  activeCalendarId,
  canSaveActive,
  onSelectCalendar,
  onOpenCreate,
  onSaveActive,
  onDuplicate,
  onDelete,
  onRequireAuth
}: CommunityCalendarsDialogProps) {
  const { user } = useAuth();
  const [calendars, setCalendars] = useState<CalendarSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CalendarSummary | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await calendarApi.list();
      setCalendars(res.calendars);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void fetchList();
  }, [open, fetchList]);

  const handleShare = async (id: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('calendar', id);
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      toast.error('Copie impossible — copiez le lien depuis la barre d’adresse.');
    }
  };

  const handleDuplicate = async (summary: CalendarSummary) => {
    if (!user) {
      onRequireAuth();
      return;
    }
    try {
      const { calendar } = await calendarApi.get(summary.id);
      await onDuplicate(calendar);
      await fetchList();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Duplication impossible.');
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const ok = await onDelete(pendingDelete.id);
    setPendingDelete(null);
    if (ok) await fetchList();
  };

  const filtered = calendars.filter(calendar => {
    const needle = query.toLowerCase();
    return (
      calendar.name.toLowerCase().includes(needle) ||
      calendar.author.toLowerCase().includes(needle) ||
      calendar.description.toLowerCase().includes(needle)
    );
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GlobeIcon className="size-5" />
              Calendriers communautaires
            </DialogTitle>
            <DialogDescription>
              Tous les plannings publiés par les étudiants. Chargez-en un pour le consulter et
              discuter de ses cours.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <InputGroup className="md:w-72">
              <InputGroupAddon>
                <UserIcon />
              </InputGroupAddon>
              <InputGroupInput
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Rechercher par nom ou auteur…"
              />
            </InputGroup>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={fetchList}
                aria-label="Rafraîchir la liste"
              >
                <RefreshCwIcon className={cn(loading && 'animate-spin')} />
              </Button>

              {canSaveActive && (
                <Button variant="secondary" size="sm" onClick={onSaveActive}>
                  <SaveIcon data-icon="inline-start" />
                  Sauvegarder mes modifs
                </Button>
              )}

              <Button
                size="sm"
                onClick={() => {
                  if (!user) {
                    onRequireAuth();
                    return;
                  }
                  onOpenCreate();
                }}
              >
                <PlusIcon data-icon="inline-start" />
                Créer
              </Button>
            </div>
          </div>

          <ScrollArea className="-mx-1 flex-1">
            <div className="flex flex-col gap-3 px-1">
              {loading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-24 w-full rounded-lg" />
                ))
              ) : filtered.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <CalendarIcon />
                    </EmptyMedia>
                    <EmptyTitle>Aucun calendrier</EmptyTitle>
                    <EmptyDescription>
                      Soyez le premier à publier votre emploi du temps pour la communauté.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!user) {
                          onRequireAuth();
                          return;
                        }
                        onOpenCreate();
                      }}
                    >
                      <PlusIcon data-icon="inline-start" />
                      Créer un calendrier
                    </Button>
                  </EmptyContent>
                </Empty>
              ) : (
                filtered.map(calendar => {
                  const isActive = activeCalendarId === calendar.id;

                  return (
                    <div
                      key={calendar.id}
                      className={cn(
                        'flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between',
                        isActive && 'border-primary/50 bg-muted/50'
                      )}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-semibold">{calendar.name}</h4>
                          {isActive && (
                            <Badge variant="secondary" className="gap-1">
                              <CheckIcon />
                              Actif
                            </Badge>
                          )}
                          {calendar.isOwner && <Badge variant="outline">Mon calendrier</Badge>}
                        </div>

                        {calendar.description && (
                          <p className="text-muted-foreground line-clamp-1 text-xs">
                            {calendar.description}
                          </p>
                        )}

                        <div className="text-muted-foreground flex flex-wrap items-center gap-3 pt-1 text-xs">
                          <span className="flex items-center gap-1">
                            <UserIcon className="size-3.5" />
                            {calendar.author}
                          </span>
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleShare(calendar.id)}
                        >
                          {copiedId === calendar.id ? (
                            <>
                              <CheckIcon data-icon="inline-start" />
                              Copié
                            </>
                          ) : (
                            <>
                              <Share2Icon data-icon="inline-start" />
                              Lien
                            </>
                          )}
                        </Button>

                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label="Dupliquer ce calendrier"
                          onClick={() => void handleDuplicate(calendar)}
                        >
                          <CopyIcon />
                        </Button>

                        {calendar.isOwner && (
                          <Button
                            variant="destructive"
                            size="icon-sm"
                            aria-label="Supprimer ce calendrier"
                            onClick={() => setPendingDelete(calendar)}
                          >
                            <Trash2Icon />
                          </Button>
                        )}

                        {!isActive && (
                          <Button size="sm" onClick={() => onSelectCalendar(calendar.id)}>
                            <DownloadIcon data-icon="inline-start" />
                            Charger
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={next => !next && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce calendrier ?</AlertDialogTitle>
            <AlertDialogDescription>
              « {pendingDelete?.name} » et toutes ses discussions seront définitivement supprimés.
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
