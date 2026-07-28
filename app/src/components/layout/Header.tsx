import { CalendarDaysIcon, GlobeIcon, SaveIcon, SlidersIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';
import type { CommunityCalendar } from '@/types/course';

interface HeaderProps {
  activeCalendar: CommunityCalendar | null;
  onOpenCommunity: () => void;
  onSaveActiveCalendar: () => void;
  onOpenAuth: () => void;
}

export function Header({
  activeCalendar,
  onOpenCommunity,
  onSaveActiveCalendar,
  onOpenAuth
}: HeaderProps) {
  return (
    <header className="bg-background/80 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg">
            <CalendarDaysIcon className="size-5" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-base font-semibold tracking-tight">
                KU Sejong Planificateur
              </h1>
              {activeCalendar && (
                <Badge variant="secondary" asChild>
                  <button type="button" onClick={onOpenCommunity}>
                    <GlobeIcon />
                    {activeCalendar.name}
                  </button>
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              3 IT + 1 Business + 1 Coréen · Calendriers communautaires partagés
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onOpenCommunity}>
            <GlobeIcon data-icon="inline-start" />
            Communauté
          </Button>

          {activeCalendar?.isOwner && (
            <Button size="sm" onClick={onSaveActiveCalendar}>
              <SaveIcon data-icon="inline-start" />
              Sauvegarder
            </Button>
          )}

          {/* Import/export is switched off entirely — the menu is not just greyed
              out, none of its actions are wired up. */}
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0} className="inline-flex">
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  aria-disabled
                  className="pointer-events-none"
                >
                  <SlidersIcon data-icon="inline-start" />
                  Fichiers
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>À venir prochainement</TooltipContent>
          </Tooltip>

          <ThemeToggle />
          <UserMenu onOpenAuth={onOpenAuth} />
        </div>
      </div>
    </header>
  );
}
