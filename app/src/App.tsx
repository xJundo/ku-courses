import { useState } from 'react';
import { AuthDialog } from '@/components/auth/AuthDialog';
import { CourseCatalog } from '@/components/catalog/CourseCatalog';
import { CommunityCalendarsDialog } from '@/components/dialogs/CommunityCalendarsDialog';
import { CourseDetailsDialog } from '@/components/dialogs/CourseDetailsDialog';
import { CreateCalendarDialog } from '@/components/dialogs/CreateCalendarDialog';
import { Header } from '@/components/layout/Header';
import { ScheduleTable } from '@/components/schedule/ScheduleTable';
import { ValidationPanel } from '@/components/schedule/ValidationPanel';
import { useAuth } from '@/context/AuthContext';
import { useCalendarDiscussions } from '@/hooks/useCalendarDiscussions';
import { useCoursesData } from '@/hooks/useCoursesData';
import { useScheduleValidation } from '@/hooks/useScheduleValidation';
import type { ProcessedCourse } from '@/types/course';
import { courseKey } from '@/utils/courseUtils';

export default function App() {
  const { user } = useAuth();
  const data = useCoursesData();
  const { selectedStats, validationDetails } = useScheduleValidation(data.selectedCourses);
  const discussions = useCalendarDiscussions(data.activeCalendarId);

  const [detailsCourse, setDetailsCourse] = useState<ProcessedCourse | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authReason, setAuthReason] = useState<string | undefined>();
  const [communityOpen, setCommunityOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const requireAuth = (reason?: string) => {
    setAuthReason(reason);
    setAuthOpen(true);
  };

  const detailsKey = detailsCourse ? courseKey(detailsCourse) : null;

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <Header
        activeCalendar={data.activeCalendar}
        onOpenCommunity={() => setCommunityOpen(true)}
        onSaveActiveCalendar={data.saveActiveCalendar}
        onOpenAuth={() => requireAuth()}
      />

      <main className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-6 p-4 md:p-6 lg:grid-cols-12">
        <ValidationPanel
          loadingCatalog={data.loadingCatalog}
          jsonError={data.jsonError}
          catalogSource={data.catalogSource}
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
            showOnlyWithoutConflict={data.showOnlyWithoutConflict}
            setShowOnlyWithoutConflict={data.setShowOnlyWithoutConflict}
            hideThursdayFriday={data.hideThursdayFriday}
            setHideThursdayFriday={data.setHideThursdayFriday}
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
        onUpdateMeta={data.updateCalendarMeta}
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

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} reason={authReason} />
    </div>
  );
}
