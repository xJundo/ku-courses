import React, { useState } from 'react';
import { X, CalendarPlus, User, FileText, Check } from 'lucide-react';

interface CreateCalendarModalProps {
  onClose: () => void;
  onCreate: (name: string, author: string, description: string, copyCurrent: boolean) => void;
  currentCourseCount: number;
}

export const CreateCalendarModal: React.FC<CreateCalendarModalProps> = ({
  onClose,
  onCreate,
  currentCourseCount
}) => {
  const [name, setName] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [copyCurrent, setCopyCurrent] = useState(true);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Veuillez saisir un nom pour le calendrier.');
      return;
    }
    onCreate(name.trim(), author.trim(), description.trim(), copyCurrent);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-violet-600/20 text-violet-400 p-2 rounded-xl border border-violet-500/30">
              <CalendarPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Nouveau Calendrier</h3>
              <p className="text-xs text-zinc-400">Créer et partager avec la communauté Hostinger</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Nom du calendrier <span className="text-violet-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              placeholder="ex: Emploi du temps - Gianni"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1">
              <User className="h-3.5 w-3.5 text-zinc-400" /> Auteur (optionnel)
            </label>
            <input
              type="text"
              value={author}
              onChange={e => setAuthor(e.target.value)}
              placeholder="ex: Gianni / Student ID"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1">
              <FileText className="h-3.5 w-3.5 text-zinc-400" /> Description / Remarques (optionnel)
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="ex: Track IT + Coréen, 15 crédits max"
              rows={2}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition resize-none"
            />
          </div>

          <div
            onClick={() => setCopyCurrent(!copyCurrent)}
            className="flex items-center gap-3 p-3 bg-zinc-950 border border-zinc-800 rounded-xl cursor-pointer hover:border-zinc-700 transition"
          >
            <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${copyCurrent ? 'bg-violet-600 border-violet-500 text-white' : 'border-zinc-700 bg-zinc-900'}`}>
              {copyCurrent && <Check className="h-3.5 w-3.5" />}
            </div>
            <div className="text-xs">
              <p className="font-semibold text-zinc-200">Inclure les cours actuellement sélectionnés</p>
              <p className="text-zinc-500">
                {currentCourseCount > 0
                  ? `${currentCourseCount} cours déjà sélectionnés seront enregistrés dans ce nouveau calendrier`
                  : 'Créer un calendrier vide sans cours pré-sélectionnés'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-zinc-400 hover:text-white transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition shadow-md shadow-violet-950/50 flex items-center gap-2"
            >
              <CalendarPlus className="h-4 w-4" />
              <span>Créer & Sauvegarder</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
