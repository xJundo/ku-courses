import { useEffect, useMemo, useState } from 'react';
import {
  AtSignIcon,
  CalendarIcon,
  SearchIcon,
  StarIcon,
  UserRoundIcon,
  UsersIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { navigate, routes } from '@/hooks/useRouter';
import { ApiError, userApi } from '@/lib/api';
import type { Profile } from '@/types/course';

function initials(displayName: string) {
  return displayName.slice(0, 2).toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Directory of every account, with a shortcut to each profile page. */
export function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    userApi
      .list()
      .then(res => {
        if (!cancelled) setProfiles(res.users);
      })
      .catch(err => {
        if (!cancelled) toast.error(err instanceof ApiError ? err.message : 'Chargement impossible.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Filtered client-side: the whole directory is already loaded, and typing
  // should not wait for a round trip.
  const filtered = useMemo(() => {
    const needle = search.trim().replace(/^@+/, '').toLowerCase();
    if (!needle) return profiles;
    return profiles.filter(
      profile =>
        profile.displayName.toLowerCase().includes(needle) ||
        profile.handle.toLowerCase().includes(needle)
    );
  }, [profiles, search]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading flex items-center gap-2 text-xl font-semibold tracking-tight">
          <UsersIcon className="size-5" />
          Profils
        </h2>
        <p className="text-muted-foreground text-sm">
          Tous les étudiants inscrits. Ouvrez un profil pour voir ses calendriers et ses notes de
          cours.
        </p>
      </div>

      <InputGroup className="md:max-w-sm">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Rechercher un nom ou @pseudo…"
        />
      </InputGroup>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UserRoundIcon />
            </EmptyMedia>
            <EmptyTitle>Aucun profil</EmptyTitle>
            <EmptyDescription>
              {search ? 'Aucun profil ne correspond à cette recherche.' : 'Personne ne s’est encore inscrit.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profil</TableHead>
                <TableHead className="text-right">Calendriers</TableHead>
                <TableHead className="text-right">Notes</TableHead>
                <TableHead className="hidden md:table-cell">Inscrit le</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(profile => (
                <TableRow
                  key={profile.id}
                  className="cursor-pointer"
                  onClick={() => navigate(routes.profile(profile.handle))}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback className="text-xs">
                          {initials(profile.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="flex items-center gap-2 text-sm font-medium">
                          {profile.displayName}
                          {profile.isSelf && <Badge variant="outline">Vous</Badge>}
                        </span>
                        <span className="text-muted-foreground flex items-center gap-0.5 text-xs">
                          <AtSignIcon className="size-3" />
                          {profile.handle}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarIcon className="text-muted-foreground size-3.5" />
                      {profile.calendarCount}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className="inline-flex items-center gap-1.5">
                      <StarIcon className="text-muted-foreground size-3.5" />
                      {profile.ratingCount}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden text-xs md:table-cell">
                    {formatDate(profile.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={event => {
                        event.stopPropagation();
                        navigate(routes.profile(profile.handle));
                      }}
                    >
                      Voir le profil
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
