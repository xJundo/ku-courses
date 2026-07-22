import React, { useState } from 'react';
import { PlusCircle, X } from 'lucide-react';
import { Course, CustomCourseFormData } from '../../types/course';
import { PERIODS_MAP } from '../../constants/schedule';

interface CustomCourseModalProps {
  onClose: () => void;
  onAddCourse: (course: Course) => void;
}

export const CustomCourseModal: React.FC<CustomCourseModalProps> = ({ onClose, onAddCourse }) => {
  const [formData, setFormData] = useState<CustomCourseFormData>({
    COUR_CD: '',
    COUR_NM: '',
    CREDIT: '3',
    PROF_NM: '',
    DEPARTMENT: '',
    COUR_CLS: '00',
    DAY: 'Mon',
    START_PERIOD: '1',
    END_PERIOD: '2',
    ROOM: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const timeRoomStr = `${formData.DAY}(${formData.START_PERIOD}-${formData.END_PERIOD}) ${formData.ROOM}`;

    const newCourseObj: Course = {
      COUR_CD: formData.COUR_CD.toUpperCase().trim(),
      COUR_NM: formData.COUR_NM.toUpperCase().trim(),
      CREDIT: formData.CREDIT,
      TIME_ROOM: timeRoomStr,
      PROF_NM: formData.PROF_NM,
      DEPARTMENT: formData.DEPARTMENT,
      COUR_CLS: formData.COUR_CLS,
      TIME: '',
      MOOC_YN: '0',
      NEMO_YN: '0',
      EXCH_COR_YN: '0',
      LMT_YN: '0'
    };

    onAddCourse(newCourseObj);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-850 pb-3 mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <PlusCircle className="h-4 w-4 text-violet-400" />
            <span>Ajouter un cours personnalisé</span>
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
          <div>
            <label className="block text-zinc-400 mb-1 font-semibold">Code du cours (ex: BDSC152, GLOB161)</label>
            <input
              type="text"
              required
              value={formData.COUR_CD}
              onChange={e => setFormData({ ...formData, COUR_CD: e.target.value })}
              className="w-full bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 text-zinc-100 uppercase focus:outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-semibold">Nom complet du cours</label>
            <input
              type="text"
              required
              value={formData.COUR_NM}
              onChange={e => setFormData({ ...formData, COUR_NM: e.target.value })}
              className="w-full bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 text-zinc-100 uppercase focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1 font-semibold">Crédits</label>
              <select
                value={formData.CREDIT}
                onChange={e => setFormData({ ...formData, CREDIT: e.target.value })}
                className="w-full bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 text-zinc-100 focus:outline-none focus:border-violet-500"
              >
                <option value="3">3 Crédits (Standard)</option>
                <option value="1">1 Crédit (Sport/Lab)</option>
                <option value="2">2 Crédits</option>
              </select>
            </div>
            <div>
              <label className="block text-zinc-400 mb-1 font-semibold">Section (00, 01...)</label>
              <input
                type="text"
                required
                value={formData.COUR_CLS}
                onChange={e => setFormData({ ...formData, COUR_CLS: e.target.value })}
                className="w-full bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 text-zinc-100 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-850 flex flex-col gap-3">
            <p className="font-semibold text-zinc-400 text-[11px]">Créneau horaire</p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-zinc-500 mb-1">Jour</label>
                <select
                  value={formData.DAY}
                  onChange={e => setFormData({ ...formData, DAY: e.target.value })}
                  className="w-full bg-zinc-900 p-2 rounded-lg text-zinc-200"
                >
                  <option value="Mon">Lundi</option>
                  <option value="Tue">Mardi</option>
                  <option value="Wed">Mercredi</option>
                  <option value="Thu">Jeudi</option>
                  <option value="Fri">Vendredi</option>
                  <option value="Sat">Samedi</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-zinc-500 mb-1">Période Début</label>
                <select
                  value={formData.START_PERIOD}
                  onChange={e => setFormData({ ...formData, START_PERIOD: e.target.value })}
                  className="w-full bg-zinc-900 p-2 rounded-lg text-zinc-200"
                >
                  {Object.keys(PERIODS_MAP).map(p => (<option key={p} value={p}>P{p}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-zinc-500 mb-1">Période Fin</label>
                <select
                  value={formData.END_PERIOD}
                  onChange={e => setFormData({ ...formData, END_PERIOD: e.target.value })}
                  className="w-full bg-zinc-900 p-2 rounded-lg text-zinc-200"
                >
                  {Object.keys(PERIODS_MAP).map(p => (
                    <option key={p} value={p} disabled={Number(p) < Number(formData.START_PERIOD)}>P{p}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-zinc-500 mb-1">Bâtiment - Salle (ex: 35-322)</label>
              <input
                type="text"
                required
                value={formData.ROOM}
                onChange={e => setFormData({ ...formData, ROOM: e.target.value })}
                className="w-full bg-zinc-900 p-2 rounded-lg text-zinc-200 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-2">
            <div>
              <label className="block text-zinc-400 mb-1">Enseignant</label>
              <input
                type="text"
                value={formData.PROF_NM}
                onChange={e => setFormData({ ...formData, PROF_NM: e.target.value })}
                className="w-full bg-zinc-950 p-2 rounded-xl border border-zinc-800 text-zinc-100 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-zinc-400 mb-1">Département</label>
              <input
                type="text"
                value={formData.DEPARTMENT}
                onChange={e => setFormData({ ...formData, DEPARTMENT: e.target.value })}
                className="w-full bg-zinc-950 p-2 rounded-xl border border-zinc-800 text-zinc-100 focus:outline-none"
              />
            </div>
          </div>

          <button type="submit" className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold p-3 rounded-xl transition mt-2">
            Valider et insérer au catalogue
          </button>
        </form>
      </div>
    </div>
  );
};
