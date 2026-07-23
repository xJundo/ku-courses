import React, { useState } from 'react';
import { ProcessedCourse } from './types/course';
import { useCoursesData } from './hooks/useCoursesData';
import { useScheduleValidation } from './hooks/useScheduleValidation';
import { findValidCombo } from './utils/optimizer';
import { processJsonPayload, courseKey } from './utils/courseUtils';
import { Header } from './components/layout/Header';
import { ValidationPanel } from './components/schedule/ValidationPanel';
import { ScheduleTable } from './components/schedule/ScheduleTable';
import { CourseCatalog } from './components/catalog/CourseCatalog';
import { CourseDetailsModal } from './components/modals/CourseDetailsModal';
import { CustomCourseModal } from './components/modals/CustomCourseModal';
import { CommunityCalendarsModal } from './components/modals/CommunityCalendarsModal';
import { CreateCalendarModal } from './components/modals/CreateCalendarModal';

export default function App() {
  const {
    selectedCourses,
    setSelectedCourses,
    coursesWithSchedules,
    filteredCoursesList,
    ratedCoursesCount,
    categoryOverrides,
    ratings,
    comments,
    customCourses,
    activeCalendar,
    activeCalendarId,
    showCommunityModal,
    setShowCommunityModal,
    showCreateCalendarModal,
    setShowCreateCalendarModal,
    loadCalendarById,
    saveActiveCalendar,
    createNewCalendar,
    duplicateCalendar,
    searchTerm,
    setSearchTerm,
    showClosedExchange,
    setShowClosedExchange,
    showOnlyEnglish,
    setShowOnlyEnglish,
    activeTab,
    setActiveTab,
    sortBy,
    setSortBy,
    jsonError,
    setJsonError,
    importSuccess,
    setImportSuccess,
    loadingCatalog,
    catalogSource,
    setCatalogSource,
    toggleCourse,
    cycleCategory,
    handleSetRating,
    handleSetComment,
    processJsonText,
    addCustomCourse
  } = useCoursesData();

  const { selectedStats, validationDetails } = useScheduleValidation(selectedCourses);

  const [optimizeInfo, setOptimizeInfo] = useState<string | null>(null);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteValue, setPasteValue] = useState('');
  const [showDropdownMenu, setShowDropdownMenu] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [detailsCourse, setDetailsCourse] = useState<ProcessedCourse | null>(null);

  const handleAutoOptimize = () => {
    const it = coursesWithSchedules.filter(c => c.category === 'IT' && c.openToExchange);
    const business = coursesWithSchedules.filter(c => c.category === 'BUSINESS' && c.openToExchange);
    const korean = coursesWithSchedules.filter(c => c.category === 'KOREAN' && c.openToExchange);

    if (korean.length === 0 || business.length === 0 || it.length < 3) {
      setJsonError("Pas assez de cours ouverts aux échanges (colonne X) dans ces catégories pour générer une combinaison. Vérifiez les catégories via le badge cliquable sur chaque carte, ou composez manuellement.");
      setOptimizeInfo(null);
      return;
    }

    const MON_WED = new Set(['Mon', 'Tue', 'Wed']);
    const MON_THU = new Set(['Mon', 'Tue', 'Wed', 'Thu']);

    let found = findValidCombo(it, business, korean, MON_WED, 3);
    let tierMessage = 'Combinaison trouvée sur Lundi-Mardi-Mercredi (3 jours), en priorisant robotique/IA et en évitant cyber/électronique/maths.';

    if (!found) {
      found = findValidCombo(it, business, korean, MON_THU, 4);
      tierMessage = "Pas de combinaison tenant sur 3 jours : voici une combinaison sur Lundi-Jeudi (4 jours), en priorisant robotique/IA et en évitant cyber/électronique/maths.";
    }

    if (!found) {
      found = findValidCombo(it, business, korean, null, 4);
      tierMessage = "Aucune combinaison Lundi-Jeudi trouvée : voici la meilleure option sur 4 jours max, qui peut inclure Vendredi/Samedi.";
    }

    if (found) {
      setSelectedCourses(found);
      setJsonError(null);
      setOptimizeInfo(tierMessage);
    } else {
      setOptimizeInfo(null);
      setJsonError("Aucune combinaison valide trouvée, même en autorisant jusqu'à Vendredi/Samedi. Essayez de composer manuellement.");
    }
  };

  const handleExportSession = () => {
    const exportData = {
      type: 'ku_planner_backup',
      version: '1.0',
      exportDate: new Date().toISOString(),
      selectedCourseKeys: selectedCourses.map(courseKey),
      categoryOverrides,
      ratings,
      comments,
      customCourses
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ku_sejong_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setShowDropdownMenu(false);
  };

  const handleCatalogFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      try {
        const rawText = String(event.target?.result || '');
        processJsonPayload(rawText);
        setCatalogSource(`Catalogue importé : ${file.name}`);
        setJsonError(null);
        setImportSuccess(true);
        setTimeout(() => setImportSuccess(false), 5000);
      } catch (err: any) {
        setJsonError(`Erreur lors de l'importation du catalogue : ${err.message}`);
        setImportSuccess(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
    setShowDropdownMenu(false);
  };

  const handleSessionFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      try {
        processJsonText(String(event.target?.result || ''));
      } catch (err: any) {
        setJsonError(`Erreur lors de la restauration de la session : ${err.message}`);
        setImportSuccess(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
    setShowDropdownMenu(false);
  };

  const handlePasteSubmit = () => {
    if (!pasteValue.trim()) return;
    processJsonText(pasteValue);
    setPasteMode(false);
    setPasteValue('');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col selection:bg-violet-500 selection:text-white">
      <Header
        onAutoOptimize={handleAutoOptimize}
        showDropdownMenu={showDropdownMenu}
        setShowDropdownMenu={setShowDropdownMenu}
        onExportSession={handleExportSession}
        onCatalogFileUpload={handleCatalogFileUpload}
        onSessionFileUpload={handleSessionFileUpload}
        onTogglePasteMode={() => setPasteMode(!pasteMode)}
        onOpenCustomModal={() => setShowCustomModal(true)}
        activeCalendar={activeCalendar}
        onOpenCommunityModal={() => setShowCommunityModal(true)}
        onSaveActiveCalendar={saveActiveCalendar}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <ValidationPanel
          loadingCatalog={loadingCatalog}
          pasteMode={pasteMode}
          setPasteMode={setPasteMode}
          pasteValue={pasteValue}
          setPasteValue={setPasteValue}
          handlePasteSubmit={handlePasteSubmit}
          jsonError={jsonError}
          importSuccess={importSuccess}
          catalogSource={catalogSource}
          optimizeInfo={optimizeInfo}
          ratedCoursesCount={ratedCoursesCount}
          selectedStats={selectedStats}
          validationDetails={validationDetails}
        />

        <div className="lg:col-span-8 flex flex-col gap-6">
          <ScheduleTable
            selectedCourses={selectedCourses}
            selectedStats={selectedStats}
            onClearAll={() => setSelectedCourses([])}
            onSelectCourseDetails={setDetailsCourse}
          />

          <CourseCatalog
            filteredCoursesList={filteredCoursesList}
            selectedCourses={selectedCourses}
            ratedCoursesCount={ratedCoursesCount}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            sortBy={sortBy}
            setSortBy={setSortBy}
            showClosedExchange={showClosedExchange}
            setShowClosedExchange={setShowClosedExchange}
            showOnlyEnglish={showOnlyEnglish}
            setShowOnlyEnglish={setShowOnlyEnglish}
            onToggleCourse={toggleCourse}
            onCycleCategory={cycleCategory}
            onSetRating={handleSetRating}
            onOpenDetails={setDetailsCourse}
          />
        </div>
      </main>

      {detailsCourse && (
        <CourseDetailsModal
          course={detailsCourse}
          ratings={ratings}
          comments={comments}
          selectedCourses={selectedCourses}
          onClose={() => setDetailsCourse(null)}
          onSetRating={handleSetRating}
          onSetComment={handleSetComment}
          onToggleCourse={toggleCourse}
        />
      )}

      {showCustomModal && (
        <CustomCourseModal
          onClose={() => setShowCustomModal(false)}
          onAddCourse={addCustomCourse}
        />
      )}

      {showCommunityModal && (
        <CommunityCalendarsModal
          onClose={() => setShowCommunityModal(false)}
          activeCalendarId={activeCalendarId}
          onSelectCalendar={id => {
            loadCalendarById(id);
            setShowCommunityModal(false);
          }}
          onOpenCreateModal={() => setShowCreateCalendarModal(true)}
          onSaveCurrentToActive={saveActiveCalendar}
          onDuplicateCalendar={duplicateCalendar}
        />
      )}

      {showCreateCalendarModal && (
        <CreateCalendarModal
          onClose={() => setShowCreateCalendarModal(false)}
          onCreate={createNewCalendar}
          currentCourseCount={selectedCourses.length}
        />
      )}

      <footer className="border-t border-zinc-800 py-6 text-center text-xs text-zinc-500 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>KU Sejong · Fall 2026 · Planificateur communautaire self-hosted</p>
        </div>
      </footer>
    </div>
  );
}
