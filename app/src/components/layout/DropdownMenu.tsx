import React, { useRef, useEffect } from 'react';
import { Download, FileJson, FolderOpen, Clipboard, PlusCircle, Sliders, ChevronDown, Globe } from 'lucide-react';

interface DropdownMenuProps {
  showMenu: boolean;
  setShowMenu: (show: boolean) => void;
  onExportSession: () => void;
  onOpenSessionFile: () => void;
  onOpenCatalogFile: () => void;
  onTogglePasteMode: () => void;
  onOpenCustomModal: () => void;
  onOpenCommunityModal: () => void;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  showMenu,
  setShowMenu,
  onExportSession,
  onOpenSessionFile,
  onOpenCatalogFile,
  onTogglePasteMode,
  onOpenCustomModal,
  onOpenCommunityModal
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setShowMenu]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-100 border border-zinc-700 text-xs font-semibold px-4 py-2.5 rounded-xl transition duration-150 shadow-sm"
      >
        <Sliders className="h-4 w-4 text-violet-400" />
        <span>Actions & Fichiers</span>
        <ChevronDown className={`h-3.5 w-3.5 text-zinc-400 transition-transform duration-200 ${showMenu ? 'rotate-180' : ''}`} />
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-72 bg-zinc-900/95 border border-zinc-800 rounded-2xl shadow-2xl backdrop-blur-xl z-50 p-2 text-xs flex flex-col gap-1 divide-y divide-zinc-800/60">
          <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
            Calendriers & Partage
          </div>

          <div className="pt-1 flex flex-col gap-0.5">
            <button
              onClick={() => { onOpenCommunityModal(); setShowMenu(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-violet-300 hover:bg-violet-500/10 transition text-left"
            >
              <Globe className="h-4 w-4 text-violet-400" />
              <div>
                <div className="font-semibold">Calendriers Communautaires</div>
                <div className="text-[10px] text-zinc-400">Voir, créer et partager sur Hostinger</div>
              </div>
            </button>
          </div>

          <div className="px-3 pt-2.5 pb-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
            Session & Sauvegarde
          </div>

          <div className="pt-1 flex flex-col gap-0.5">
            <button
              onClick={onExportSession}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-emerald-300 hover:bg-emerald-500/10 transition text-left"
            >
              <Download className="h-4 w-4 text-emerald-400" />
              <div>
                <div className="font-semibold">Exporter ma session (.json)</div>
                <div className="text-[10px] text-zinc-400">Sauvegarder notes, avis et emploi du temps</div>
              </div>
            </button>

            <button
              onClick={onOpenSessionFile}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-200 hover:bg-zinc-800 transition text-left"
            >
              <FileJson className="h-4 w-4 text-violet-400" />
              <div>
                <div className="font-semibold">Restaurer une session (.json)</div>
                <div className="text-[10px] text-zinc-400">Recharger une sauvegarde complète</div>
              </div>
            </button>
          </div>

          <div className="px-3 pt-2.5 pb-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
            Catalogue & Cours
          </div>

          <div className="pt-1 flex flex-col gap-0.5">
            <button
              onClick={onOpenCatalogFile}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-200 hover:bg-zinc-800 transition text-left"
            >
              <FolderOpen className="h-4 w-4 text-sky-400" />
              <div>
                <div className="font-semibold">Charger un catalogue (.json)</div>
                <div className="text-[10px] text-zinc-400">Importer un fichier de cours KU Sejong</div>
              </div>
            </button>

            <button
              onClick={() => { onTogglePasteMode(); setShowMenu(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-200 hover:bg-zinc-800 transition text-left"
            >
              <Clipboard className="h-4 w-4 text-amber-400" />
              <div>
                <div className="font-semibold">Copier-Coller du JSON</div>
                <div className="text-[10px] text-zinc-400">Insérer directement le texte JSON</div>
              </div>
            </button>

            <button
              onClick={() => { onOpenCustomModal(); setShowMenu(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-200 hover:bg-zinc-800 transition text-left"
            >
              <PlusCircle className="h-4 w-4 text-violet-400" />
              <div>
                <div className="font-semibold">Ajouter un cours sur-mesure</div>
                <div className="text-[10px] text-zinc-400">Créer un cours manuellement</div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
