import { useRef } from 'react';
import type { ChangeEvent } from 'react';
import {
  CalendarDaysIcon,
  ClipboardIcon,
  DownloadIcon,
  FileJsonIcon,
  FolderOpenIcon,
  GlobeIcon,
  PlusCircleIcon,
  SaveIcon,
  SlidersIcon,
  SparklesIcon
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';
import type { CommunityCalendar } from '@/types/course';

interface HeaderProps {
  activeCalendar: CommunityCalendar | null;
  onAutoOptimize: () => void;
  onExportSession: () => void;
  onCatalogFileUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onSessionFileUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onOpenPasteDialog: () => void;
  onOpenCustomCourseDialog: () => void;
  onOpenCommunity: () => void;
  onSaveActiveCalendar: () => void;
  onOpenAuth: () => void;
}

export function Header({
  activeCalendar,
  onAutoOptimize,
  onExportSession,
  onCatalogFileUpload,
  onSessionFileUpload,
  onOpenPasteDialog,
  onOpenCustomCourseDialog,
  onOpenCommunity,
  onSaveActiveCalendar,
  onOpenAuth
}: HeaderProps) {
  const catalogInputRef = useRef<HTMLInputElement>(null);
  const sessionInputRef = useRef<HTMLInputElement>(null);

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

          <Button variant="secondary" size="sm" onClick={onAutoOptimize}>
            <SparklesIcon data-icon="inline-start" />
            Optimisation auto
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <SlidersIcon data-icon="inline-start" />
                Fichiers
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Session & sauvegarde</DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={onExportSession}>
                  <DownloadIcon />
                  Exporter ma session (.json)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => sessionInputRef.current?.click()}>
                  <FileJsonIcon />
                  Restaurer une session (.json)
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Catalogue & cours</DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => catalogInputRef.current?.click()}>
                  <FolderOpenIcon />
                  Charger un catalogue (.json)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenPasteDialog}>
                  <ClipboardIcon />
                  Coller du JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenCustomCourseDialog}>
                  <PlusCircleIcon />
                  Ajouter un cours sur-mesure
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <ThemeToggle />
          <UserMenu onOpenAuth={onOpenAuth} />

          <input
            type="file"
            ref={catalogInputRef}
            onChange={onCatalogFileUpload}
            accept=".json"
            className="hidden"
          />
          <input
            type="file"
            ref={sessionInputRef}
            onChange={onSessionFileUpload}
            accept=".json"
            className="hidden"
          />
        </div>
      </div>
    </header>
  );
}
