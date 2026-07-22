import React from 'react';
import { Sliders, Search, ArrowUpDown, Filter, Star } from 'lucide-react';
import { ProcessedCourse, SortOption } from '../../types/course';
import { CourseCard } from './CourseCard';
import { courseKey } from '../../utils/courseUtils';

interface CourseCatalogProps {
  filteredCoursesList: ProcessedCourse[];
  selectedCourses: ProcessedCourse[];
  ratedCoursesCount: number;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  showClosedExchange: boolean;
  setShowClosedExchange: (show: boolean) => void;
  showOnlyEnglish: boolean;
  setShowOnlyEnglish: (show: boolean) => void;
  onToggleCourse: (course: ProcessedCourse) => void;
  onCycleCategory: (course: ProcessedCourse) => void;
  onSetRating: (course: ProcessedCourse, rating: number) => void;
  onOpenDetails: (course: ProcessedCourse) => void;
}

export const CourseCatalog: React.FC<CourseCatalogProps> = ({
  filteredCoursesList,
  selectedCourses,
  ratedCoursesCount,
  activeTab,
  setActiveTab,
  searchTerm,
  setSearchTerm,
  sortBy,
  setSortBy,
  showClosedExchange,
  setShowClosedExchange,
  showOnlyEnglish,
  setShowOnlyEnglish,
  onToggleCourse,
  onCycleCategory,
  onSetRating,
  onOpenDetails
}) => {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col gap-5">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-md font-bold text-white flex items-center gap-2">
            <Sliders className="h-4 w-4 text-violet-400" />
            <span>Catalogue des cours ({filteredCoursesList.length})</span>
          </h2>
          <p className="text-xs text-zinc-400 font-normal">Activez les cours souhaités et gérez vos notes & commentaires</p>
        </div>

        <div className="flex flex-wrap gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 w-full md:w-auto">
          {['all', 'it', 'business', 'korean', 'others', 'rated'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-[11px] px-3 py-1.5 rounded-lg capitalize font-semibold transition flex items-center gap-1 ${activeTab === tab ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              {tab === 'all' && 'Tous'}
              {tab === 'it' && 'IT'}
              {tab === 'business' && 'Business'}
              {tab === 'korean' && 'Coréen'}
              {tab === 'others' && 'Autre'}
              {tab === 'rated' && (
                <>
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span>Notés ({ratedCoursesCount})</span>
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Filtrer par code, mot-clé, département, prof ou commentaire..."
            className="w-full bg-zinc-950 text-xs text-zinc-100 pl-11 pr-4 py-3 rounded-2xl border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 bg-zinc-950 px-3 py-2 rounded-2xl border border-zinc-800 shrink-0">
          <ArrowUpDown className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-[11px] text-zinc-400 font-medium">Trier par :</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="bg-transparent text-xs text-zinc-100 font-medium focus:outline-none cursor-pointer"
          >
            <option value="default" className="bg-zinc-900 text-zinc-200">Ordre d'origine</option>
            <option value="rating-desc" className="bg-zinc-900 text-zinc-200">⭐ Note (haute → basse)</option>
            <option value="rating-asc" className="bg-zinc-900 text-zinc-200">⭐ Note (basse → haute)</option>
            <option value="level-asc" className="bg-zinc-900 text-zinc-200">📊 Niveau (1 → 4+)</option>
            <option value="level-desc" className="bg-zinc-900 text-zinc-200">📊 Niveau (4+ → 1)</option>
            <option value="code" className="bg-zinc-900 text-zinc-200">Code de cours</option>
            <option value="name" className="bg-zinc-900 text-zinc-200">Nom du cours</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowClosedExchange(!showClosedExchange)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              showClosedExchange ? 'bg-violet-600' : 'bg-zinc-800'
            }`}
            role="switch"
            aria-checked={showClosedExchange}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                showClosedExchange ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
          <span
            className="text-xs text-zinc-300 font-medium cursor-pointer select-none"
            onClick={() => setShowClosedExchange(!showClosedExchange)}
          >
            Afficher les cours fermés aux étudiants en échange
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowOnlyEnglish(!showOnlyEnglish)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              showOnlyEnglish ? 'bg-indigo-600' : 'bg-zinc-800'
            }`}
            role="switch"
            aria-checked={showOnlyEnglish}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                showOnlyEnglish ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
          <span
            className="text-xs text-zinc-300 font-medium cursor-pointer select-none flex items-center gap-1.5"
            onClick={() => setShowOnlyEnglish(!showOnlyEnglish)}
          >
            <span>Cours en anglais uniquement</span>
            <span className="text-xs">🇬🇧</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[560px] overflow-y-auto pr-1">
        {filteredCoursesList.length > 0 ? (
          filteredCoursesList.map((course, idx) => (
            <CourseCard
              key={idx}
              course={course}
              isSelected={selectedCourses.some(sc => courseKey(sc) === courseKey(course))}
              onToggle={onToggleCourse}
              onCycleCategory={onCycleCategory}
              onSetRating={onSetRating}
              onOpenDetails={onOpenDetails}
            />
          ))
        ) : (
          <div className="col-span-full py-12 text-center flex flex-col items-center gap-2 text-zinc-500">
            <Filter className="h-8 w-8 text-zinc-700 animate-pulse" />
            <p className="text-xs">Aucun cours trouvé avec ces critères de recherche.</p>
          </div>
        )}
      </div>
    </div>
  );
};
