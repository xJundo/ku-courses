import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { toast } from 'sonner';
import { AuthDialog } from '@/components/auth/AuthDialog';
import { CourseCatalog } from '@/components/catalog/CourseCatalog';
import { CommunityCalendarsDialog } from '@/components/dialogs/CommunityCalendarsDialog';
import { CourseDetailsDialog } from '@/components/dialogs/CourseDetailsDialog';
import { CreateCalendarDialog } from '@/components/dialogs/CreateCalendarDialog';
import { CustomCourseDialog } from '@/components/dialogs/CustomCourseDialog';
import { PasteJsonDialog } from '@/components/dialogs/PasteJsonDialog';
import { Header } from '@/components/layout/Header';
import { ScheduleTable } from '@/components/schedule/ScheduleTable';
import { ValidationPanel } from '@/components/schedule/ValidationPanel';
import { useAuth } from '@/context/AuthContext';
import { useCalendarDiscussions } from '@/hooks/useCalendarDiscussions';
import { useCoursesData } from '@/hooks/useCoursesData';
import { useScheduleValidation } from '@/hooks/useScheduleValidation';
import type { ProcessedCourse } from '@/types/course';
import { courseKey, processJsonPayload } from '@/utils/courseUtils';
import { findValidCombo } from '@/utils/optimizer';

