import { LogInIcon, LogOutIcon, UserRoundIcon, UsersIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import { navigate, routes } from '@/hooks/useRouter';

interface UserMenuProps {
  onOpenAuth: () => void;
}

export function UserMenu({ onOpenAuth }: UserMenuProps) {
  const { user, loading, logout } = useAuth();

  if (loading) return <Skeleton className="size-8 rounded-full" />;

  if (!user) {
    return (
      <Button variant="outline" size="sm" onClick={onOpenAuth}>
        <LogInIcon data-icon="inline-start" />
        Se connecter
      </Button>
    );
  }

  const initials = user.displayName.slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Mon compte">
          <Avatar className="size-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold">{user.displayName}</span>
            <span className="text-muted-foreground truncate text-xs font-normal">
              @{user.handle}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => navigate(routes.profile(user.handle))}>
            <UserRoundIcon />
            Mon profil
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate(routes.profiles)}>
            <UsersIcon />
            Tous les profils
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={async () => {
              await logout();
              toast.success('Vous êtes déconnecté.');
            }}
          >
            <LogOutIcon />
            Se déconnecter
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
