import React from 'react';
import { Calendar as CalendarIcon, MessageSquare, Star } from 'lucide-react';
import { Category, ProcessedCourse, SelectedStats } from '../../types/course';
import { CATEGORY_COLORS, DAYS_FR, DAYS_SHORT, PERIODS_MAP } from '../../constants/schedule';
import { DifficultyScale } from '../common/DifficultyScale';
import { courseKey } from '../../utils/courseUtils';

interface ScheduleTableProps {
  selectedCourses: ProcessedCourse[];
  selectedStats: SelectedStats;
  onClearAll: () => void;
  onSelectCourseDetails: (course: ProcessedCourse) => void;
}

export const ScheduleTable: React.FC<ScheduleTableProps> = ({
  selectedCourses,
  selectedStats,
  onClearAll,
  onSelectCourseDetails
}) => {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-md font-bold text-white flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-violet-400" />
          <span>Mon Emploi du Temps Hebdomadaire</span>
        </h2>
        {selectedCourses.length > 0 && (
          <button onClick={onClearAll} className="text-xs text-zinc-500 hover:text-red-400 transition">
            Tout vider
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-xs text-zinc-300">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400 uppercase tracking-wider text-[10px]">
              <th className="py-3 px-2 w-[10%] font-medium">Période</th>
              {DAYS_SHORT.map(day => (
                <th key={day} className={`py-3 px-2 w-[15%] text-center font-bold ${selectedStats.activeDays.has(day) ? 'text-violet-400 bg-violet-950/20' : ''}`}>
                  {DAYS_FR[day]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/40">
            {Object.entries(PERIODS_MAP).map(([pIndex, info]) => (
              <tr key={pIndex} className="hover:bg-zinc-800/10 transition">
                <td className="py-3 px-2 font-mono text-[11px] text-zinc-500 font-medium">
                  <div>P{pIndex}</div>
                  <div className="text-[9px] text-zinc-600 font-normal">{info.start}</div>
                </td>
                {DAYS_SHORT.map(day => {
                  const coursesAtThisSlot = selectedCourses.filter(c =>
                    c.parsedSchedules.some((s: any) => s.day === day && s.periods.includes(Number(pIndex)))
                  );
                  const hasConflict = coursesAtThisSlot.length > 1;

                  return (
                    <td key={day} className={`p-1.5 border-l border-zinc-800/30 relative min-h-[92px] align-top ${hasConflict ? 'bg-red-950/15' : ''}`}>
                      {coursesAtThisSlot.map((course, cIdx) => (
                        <div
                          key={cIdx}
                          title={`${course.COUR_NM} (${course.COUR_CD})\n${course.college}\n${course.DEPARTMENT}`}
                          className={`rounded-xl p-2 border text-[10px] leading-tight flex flex-col justify-between h-full shadow cursor-pointer transition ${CATEGORY_COLORS[course.category as Category]?.grid || 'bg-zinc-800'} ${hasConflict ? 'ring-2 ring-red-500' : ''} ${!course.openToExchange ? 'ring-1 ring-red-600' : ''}`}
                          onClick={() => onSelectCourseDetails(course)}
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="font-bold line-clamp-1">{course.COUR_CD}</span>
                              {course.rating > 0 && (
                                <span className="text-[9px] text-amber-300 font-bold flex items-center gap-0.5">
                                  <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                                  {course.rating}
                                </span>
                              )}
                            </div>
                            <div className="text-[9px] font-normal opacity-80 truncate">{course.COUR_NM}</div>
                          </div>

                          <div className="flex items-center gap-1 flex-wrap my-1">
                            <span className={`text-[8px] px-1 rounded font-bold text-white ${course.openToExchange ? 'bg-emerald-600' : 'bg-red-600'}`}>
                              {course.openToExchange ? 'OUVERT' : 'FERMÉ'}
                            </span>
                            <DifficultyScale level={course.difficultyLevel} compact />
                            {course.seatsLimited && <span className="text-[8px] px-1 rounded font-bold text-white bg-amber-600">LIMITÉ</span>}
                            {course.comment && <MessageSquare className="h-2.5 w-2.5 text-violet-300" />}
                          </div>

                          <div className="flex items-center justify-between text-[8px] opacity-70">
                            <span className="truncate">{course.PROF_NM || 'N/A'}</span>
                            <span className="font-mono bg-black/25 px-1 rounded">
                              {course.parsedSchedules.find((s: any) => s.day === day)?.room || 'N/A'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