export default function App() {
  const { user } = useAuth();
  const data = useCoursesData();
  const { selectedStats, validationDetails } = useScheduleValidation(data.selectedCourses);
  const discussions = useCalendarDiscussions(data.activeCalendarId);

  const [optimizeInfo, setOptimizeInfo] = useState<string | null>(null);
  const [detailsCourse, setDetailsCourse] = useState<ProcessedCourse | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authReason, setAuthReason] = useState<string | undefined>();
  const [communityOpen, setCommunityOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [customCourseOpen, setCustomCourseOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);

  const requireAuth = (reason?: string) => {
    setAuthReason(reason);
    setAuthOpen(true);
  };

  const handleAutoOptimize = () => {
    const it = data.coursesWithSchedules.filter(c => c.category === 'IT' && c.openToExchange);
    const business = data.coursesWithSchedules.filter(c => c.category === 'BUSINESS' && c.openToExchange);
    const korean = data.coursesWithSchedules.filter(c => c.category === 'KOREAN' && c.openToExchange);

    if (korean.length === 0 || business.length === 0 || it.length < 3) {
      setOptimizeInfo(null);
      toast.error(
        'Pas assez de cours ouverts aux échanges dans ces catégories. Vérifiez les catégories via le badge de chaque carte.'
      );
      return;
    }

    const MON_WED = new Set(['Mon', 'Tue', 'Wed']);
    const MON_THU = new Set(['Mon', 'Tue', 'Wed', 'Thu']);

    let found = findValidCombo(it, business, korean, MON_WED, 3);
    let message =
      'Combinaison trouvée sur lundi-mardi-mercredi (3 jours), en priorisant robotique/IA et en évitant cyber/électronique/maths.';

    if (!found) {
      found = findValidCombo(it, business, korean, MON_THU, 4);
      message =
        'Pas de combinaison sur 3 jours : voici une combinaison sur lundi-jeudi (4 jours), en priorisant robotique/IA.';
    }

    if (!found) {
      found = findValidCombo(it, business, korean, null, 4);
      message =
        'Aucune combinaison lundi-jeudi : voici la meilleure option sur 4 jours max, vendredi/samedi inclus.';
    }

    if (found) {
      data.setSelectedCourses(found);
      setOptimizeInfo(message);
      toast.success('Emploi du temps optimisé.');
    } else {
      setOptimizeInfo(null);
      toast.error('Aucune combinaison valide trouvée. Essayez de composer manuellement.');
    }
  };

  const handleExportSession = () => {
    const payload = {
      type: 'ku_planner_backup',
      version: '2.0',
      exportDate: new Date().toISOString(),
      selectedCourseKeys: data.selectedCourses.map(courseKey),
      categoryOverrides: data.categoryOverrides,
      ratings: data.ratings,
      comments: data.comments,
      customCourses: data.customCourses
    };

    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `ku_sejong_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const readFile = (event: ChangeEvent<HTMLInputElement>, onText: (text: string) => void) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = loadEvent => onText(String(loadEvent.target?.result || ''));
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleCatalogFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const fileName = event.target.files?.[0]?.name ?? 'fichier';
    readFile(event, text => {
      try {
        processJsonPayload(text);
        data.processJsonText(text);
        data.setCatalogSource(`Catalogue importé : ${fileName}`);
      } catch (err: any) {
        data.setJsonError(`Erreur lors de l'importation du catalogue : ${err.message}`);
        toast.error('Catalogue invalide.');
      }
    });
  };

  const handleSessionFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    readFile(event, text => data.processJsonText(text));
  };

  const detailsKey = detailsCourse ? courseKey(detailsCourse) : null;

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <Header
        activeCalendar={data.activeCalendar}
        onAutoOptimize={handleAutoOptimize}
        onExportSession={handleExportSession}
        onCatalogFileUpload={handleCatalogFileUpload}
        onSessionFileUpload={handleSessionFileUpload}
        onOpenPasteDialog={() => setPasteOpen(true)}
        onOpenCustomCourseDialog={() => setCustomCourseOpen(true)}
        onOpenCommunity={() => setCommunityOpen(true)}
        onSaveActiveCalendar={data.saveActiveCalendar}
        onOpenAuth={() => requireAuth()}
      />

      <main className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-6 p-4 md:p-6 lg:grid-cols-12">
        <ValidationPanel
          loadingCatalog={data.loadingCatalog}
          jsonError={data.jsonError}
          catalogSource={data.catalogSource}
          optimizeInfo={optimizeInfo}
          ratedCoursesCount={data.ratedCoursesCount}
          selectedStats={selectedStats}
          validationDetails={validationDetails}
        />

        <div className="flex flex-col gap-6 lg:col-span-8">
          <ScheduleTable
            selectedCourses={data.selectedCourses}
            selectedStats={selectedStats}
            threads={discussions.threads}
            onClearAll={() => data.setSelectedCourses([])}
            onSelectCourseDetails={setDetailsCourse}
          />

          <CourseCatalog
            filteredCoursesList={data.filteredCoursesList}
            selectedCourses={data.selectedCourses}
            ratedCoursesCount={data.ratedCoursesCount}
            threads={discussions.threads}
            activeTab={data.activeTab}
            setActiveTab={data.setActiveTab}
            searchTerm={data.searchTerm}
            setSearchTerm={data.setSearchTerm}
            sortBy={data.sortBy}
            setSortBy={data.setSortBy}
            showClosedExchange={data.showClosedExchange}
            setShowClosedExchange={data.setShowClosedExchange}
            showOnlyEnglish={data.showOnlyEnglish}
            setShowOnlyEnglish={data.setShowOnlyEnglish}
            onToggleCourse={data.toggleCourse}
            onCycleCategory={data.cycleCategory}
            onSetRating={data.handleSetRating}
            onOpenDetails={setDetailsCourse}
          />
        </div>
      </main>

      <footer className="text-muted-foreground border-t py-6 text-center text-xs">
        <div className="mx-auto max-w-7xl px-6">
          KU Sejong · Planificateur communautaire auto-hébergé
          {user ? ` · connecté en tant que ${user.displayName}` : ''}
        </div>
      </footer>

      <CourseDetailsDialog
        course={detailsCourse}
        isSelected={data.selectedCourses.some(
          selected => detailsKey !== null && courseKey(selected) === detailsKey
        )}
        rating={detailsKey ? data.ratings[detailsKey] || 0 : 0}
        note={detailsKey ? data.comments[detailsKey] || '' : ''}
        comments={detailsKey ? (discussions.threads[detailsKey] ?? []) : []}
        calendarId={data.activeCalendarId}
        calendarName={data.activeCalendar?.name}
        onOpenChange={open => !open && setDetailsCourse(null)}
        onSetRating={data.handleSetRating}
        onSetNote={data.handleSetComment}
        onToggleCourse={data.toggleCourse}
        onSendComment={discussions.addComment}
        onDeleteComment={discussions.removeComment}
        onRequireAuth={() => requireAuth('Connectez-vous pour participer à la discussion.')}
      />

      <CommunityCalendarsDialog
        open={communityOpen}
        onOpenChange={setCommunityOpen}
        activeCalendarId={data.activeCalendarId}
        canSaveActive={Boolean(data.activeCalendar?.isOwner)}
        onSelectCalendar={id => {
          void data.loadCalendarById(id);
          setCommunityOpen(false);
        }}
        onOpenCreate={() => setCreateOpen(true)}
        onSaveActive={data.saveActiveCalendar}
        onDuplicate={data.duplicateCalendar}
        onDelete={data.deleteCalendar}
        onRequireAuth={() => requireAuth('Créez un compte pour publier votre propre planning.')}
      />

      <CreateCalendarDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        currentCourseCount={data.selectedCourses.length}
        onCreate={async (name, description, copyCurrent) => {
          const created = await data.createNewCalendar(name, description, copyCurrent);
          if (created) setCommunityOpen(false);
          return created;
        }}
      />

      <CustomCourseDialog
        open={customCourseOpen}
        onOpenChange={setCustomCourseOpen}
        onAddCourse={data.addCustomCourse}
      />

      <PasteJsonDialog open={pasteOpen} onOpenChange={setPasteOpen} onSubmit={data.processJsonText} />

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} reason={authReason} />
    </div>
  );
}
