import React from 'react';
import { Tag, Star, MessageSquare, Plus, Trash2, ExternalLink } from 'lucide-react';
import { Category, ProcessedCourse } from '../../types/course';
import { CATEGORY_COLORS, CATEGORY_LABELS, DAYS_FR } from '../../constants/schedule';
import { DifficultyScale } from '../common/DifficultyScale';
import { StarRating } from '../common/StarRating';
import { courseKey, getSyllabusUrl } from '../../utils/courseUtils';

interface CourseCardProps {
  course: ProcessedCourse;
  isSelected: boolean;
  onToggle: (course: ProcessedCourse) => void;
  onCycleCategory: (course: ProcessedCourse) => void;
  onSetRating: (course: ProcessedCourse, rating: number) => void;
  onOpenDetails: (course: ProcessedCourse) => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  isSelected,
  onToggle,
  onCycleCategory,
  onSetRating,
  onOpenDetails
}) => {
  const cat = CATEGORY_COLORS[course.category as Category] || CATEGORY_COLORS.OTHERS;

  return (
    <div
      className={`border rounded-2xl ml-[1px] p-4 flex flex-col justify-between gap-3 transition duration-150 ${isSelected ? 'bg-zinc-800/50 border-violet-500 shadow-md' : 'bg-zinc-950/30 border-zinc-800/80 hover:border-zinc-700'} ${!course.openToExchange ? 'ring-1 ring-red-600/40' : ''}`}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono font-bold text-zinc-400">{courseKey(course)}</span>
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 ${
                course.isEnglish
                  ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}
              title={course.isEnglish ? 'Dispensé en anglais (ENG_YN = 1)' : 'Dispensé en coréen'}
            >
              <span>{course.isEnglish ? '🇬🇧 Anglais' : '🇰🇷 Coréen'}</span>
            </span>
            <button
              onClick={() => onCycleCategory(course)}
              title="Cliquer pour changer la catégorie"
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 ${cat.bg}`}
            >
              <Tag className="h-2.5 w-2.5" />
              {CATEGORY_LABELS[course.category as Category]}
            </button>
          </div>
        </div>
        <h3 className="text-xs font-bold text-white line-clamp-2">{course.COUR_NM}</h3>

        {/* Evaluation & Quick comment button */}
        <div className="flex items-center justify-between bg-zinc-950/80 border border-zinc-800/80 px-2.5 py-1.5 rounded-xl">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-500 font-semibold uppercase">Note :</span>
            <StarRating rating={course.rating} onRate={r => onSetRating(course, r)} size="sm" />
          </div>
          <button
            type="button"
            onClick={() => onOpenDetails(course)}
            className={`text-[10px] flex items-center gap-1 font-semibold px-2 py-0.5 rounded-lg border transition ${
              course.comment
                ? 'bg-violet-500/15 border-violet-500/30 text-violet-300 hover:bg-violet-500/25'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <MessageSquare className="h-3 w-3" />
            <span>{course.comment ? 'Avis' : '+ Note'}</span>
          </button>
        </div>

        {course.comment && (
          <div
            onClick={() => onOpenDetails(course)}
            className="bg-zinc-900/90 border border-zinc-800/80 p-2 rounded-xl text-[10px] text-zinc-300 flex items-start gap-1.5 cursor-pointer hover:border-zinc-700 transition"
          >
            <MessageSquare className="h-3 w-3 text-violet-400 shrink-0 mt-0.5" />
            <span className="italic line-clamp-2 leading-relaxed">{course.comment}</span>
          </div>
        )}

        <div className="flex flex-col gap-1 text-[11px] text-zinc-400 mt-1">
          <div className="flex items-start gap-1.5">
            <span className="text-zinc-600 font-medium shrink-0">Collège :</span>
            <span className="text-zinc-300 leading-tight">{course.college}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-600 font-medium">Dépt :</span>
            <span className="truncate text-zinc-300">{course.DEPARTMENT || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-600 font-medium">Prof :</span>
            <span className="truncate text-zinc-300">{course.PROF_NM || 'Non spécifié'}</span>
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

        <div className="border-t border-zinc-800/80 mt-1 pt-2 flex flex-col gap-1.5">
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
      </div>

      <div className="flex items-center justify-between border-t border-zinc-800/80 pt-3 gap-2">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onOpenDetails(course)}
            className="text-xs text-zinc-400 hover:text-zinc-200 transition font-medium text-left"
          >
            Détails & Avis
          </button>
          <a
            href={getSyllabusUrl(course)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-violet-400 hover:text-violet-300 transition font-medium flex items-center gap-1 bg-violet-500/10 hover:bg-violet-500/20 px-2 py-0.5 rounded-lg border border-violet-500/20"
            title="Ouvrir le syllabus officiel (AMS Korea University)"
          >
            <ExternalLink className="h-3 w-3" />
            <span>Syllabus</span>
          </a>
        </div>

        <button
          onClick={() => onToggle(course)}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition ${
            isSelected
              ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20'
              : 'bg-violet-600 hover:bg-violet-500 text-white shadow-sm'
          }`}
        >
          {isSelected ? (
            <><Trash2 className="h-3.5 w-3.5" /><span>Retirer</span></>
          ) : (
            <><Plus className="h-3.5 w-3.5" /><span>Ajouter</span></>
          )}
        </button>
      </div>
    </div>
  );
};
