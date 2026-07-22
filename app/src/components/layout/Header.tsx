import React, { useRef } from 'react';
import { CalendarDays, Sparkles } from 'lucide-react';
import { DropdownMenu } from './DropdownMenu';

interface HeaderProps {
  onAutoOptimize: () => void;
  showDropdownMenu: boolean;
  setShowDropdownMenu: (show: boolean) => void;
  onExportSession: () => void;
  onCatalogFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSessionFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTogglePasteMode: () => void;
  onOpenCustomModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onAutoOptimize,
  showDropdownMenu,
  setShowDropdownMenu,
  onExportSession,
  onCatalogFileUpload,
  onSessionFileUpload,
  onTogglePasteMode,
  onOpenCustomModal
}) => {
  const catalogFileInputRef = useRef<HTMLInputElement>(null);
  const sessionFileInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-violet-600 to-fuchsia-600 p-2.5 rounded-xl shadow-lg shadow-violet-900/20">
            <CalendarDays className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              KU Sejong Planificateur <span className="text-xs bg-violet-500/20 text-violet-400 border border-violet-500/30 px-2 py-0.5 rounded-full font-mono">Epitech Tech4</span>
            </h1>
            <p className="text-xs text-zinc-400">3 IT + 1 Business + 1 Coréen · Notes, commentaires & gestion de session</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onAutoOptimize}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition duration-200 shadow-md shadow-violet-950/40"
          >
            <Sparkles className="h-4 w-4" />
            <span>Optimisation Auto</span>
          </button>

          <DropdownMenu
            showMenu={showDropdownMenu}
            setShowMenu={setShowDropdownMenu}
            onExportSession={onExportSession}
            onOpenSessionFile={() => sessionFileInputRef.current?.click()}
            onOpenCatalogFile={() => catalogFileInputRef.current?.click()}
            onTogglePasteMode={onTogglePasteMode}
            onOpenCustomModal={onOpenCustomModal}
          />

          <input type="file" ref={catalogFileInputRef} onChange={onCatalogFileUpload} accept=".json" className="hidden" />
          <input type="file" ref={sessionFileInputRef} onChange={onSessionFileUpload} accept=".json" className="hidden" />
        </div>
      </div>
    </header>
  );
};
