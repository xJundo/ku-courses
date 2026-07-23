import React, { useState, useEffect } from 'react';
import {
  X,
  Globe,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  User,
  Clock,
  Share2,
  Copy,
  Trash2,
  RefreshCw,
  Sparkles,
  Download,
  Save,
  Check
} from 'lucide-react';
import { CommunityCalendar } from '../../types/course';
import { calendarApi } from '../../services/calendarApi';

interface CommunityCalendarsModalProps {
  onClose: () => void;
  activeCalendarId: string | null;
  onSelectCalendar: (id: string) => void;
  onOpenCreateModal: () => void;
  onSaveCurrentToActive: () => void;
  onDuplicateCalendar: (calendar: CommunityCalendar) => void;
}

export const CommunityCalendarsModal: React.FC<CommunityCalendarsModalProps> = ({
  onClose,
  activeCalendarId,
  onSelectCalendar,
  onOpenCreateModal,
  onSaveCurrentToActive,
  onDuplicateCalendar
}) => {
  const [calendars, setCalendars] = useState<Partial<CommunityCalendar>[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isHostinger, setIsHostinger] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchList = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await calendarApi.listCalendars();
      setCalendars(res.calendars);
      setIsHostinger(res.isHostinger);
    } catch (err: any) {
      setErrorMsg(`Erreur lors du chargement des calendriers: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleShare = (id: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('calendar', id);
    navigator.clipboard.writeText(url.toString());
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 3000);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le calendrier "${name}" ?`)) return;
    try {
      await calendarApi.deleteCalendar(id);
      fetchList();
    } catch (err: any) {
      alert(`Erreur lors de la suppression: ${err.message}`);
    }
  };

  const handleDuplicate = async (summary: Partial<CommunityCalendar>) => {
    if (!summary.id) return;
    setLoading(true);
    try {
      const fullRes = await calendarApi.getCalendar(summary.id);
      if (fullRes.success && fullRes.calendar) {
        onDuplicateCalendar(fullRes.calendar);
      }
    } catch (err: any) {
      alert(`Erreur de duplication: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredCalendars = calendars.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.author && c.author.toLowerCase().includes(q)) ||
      (c.description && c.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-3xl w-full flex flex-col max-h-[85vh] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-violet-600 to-fuchsia-600 p-2.5 rounded-xl text-white shadow-lg shadow-violet-900/30">
              <Globe className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">Calendriers Communautaires</h2>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${isHostinger ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
                  {isHostinger ? '● Serveur Hostinger en ligne' : '○ Mode Local Client'}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Consultez, partagez et modifiez les emplois du temps créés par les étudiants.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-zinc-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action bar & Search */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/90 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom ou auteur..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={fetchList}
              title="Rafraîchir"
              className="p-2 text-zinc-400 hover:text-white bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {activeCalendarId && (
              <button
                onClick={onSaveCurrentToActive}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl transition"
              >
                <Save className="h-4 w-4" />
                <span>Sauvegarder les modifs actuelles</span>
              </button>
            )}

            <button
              onClick={onOpenCreateModal}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl transition shadow-md shadow-violet-950/40"
            >
              <Plus className="h-4 w-4" />
              <span>Créer un calendrier</span>
            </button>
          </div>
        </div>

        {/* List of Calendars */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
              {errorMsg}
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-zinc-500 text-sm flex flex-col items-center gap-2">
              <RefreshCw className="h-6 w-6 animate-spin text-violet-500" />
              <span>Chargement des calendriers communautaires...</span>
            </div>
          ) : filteredCalendars.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-sm flex flex-col items-center gap-2">
              <Calendar className="h-8 w-8 text-zinc-600 mb-1" />
              <p className="font-semibold text-zinc-400">Aucun calendrier communautaire trouvé</p>
              <p className="text-xs text-zinc-500 max-w-sm">
                Soyez le premier à publier un calendrier communautaire sur Hostinger !
              </p>
              <button
                onClick={onOpenCreateModal}
                className="mt-2 px-4 py-2 bg-violet-600 text-white text-xs font-semibold rounded-xl hover:bg-violet-500 transition"
              >
                Créer un calendrier
              </button>
            </div>
          ) : (
            filteredCalendars.map(cal => {
              const isActive = activeCalendarId === cal.id;
              const formattedDate = cal.updatedAt
                ? new Date(cal.updatedAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'Date inconnue';

              return (
                <div
                  key={cal.id}
                  className={`p-4 rounded-xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isActive
                      ? 'bg-violet-950/30 border-violet-500/50 shadow-lg shadow-violet-950/20'
                      : 'bg-zinc-950/50 border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-white">{cal.name}</h4>
                      {isActive && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/40 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3" /> Actif sur le site
                        </span>
                      )}
                    </div>

                    {cal.description && (
                      <p className="text-xs text-zinc-400 line-clamp-1">{cal.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-zinc-500 pt-1">
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-zinc-400" />
                        {cal.author || 'Anonyme'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                        {cal.courseCount || 0} cours ({cal.totalCredits || 0} cr.)
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-zinc-400" />
                        {formattedDate}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      onClick={() => cal.id && handleShare(cal.id)}
                      title="Copier le lien direct"
                      className="p-2 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition flex items-center gap-1 text-xs"
                    >
                      {copiedId === cal.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-medium text-[11px]">Copié !</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="h-3.5 w-3.5" />
                          <span className="text-[11px]">Lien</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleDuplicate(cal)}
                      title="Dupliquer le calendrier"
                      className="p-2 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>

                    {cal.id && (
                      <button
                        onClick={() => handleDelete(cal.id!, cal.name || 'Calendrier')}
                        title="Supprimer"
                        className="p-2 text-red-400/70 hover:text-red-400 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-red-500/10 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {!isActive ? (
                      <button
                        onClick={() => cal.id && onSelectCalendar(cal.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-xl transition shadow-md shadow-violet-950/30"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Charger</span>
                      </button>
                    ) : (
                      <span className="px-3 py-1.5 text-xs text-violet-400 font-semibold bg-violet-500/10 rounded-xl border border-violet-500/20">
                        Sélectionné
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/50 flex items-center justify-between text-xs text-zinc-500">
          <p>⚠️ Tous les calendriers communautaires sont accessibles publiquement sur Hostinger.</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium rounded-xl transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
