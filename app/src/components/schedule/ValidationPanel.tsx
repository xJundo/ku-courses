import React from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Clipboard,
  Info,
  Loader2,
  Sparkles,
  Star,
  X
} from 'lucide-react';
import { SelectedStats, ValidationDetails } from '../../types/course';
import { DAYS_FR } from '../../constants/schedule';
import { courseKey } from '../../utils/courseUtils';

interface ValidationPanelProps {
  loadingCatalog: boolean;
  pasteMode: boolean;
  setPasteMode: (mode: boolean) => void;
  pasteValue: string;
  setPasteValue: (val: string) => void;
  handlePasteSubmit: () => void;
  jsonError: string | null;
  importSuccess: boolean;
  catalogSource: string;
  optimizeInfo: string | null;
  ratedCoursesCount: number;
  selectedStats: SelectedStats;
  validationDetails: ValidationDetails;
}

export const ValidationPanel: React.FC<ValidationPanelProps> = ({
  loadingCatalog,
  pasteMode,
  setPasteMode,
  pasteValue,
  setPasteValue,
  handlePasteSubmit,
  jsonError,
  importSuccess,
  catalogSource,
  optimizeInfo,
  ratedCoursesCount,
  selectedStats,
  validationDetails
}) => {
  return (
    <div className="lg:col-span-4 flex flex-col gap-6">

      {loadingCatalog && (
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center gap-3 text-xs text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
          <span>Chargement du catalogue...</span>
        </div>
      )}

      {pasteMode && (
        <div className="bg-zinc-900 border border-violet-500/40 p-5 rounded-3xl shadow-xl flex flex-col gap-3">
          <h3 className="text-sm font-bold text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clipboard className="h-4 w-4 text-violet-400" />
              <span>Coller le contenu JSON</span>
            </span>
            <button onClick={() => setPasteMode(false)} className="text-zinc-500 hover:text-zinc-300">
              <X className="h-4 w-4" />
            </button>
          </h3>
          <p className="text-xs text-zinc-400">Collez un export de session (avec notes/commentaires) ou un fichier catalogue brut.</p>
          <textarea
            value={pasteValue}
            onChange={e => setPasteValue(e.target.value)}
            placeholder="Collez le texte JSON ici..."
            className="w-full h-36 bg-zinc-950 text-xs font-mono p-3 rounded-xl border border-zinc-800 focus:outline-none focus:border-violet-500 text-zinc-200"
          />
          <button onClick={handlePasteSubmit} className="bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs py-2 rounded-lg transition">
            Analyser le texte collé
          </button>
        </div>
      )}

      {jsonError && (
        <div className="bg-red-950/40 border border-red-800 text-red-200 p-4 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-semibold text-sm">Rapport</p>
            <p className="mt-1 text-red-300 leading-relaxed">{jsonError}</p>
          </div>
        </div>
      )}

      {importSuccess && (
        <div className="bg-emerald-950/40 border border-emerald-800 text-emerald-200 p-4 rounded-2xl flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-semibold text-sm text-emerald-300">Succès</p>
            <p className="mt-1 text-emerald-400">{catalogSource}</p>
          </div>
        </div>
      )}

      {optimizeInfo && (
        <div className="bg-violet-950/40 border border-violet-800 text-violet-200 p-4 rounded-2xl flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-violet-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-semibold text-sm text-violet-300">Optimisation Auto</p>
            <p className="mt-1 text-violet-300/90 leading-relaxed">{optimizeInfo}</p>
          </div>
        </div>
      )}

      <div className="bg-zinc-900/60 border border-zinc-800 p-3 rounded-2xl text-[11px] text-zinc-400 flex items-center justify-between">
        <div>Source : <span className="text-zinc-200 font-semibold">{catalogSource}</span></div>
        <div className="text-amber-400 font-mono flex items-center gap-1">
          <Star className="h-3 w-3 fill-amber-400" />
          <span>{ratedCoursesCount} noté(s)</span>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col gap-5">
        <h2 className="text-md font-bold text-white flex items-center justify-between border-b border-zinc-800 pb-3">
          <span>Validation de l'inscription</span>
          <span className={`h-2.5 w-2.5 rounded-full ${validationDetails.isValidOverall ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`}></span>
        </h2>

        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-2.5">
            <div className={`p-1 rounded-md mt-0.5 ${validationDetails.creditsMet ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
              {validationDetails.creditsMet ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            </div>
            <div>
              <h3 className="font-semibold text-sm text-zinc-100">Crédits locaux ({selectedStats.totalCredits} / 15)</h3>
              <p className="text-xs text-zinc-400">Minimum 15 crédits par semestre.</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className={`p-1 rounded-md mt-0.5 ${validationDetails.daysMet ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
              {validationDetails.daysMet ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            </div>
            <div>
              <h3 className="font-semibold text-sm text-zinc-100">Jours de présence ({selectedStats.activeDays.size} / 4)</h3>
              <p className="text-xs text-zinc-400">
                Jours réservés : {[...selectedStats.activeDays].map(d => DAYS_FR[d] || d).join(', ') || 'aucun'}
                {' '}(les cours en visio MOOC/NEMO ne comptent pas)
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className={`p-1 rounded-md mt-0.5 ${validationDetails.ruleMet ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
              {validationDetails.ruleMet ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            </div>
            <div>
              <h3 className="font-semibold text-sm text-zinc-100">3 IT + 1 Business + 1 Coréen</h3>
              <p className="text-xs text-zinc-400">
                Actuel : {selectedStats.itCount} IT · {selectedStats.businessCount} Business · {selectedStats.koreanCount} Coréen
                {selectedStats.othersCount > 0 && ` · ${selectedStats.othersCount} Autre`}
              </p>
            </div>
          </div>

          {selectedStats.hasConflict && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-3 rounded-xl flex items-start gap-2 text-xs">
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <div><span className="font-semibold">Conflit détecté :</span> deux cours sélectionnés se chevauchent.</div>
            </div>
          )}

          {selectedStats.nonExchangeCourses.length > 0 && (
            <div className="bg-red-950/60 border-2 border-red-600 text-red-200 p-4 rounded-xl flex items-start gap-3 text-xs">
              <AlertTriangle className="h-6 w-6 text-red-400 shrink-0 animate-pulse" />
              <div>
                <p className="font-bold text-sm text-red-300">Cours fermé aux étudiants en échange</p>
                <p className="mt-1 leading-relaxed">
                  Sur sugang.korea.ac.kr, ces cours n'ont pas la case <strong>"3) X : Exchange Student"</strong> cochée — vous ne pourrez probablement <strong>pas vous y inscrire</strong> :
                </p>
                <ul className="mt-1.5 space-y-0.5 list-disc list-inside">
                  {selectedStats.nonExchangeCourses.map((c, i) => (
                    <li key={i}><span className="font-mono font-bold">{courseKey(c)}</span> — {c.COUR_NM}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {selectedStats.limitedSeatsCourses.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-3 rounded-xl flex items-start gap-2 text-xs">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Places limitées (colonne "2) L") :</span> {selectedStats.limitedSeatsCourses.length} cours sélectionné(s) ont un nombre de places restreint.
              </div>
            </div>
          )}
        </div>

        <div className={`p-4 rounded-2xl border text-center ${validationDetails.isValidOverall ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-zinc-800/50 border-zinc-800 text-zinc-400'}`}>
          {validationDetails.isValidOverall ? (
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm font-bold">Emploi du temps éligible</span>
              <span className="text-xs">15 crédits mini, ≤ 4 jours, 3 IT + 1 Business + 1 Coréen, sans conflit.</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm font-semibold">En attente de validation</span>
              <span className="text-xs">Ajustez votre sélection pour respecter tous les critères.</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col gap-3">
        <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-400 flex items-center gap-2">
          <Info className="h-4 w-4 text-violet-400" />
          <span>Informations complémentaires</span>
        </h3>
        <div className="text-xs text-zinc-400 space-y-2">
          <p><strong>Catégorie auto-détectée</strong> par département (IT / Business / Coréen / Autre). Si un cours est mal classé, cliquez sur son badge de catégorie pour le corriger manuellement.</p>
          <p><strong>Difficulté</strong> : déduite du 1er chiffre du numéro de cours (2xx = Niveau 2, 3xx = Niveau 3, 4xx = Niveau 4...). Niveau 3 ≈ charge d'une année Epitech classique, au-delà c'est plus lourd.</p>
          <p><strong>Affinités perso</strong> (badges sur chaque carte) : ROBOTIQUE et IA sont priorisés par "Optimisation Auto", CYBER / ÉLECTRONIQUE / MATHS sont évités, SOFTWARE = votre branche (facile).</p>
          <p><strong>Visio (MOOC/NEMO)</strong> : ces cours ne comptent pas dans la limite de jours, vous pouvez les ajouter librement.</p>
          <p><strong>Salles</strong> : le code de salle indique d'abord le bâtiment puis la salle (ex : 35-322).</p>
          <p><strong>Étoiles</strong> : Cliquez directement sur les étoiles d'un cours pour lui attribuer une note de 1 à 5 d'intérêt.</p>
          <p><strong>Commentaires</strong> : Cliquez sur <em>Avis / + Note</em> ou sur la carte pour rédiger vos remarques et retours d'anciens.</p>
          <p><strong>Onglet "Notés"</strong> : Filtrez instantanément tous les cours auxquels vous avez attribué une note ou un commentaire.</p>
          <p><strong>Export & Menu Actions</strong> : Le menu <em>Actions & Fichiers</em> en haut à droite vous permet de charger un fichier catalogue brut (.json) ou d'exporter/restaurer votre session complète.</p> <p>Le catalogue chargé par défaut est le fichier <code>public/courses.json</code> (tout Sejong, semestre d'automne 2026). Vous pouvez le remplacer via "Charger Fichier".</p>
        </div>
      </div>
    </div>
  );
};
