import { useCallback, useEffect, useMemo, useState } from 'react';
import { AtSignIcon, GlobeIcon, LockIcon, SearchIcon, UsersIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { ApiError, calendarApi, userApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { CalendarSummary, CalendarVisibility, Profile } from '@/types/course';

interface CalendarAccessDialogProps {
  /** The calendar whose access is being edited; `null` keeps the dialog closed. */
  calendar: CalendarSummary | null;
  onOpenChange: (open: boolean) => void;
  onSave: (
    id: string,
    visibility: CalendarVisibility,
    sharedWith: string[]
  ) => Promise<unknown>;
}

export function CalendarAccessDialog({
  calendar,
  onOpenChange,
  onSave
}: CalendarAccessDialogProps) {
  const [visibility, setVisibility] = useState<CalendarVisibility>('public');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  const calendarId = calendar?.id ?? null;

  // Reloads both the directory and the calendar's current allow-list each time
  // the dialog is opened on a calendar.
  useEffect(() => {
    if (!calendarId) return;
    let cancelled = false;

    setLoading(true);
    setSearch('');

    Promise.all([userApi.list(), calendarApi.getShares(calendarId)])
      .then(([directory, shares]) => {
        if (cancelled) return;
        setProfiles(directory.users.filter(profile => !profile.isSelf));
        setVisibility(shares.visibility);
        setSelected(new Set(shares.sharedWith.map(user => user.id)));
      })
      .catch(err => {
        if (!cancelled) {
          toast.error(err instanceof ApiError ? err.message : 'Chargement des accès impossible.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [calendarId]);

  const toggle = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /** A leading `@` narrows the search to handles. */
  const filtered = useMemo(() => {
    const raw = search.trim().toLowerCase();
    if (!raw) return profiles;

    const handleOnly = raw.startsWith('@');
    const needle = raw.replace(/^@+/, '');
    if (!needle) return profiles;

    return profiles.filter(profile =>
      handleOnly
        ? profile.handle.toLowerCase().includes(needle)
        : profile.handle.toLowerCase().includes(needle) ||
          profile.displayName.toLowerCase().includes(needle)
    );
  }, [profiles, search]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every(profile => selected.has(profile.id));

  const handleSubmit = async () => {
    if (!calendar) return;
    setPending(true);
    const saved = await onSave(
      calendar.id,
      visibility,
      visibility === 'restricted' ? [...selected] : []
    );
    setPending(false);
    if (saved) onOpenChange(false);
  };

  return (
    <Dialog open={Boolean(calendar)} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UsersIcon className="size-5" />
            Accès au calendrier
          </DialogTitle>
          <DialogDescription>
            « {calendar?.name} » — ouvrez-le à tout le monde, ou choisissez précisément qui peut le
            consulter.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={visibility}
          onValueChange={value => setVisibility(value as CalendarVisibility)}
          className="gap-2"
        >
          <Label
            htmlFor="visibility-public"
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-lg border p-3',
              visibility === 'public' && 'border-primary/50 bg-muted/50'
            )}
          >
            <RadioGroupItem value="public" id="visibility-public" className="mt-0.5" />
            <span className="flex flex-col gap-0.5">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <GlobeIcon className="size-4" />
                Tout le monde
              </span>
              <span className="text-muted-foreground text-xs font-normal">
                Visible dans les calendriers communautaires et par lien.
              </span>
            </span>
          </Label>

          <Label
            htmlFor="visibility-restricted"
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-lg border p-3',
              visibility === 'restricted' && 'border-primary/50 bg-muted/50'
            )}
          >
            <RadioGroupItem value="restricted" id="visibility-restricted" className="mt-0.5" />
            <span className="flex flex-col gap-0.5">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <LockIcon className="size-4" />
                Seulement certains profils
              </span>
              <span className="text-muted-foreground text-xs font-normal">
                {selected.size > 0
                  ? `${selected.size} profil(s) sélectionné(s). Modifiable à tout moment.`
                  : 'Cochez ci-dessous les profils autorisés. Modifiable à tout moment.'}
              </span>
            </span>
          </Label>
        </RadioGroup>

        {/* `inert` rather than a visual disable: it also takes the search box
            and every checkbox out of the tab order while the calendar is public. */}
        <div
          className={cn('flex min-h-0 flex-1 flex-col gap-3', visibility === 'public' && 'opacity-50')}
          inert={visibility === 'public'}
        >
          <InputGroup>
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Rechercher un nom, ou @pseudo…"
            />
          </InputGroup>

          <ScrollArea className="min-h-0 flex-1 rounded-lg border">
            {loading ? (
              <div className="flex flex-col gap-2 p-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full rounded-md" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-muted-foreground p-6 text-center text-sm">
                {profiles.length === 0
                  ? 'Aucun autre profil inscrit pour le moment.'
                  : 'Aucun profil ne correspond à cette recherche.'}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        aria-label="Tout sélectionner"
                        checked={allFilteredSelected}
                        onCheckedChange={checked => {
                          setSelected(prev => {
                            const next = new Set(prev);
                            for (const profile of filtered) {
                              if (checked) next.add(profile.id);
                              else next.delete(profile.id);
                            }
                            return next;
                          });
                        }}
                      />
                    </TableHead>
                    <TableHead>Profil</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Calendriers</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(profile => (
                    <TableRow
                      key={profile.id}
                      className="cursor-pointer"
                      onClick={() => toggle(profile.id)}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selected.has(profile.id)}
                          onCheckedChange={() => toggle(profile.id)}
                          onClick={event => event.stopPropagation()}
                          aria-label={`Autoriser ${profile.displayName}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-7">
                            <AvatarFallback className="text-[10px]">
                              {profile.displayName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{profile.displayName}</span>
                            <span className="text-muted-foreground flex items-center gap-0.5 text-xs">
                              <AtSignIcon className="size-3" />
                              {profile.handle}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-right text-xs tabular-nums sm:table-cell">
                        {profile.calendarCount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="items-center sm:justify-between">
          <Badge variant="outline" className="hidden sm:inline-flex">
            {visibility === 'public'
              ? 'Ouvert à tout le monde'
              : `${selected.size} profil(s) autorisé(s)`}
          </Badge>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={pending || loading}>
              {pending ? <Spinner data-icon="inline-start" /> : <UsersIcon data-icon="inline-start" />}
              Enregistrer les accès
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
