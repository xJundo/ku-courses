import React from 'react';
import { Calendar as CalendarIcon, X, Star, MessageSquare, Trash2, Plus, ExternalLink } from 'lucide-react';
import { Category, ProcessedCourse } from '../../types/course';
import { CATEGORY_COLORS, CATEGORY_LABELS, DAYS_FR } from '../../constants/schedule';
import { DifficultyScale } from '../common/DifficultyScale';
import { StarRating } from '../common/StarRating';
import { CommentEditor } from '../common/CommentEditor';
import { courseKey, getSyllabusUrl } from '../../utils/courseUtils';

interface CourseDetailsModalProps {
  course: ProcessedCourse;
  ratings: Record<string, number>;
  comments: Record<string, string>;
  selectedCourses: ProcessedCourse[];
  onClose: () => void;
  onSetRating: (course: ProcessedCourse, rating: number) => void;
  onSetComment: (course: ProcessedCourse, comment: string) => void;
  onToggleCourse: (course: ProcessedCourse) => void;
}

export const CourseDetailsModal: React.FC<CourseDetailsModalProps> = ({
  course,
  ratings,
  comments,
  selectedCourses,
  onClose,
  onSetRating,
  onSetComment,
  onToggleCourse
}) => {
  const isSelected = selectedCourses.some(sc => courseKey(sc) === courseKey(course));

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-violet-400" />
            <span>Détails & Avis sur le cours</span>
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-zinc-300 text-sm">{courseKey(course)}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${CATEGORY_COLORS[course.category as Category]?.bg}`}>
              {CATEGORY_LABELS[course.category as Category]}
            </span>
          </div>

          <h4 className="text-base font-bold text-white leading-snug">{course.COUR_NM}</h4>

          {/* Star evaluation */}
          <div className="flex items-center justify-between bg-zinc-950 p-3 rounded-2xl border border-zinc-800">
            <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
              <span>Note d'intérêt :</span>
            </span>
            <StarRating
              rating={ratings[courseKey(course)] || 0}
              onRate={r => onSetRating(course, r)}
              size="md"
            />
          </div>

          {/* Personal comment / notes editor */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-violet-400" />
              <span>Commentaire & Notes personnelles</span>
            </label>
            <CommentEditor
              initialComment={comments[courseKey(course)] || ''}
              onSave={txt => onSetComment(course, txt)}
            />
          </div>

          <div className="flex flex-col gap-1.5 text-zinc-400 border-t border-zinc-800 pt-3">
            <div className="flex items-start gap-1.5">
              <span className="text-zinc-600 font-medium shrink-0">Collège :</span>
              <span className="text-zinc-300 leading-tight">{course.college}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-600 font-medium">Dépt :</span>
              <span className="text-zinc-300">{course.DEPARTMENT || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-600 font-medium">Prof :</span>
              <span className="text-zinc-300">{course.PROF_NM || 'Non spécifié'}</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="text-zinc-600 font-medium shrink-0">Horaires :</span>
              {course.parsedSchedules.length > 0 ? (
                <div className="flex flex-col gap-0.5">
                  {course.parsedSchedules.map((s: any, sIdx: number) => (
                    <span key={sIdx} className="text-zinc-300 leading-tight">
                      <span className="text-zinc-100 font-semibold">{DAYS_FR[s.day] || s.day}</span>
                      {' '}P{s.periods.join('-')} · {s.room || 'N/A'}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-zinc-500 italic">Non planifié</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-600 font-medium">Crédits :</span>
              <span className="text-zinc-300">{course.CREDIT}</span>
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-3 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-600 font-semibold uppercase tracking-wide">Difficulté</span>
              <DifficultyScale level={course.difficultyLevel} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-600 font-semibold uppercase tracking-wide">Échange (X)</span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${course.openToExchange ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/50'}`}>
                {course.openToExchange ? 'OUVERT' : 'FERMÉ'}
              </span>
            </div>
            {course.seatsLimited && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-600 font-semibold uppercase tracking-wide">Places (L)</span>
                <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">LIMITÉES</span>
              </div>
            )}
          </div>

          <a
            href={getSyllabusUrl(course)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2 rounded-xl text-xs font-semibold border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 transition flex items-center justify-center gap-1.5 mt-1"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Consulter le Syllabus officiel (Korea University)</span>
          </a>

          <button
            onClick={() => { onToggleCourse(course); onClose(); }}
            className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 mt-1 ${
              isSelected
                ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20'
                : 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg'
            }`}
          >
            {isSelected ? (
              <><Trash2 className="h-3.5 w-3.5" /><span>Retirer de l'emploi du temps</span></>
            ) : (
              <><Plus className="h-3.5 w-3.5" /><span>Ajouter à l'emploi du temps</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
