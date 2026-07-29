import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CATEGORY_ORDER, FALLBACK_COURSES } from '@/constants/schedule';
import { ApiError, calendarApi } from '@/lib/api';
import type {
  CalendarVisibility,
  Category,
  CommunityCalendar,
  Course,
  ProcessedCourse,
  SortOption
} from '@/types/course';
import {
  autoClassify,
  computePreferenceTags,
  courseKey,
  getCollege,
  getDifficultyLevel,
  normalizeRow,
  processJsonPayload
} from '@/utils/courseUtils';
import { parseSchedule } from '@/utils/scheduleUtils';
import { loadLocalStorage, saveLocalStorage } from '@/utils/storage';
import { useLocalStorageState } from './useLocalStorage';
import { useMyRatings } from './useMyRatings';

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function useCoursesData() {
  const [courses, setCourses] = useState<Course[]>(FALLBACK_COURSES);
  const [selectedCourses, setSelectedCourses] = useState<ProcessedCourse[]>([]);
  const [categoryOverrides, setCategoryOverrides] = useLocalStorageState<Record<string, Category>>('ku_cat_overrides', {});
  const [customCourses, setCustomCourses] = useLocalStorageState<Course[]>('ku_custom_courses', []);

  // Ratings and private notes follow the signed-in profile, not the calendar
  // currently open — opening someone else's planning no longer touches them.
  const { ratings, notes: comments, setRating, setNote } = useMyRatings();

  // Course keys waiting to be matched against the catalog. The catalog is
  // fetched asynchronously, so a selection restored before it lands must not be
  // resolved against the (3-course) fallback list.
  const [pendingSelectionKeys, setPendingSelectionKeys] = useState<string[] | null>(null);
  // Captured at mount: the persistence effect below rewrites this key with an
  // empty array on the very first commit, so it has to be read before that.
  const [savedSelectionKeys] = useState(() => loadLocalStorage<string[]>('ku_selected_keys', []));

  const [activeCalendar, setActiveCalendar] = useState<CommunityCalendar | null>(null);
  const [activeCalendarId, setActiveCalendarId] = useLocalStorageState<string | null>('ku_active_calendar_id', null);

  const [searchTerm, setSearchTerm] = useState('');
  const [showClosedExchange, setShowClosedExchange] = useState(false);
  const [showOnlyEnglish, setShowOnlyEnglish] = useState(true);
  const [showOnlyWithoutConflict, setShowOnlyWithoutConflict] = useState(false);
  const [hideThursdayFriday, setHideThursdayFriday] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogSource, setCatalogSource] = useState('secours (intégré)');

  useEffect(() => {
    saveLocalStorage('ku_selected_keys', selectedCourses.map(courseKey));
  }, [selectedCourses]);

  // Automatic catalog loading on init.
  useEffect(() => {
    fetch('/courses.json')
      .then(res => {
        if (!res.ok) throw new Error('Fichier introuvable');
        return res.json();
      })
      .then(data => {
        const rows = Array.isArray(data) ? data : data.rows || [];
        const normalized = rows.map(normalizeRow).filter((row: any) => row.COUR_CD);
        if (normalized.length > 0) {
          setCourses([...customCourses, ...normalized]);
          setCatalogSource(`courses.json (${normalized.length} cours)`);
        }
      })
      .catch(() => {
        setCourses([...customCourses, ...FALLBACK_COURSES]);
        setJsonError(
          'Impossible de charger public/courses.json — le catalogue de secours (3 cours) est utilisé.'
        );
      })
      .finally(() => setLoadingCatalog(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot bootstrap
  }, []);

  const getEffectiveCategory = useCallback(
    (course: Course): Category => categoryOverrides[courseKey(course)] || autoClassify(course),
    [categoryOverrides]
  );

  const coursesBase = useMemo(
    () =>
      courses.map(course => ({
        ...course,
        category: getEffectiveCategory(course),
        college: getCollege(course.DEPARTMENT),
        difficultyLevel: getDifficultyLevel(course.COUR_CD),
        parsedSchedules: parseSchedule(course.TIME_ROOM),
        creditsNum: parseFloat(course.CREDIT) || 0,
        ...computePreferenceTags(course)
      })),
    [courses, getEffectiveCategory]
  );

  const coursesWithSchedules: ProcessedCourse[] = useMemo(
    () =>
      coursesBase.map(course => {
        const key = courseKey(course);
        return { ...course, rating: ratings[key] || 0, comment: comments[key] || '' };
      }),
    [coursesBase, ratings, comments]
  );

  // Turn pending keys into actual courses once the catalog — and any custom
  // courses that came with a calendar — are in state.
  useEffect(() => {
    if (!pendingSelectionKeys || loadingCatalog) return;
    const keySet = new Set(pendingSelectionKeys);
    setSelectedCourses(coursesWithSchedules.filter(course => keySet.has(courseKey(course))));
    setPendingSelectionKeys(null);
  }, [pendingSelectionKeys, loadingCatalog, coursesWithSchedules]);

  const loadCalendarById = useCallback(
    async (id: string, options: { silent?: boolean } = {}) => {
      try {
        const { calendar } = await calendarApi.get(id);

        setActiveCalendar(calendar);
        setActiveCalendarId(calendar.id);
        setCategoryOverrides(calendar.categoryOverrides || {});
        if (Array.isArray(calendar.customCourses) && calendar.customCourses.length > 0) {
          setCustomCourses(calendar.customCourses);
          setCourses(prev => {
            const existing = new Set(prev.map(courseKey));
            const extra = calendar.customCourses.filter(course => !existing.has(courseKey(course)));
            return extra.length > 0 ? [...extra, ...prev] : prev;
          });
        }

        // Deferred on purpose: filtering here would race the catalog fetch and
        // the custom courses merged in just above.
        setPendingSelectionKeys(calendar.selectedCourseKeys || []);

        const url = new URL(window.location.href);
        url.searchParams.set('calendar', calendar.id);
        window.history.replaceState({}, '', url.toString());

        if (!options.silent) toast.success(`Calendrier « ${calendar.name} » chargé.`);
        return calendar;
      } catch (err) {
        // A stale id in localStorage or in the URL should not block startup.
        if (err instanceof ApiError && err.status === 404) {
          setActiveCalendar(null);
          setActiveCalendarId(null);
        }
        if (!options.silent) toast.error(errorMessage(err, 'Chargement du calendrier impossible.'));
        return null;
      }
    },
    [setActiveCalendarId, setCategoryOverrides, setCustomCourses]
  );

  // Restore the previous selection, then the calendar from the URL (?calendar=)
  // or the last one used. Waits for the catalog so the keys match against the
  // real course list rather than the fallback one.
  const [bootstrapped, setBootstrapped] = useState(false);
  useEffect(() => {
    if (bootstrapped || loadingCatalog) return;
    setBootstrapped(true);

    if (savedSelectionKeys.length > 0) setPendingSelectionKeys(savedSelectionKeys);

    const params = new URLSearchParams(window.location.search);
    const targetId = params.get('calendar') || params.get('c') || activeCalendarId;
    // Resolves later than the line above, so the calendar wins when there is one.
    if (targetId) void loadCalendarById(targetId, { silent: true });
  }, [bootstrapped, loadingCatalog, activeCalendarId, loadCalendarById, savedSelectionKeys]);

  const totalCredits = useMemo(
    () => selectedCourses.reduce((acc, course) => acc + course.creditsNum, 0),
    [selectedCourses]
  );

  const saveActiveCalendar = useCallback(async () => {
    if (!activeCalendar?.isOwner) return;
    try {
      const { calendar } = await calendarApi.update(activeCalendar.id, {
        selectedCourseKeys: selectedCourses.map(courseKey),
        categoryOverrides,
        customCourses,
        totalCredits
      });
      setActiveCalendar(calendar);
      toast.success(`Modifications enregistrées sur « ${calendar.name} ».`);
    } catch (err) {
      toast.error(errorMessage(err, "Erreur lors de l'enregistrement."));
    }
  }, [activeCalendar, categoryOverrides, customCourses, selectedCourses, totalCredits]);

  const createNewCalendar = useCallback(
    async (
      name: string,
      description: string,
      copyCurrent: boolean,
      visibility: CalendarVisibility = 'public'
    ) => {
      try {
        const { calendar } = await calendarApi.create({
          name,
          description,
          visibility,
          selectedCourseKeys: copyCurrent ? selectedCourses.map(courseKey) : [],
          categoryOverrides: copyCurrent ? categoryOverrides : {},
          customCourses: copyCurrent ? customCourses : [],
          totalCredits: copyCurrent ? totalCredits : 0
        });

        setActiveCalendar(calendar);
        setActiveCalendarId(calendar.id);
        if (!copyCurrent) setSelectedCourses([]);

        const url = new URL(window.location.href);
        url.searchParams.set('calendar', calendar.id);
        window.history.replaceState({}, '', url.toString());

        toast.success(`« ${calendar.name} » est publié sur les calendriers communautaires.`);
        return calendar;
      } catch (err) {
        toast.error(errorMessage(err, 'Erreur lors de la création du calendrier.'));
        return null;
      }
    },
    [categoryOverrides, customCourses, selectedCourses, setActiveCalendarId, totalCredits]
  );

  /** Renames a calendar / updates its note, without touching its course selection. */
  const updateCalendarMeta = useCallback(
    async (id: string, name: string, description: string) => {
      try {
        const { calendar } = await calendarApi.update(id, { name, description });
        if (activeCalendar?.id === calendar.id) setActiveCalendar(calendar);
        toast.success(`« ${calendar.name} » mis à jour.`);
        return calendar;
      } catch (err) {
        toast.error(errorMessage(err, 'Modification impossible.'));
        return null;
      }
    },
    [activeCalendar]
  );

  /** Opens a calendar to everybody, or to an explicit list of profiles. */
  const updateCalendarAccess = useCallback(
    async (id: string, visibility: CalendarVisibility, sharedWith: string[]) => {
      try {
        const result = await calendarApi.setShares(id, visibility, sharedWith);
        setActiveCalendar(prev =>
          prev?.id === id
            ? {
                ...prev,
                visibility: result.visibility,
                sharedWith: result.sharedWith,
                sharedCount: result.sharedWith.length
              }
            : prev
        );
        toast.success(
          result.visibility === 'public'
            ? 'Calendrier visible par tout le monde.'
            : `Accès limité à ${result.sharedWith.length} profil(s).`
        );
        return result;
      } catch (err) {
        toast.error(errorMessage(err, 'Modification des accès impossible.'));
        return null;
      }
    },
    []
  );

  /**
   * Copies someone else's calendar into a new one owned by the current user.
   * Only the course selection travels: the copy shows the new owner's own
   * ratings, never the ones of the person it was copied from.
   */
  const duplicateCalendar = useCallback(
    async (source: CommunityCalendar) => {
      try {
        const { calendar } = await calendarApi.create({
          name: `Copie de ${source.name}`,
          description: source.description || '',
          selectedCourseKeys: source.selectedCourseKeys || [],
          categoryOverrides: source.categoryOverrides || {},
          customCourses: source.customCourses || [],
          totalCredits: source.totalCredits || 0
        });
        await loadCalendarById(calendar.id, { silent: true });
        toast.success(`Copie créée : « ${calendar.name} ».`);
        return calendar;
      } catch (err) {
        toast.error(errorMessage(err, 'Erreur lors de la duplication.'));
        return null;
      }
    },
    [loadCalendarById]
  );

  const deleteCalendar = useCallback(
    async (id: string) => {
      try {
        await calendarApi.remove(id);
        if (activeCalendarId === id) {
          setActiveCalendar(null);
          setActiveCalendarId(null);
          const url = new URL(window.location.href);
          url.searchParams.delete('calendar');
          window.history.replaceState({}, '', url.toString());
        }
        toast.success('Calendrier supprimé.');
        return true;
      } catch (err) {
        toast.error(errorMessage(err, 'Suppression impossible.'));
        return false;
      }
    },
    [activeCalendarId, setActiveCalendarId]
  );

  const detachCalendar = useCallback(() => {
    setActiveCalendar(null);
    setActiveCalendarId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('calendar');
    window.history.replaceState({}, '', url.toString());
  }, [setActiveCalendarId]);

  const cycleCategory = useCallback(
    (course: ProcessedCourse) => {
      const current = getEffectiveCategory(course);
      const next = CATEGORY_ORDER[(CATEGORY_ORDER.indexOf(current) + 1) % CATEGORY_ORDER.length];
      setCategoryOverrides(prev => ({ ...prev, [courseKey(course)]: next }));
    },
    [getEffectiveCategory, setCategoryOverrides]
  );

  const handleSetRating = useCallback(
    (course: ProcessedCourse, rating: number) => setRating(courseKey(course), rating),
    [setRating]
  );

  const handleSetComment = useCallback(
    (course: ProcessedCourse, comment: string) => setNote(courseKey(course), comment),
    [setNote]
  );

  const ratedCoursesCount = useMemo(
    () => coursesWithSchedules.filter(course => course.rating > 0 || course.comment.trim().length > 0).length,
    [coursesWithSchedules]
  );

  const filteredCoursesList = useMemo(() => {
    const term = searchTerm.toLowerCase();

    const selectedKeySet = new Set(selectedCourses.map(courseKey));
    const slotCourseCount = new Map<string, number>();
    if (showOnlyWithoutConflict) {
      for (const selected of selectedCourses) {
        if (selected.isOnline) continue;
        for (const sched of selected.parsedSchedules) {
          for (const p of sched.periods) {
            const slotKey = `${sched.day}-${p}`;
            slotCourseCount.set(slotKey, (slotCourseCount.get(slotKey) || 0) + 1);
          }
        }
      }
    }

    const filtered = coursesWithSchedules.filter(course => {
      const matchesSearch =
        course.COUR_NM.toLowerCase().includes(term) ||
        course.COUR_CD.toLowerCase().includes(term) ||
        course.DEPARTMENT.toLowerCase().includes(term) ||
        course.college.toLowerCase().includes(term) ||
        course.PROF_NM.toLowerCase().includes(term) ||
        course.comment.toLowerCase().includes(term);

      let matchesTab: boolean;
      if (activeTab === 'all') matchesTab = true;
      else if (activeTab === 'rated') matchesTab = course.rating > 0 || course.comment.trim().length > 0;
      else matchesTab = course.category === activeTab.toUpperCase();

      const matchesExchange = showClosedExchange || course.openToExchange;
      const matchesEnglish = !showOnlyEnglish || course.isEnglish;

      let matchesConflict = true;
      if (showOnlyWithoutConflict) {
        if (!course.isOnline && course.parsedSchedules.length > 0) {
          const isSelected = selectedKeySet.has(courseKey(course));
          for (const sched of course.parsedSchedules) {
            for (const p of sched.periods) {
              const slotKey = `${sched.day}-${p}`;
              const count = slotCourseCount.get(slotKey) || 0;
              if (isSelected ? count > 1 : count > 0) {
                matchesConflict = false;
                break;
              }
            }
            if (!matchesConflict) break;
          }
        }
      }

      let matchesThuFri = true;
      if (hideThursdayFriday) {
        if (course.parsedSchedules.some(sched => sched.day === 'Thu' || sched.day === 'Fri')) {
          matchesThuFri = false;
        }
      }

      return (
        matchesSearch &&
        matchesTab &&
        matchesExchange &&
        matchesEnglish &&
        matchesConflict &&
        matchesThuFri
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'rating-desc') return b.rating - a.rating || a.COUR_CD.localeCompare(b.COUR_CD);
      if (sortBy === 'rating-asc') return a.rating - b.rating || a.COUR_CD.localeCompare(b.COUR_CD);
      if (sortBy === 'level-asc') {
        return (a.difficultyLevel ?? 999) - (b.difficultyLevel ?? 999) || a.COUR_CD.localeCompare(b.COUR_CD);
      }
      if (sortBy === 'level-desc') {
        return (b.difficultyLevel ?? -1) - (a.difficultyLevel ?? -1) || a.COUR_CD.localeCompare(b.COUR_CD);
      }
      if (sortBy === 'code') return a.COUR_CD.localeCompare(b.COUR_CD);
      if (sortBy === 'name') return a.COUR_NM.localeCompare(b.COUR_NM);
      return 0;
    });
  }, [
    coursesWithSchedules,
    searchTerm,
    activeTab,
    showClosedExchange,
    showOnlyEnglish,
    showOnlyWithoutConflict,
    hideThursdayFriday,
    selectedCourses,
    sortBy
  ]);

  const toggleCourse = useCallback((course: ProcessedCourse) => {
    setSelectedCourses(prev =>
      prev.some(selected => courseKey(selected) === courseKey(course))
        ? prev.filter(selected => courseKey(selected) !== courseKey(course))
        : [...prev, course]
    );
  }, []);

  const processJsonText = useCallback(
    (rawText: string) => {
      try {
        let cleanText = rawText.trim();
        if (cleanText.charCodeAt(0) === 0xfeff) cleanText = cleanText.slice(1);

        const parsed = JSON.parse(cleanText);

        // Session backup rather than a raw catalog.
        if (parsed.type === 'ku_planner_backup' || parsed.ratings || parsed.comments || parsed.selectedCourseKeys) {
          // Restored entry by entry so each one lands on the current profile.
          if (parsed.ratings && typeof parsed.ratings === 'object') {
            for (const [key, value] of Object.entries(parsed.ratings)) {
              setRating(key, Number(value) || 0);
            }
          }
          if (parsed.comments && typeof parsed.comments === 'object') {
            for (const [key, value] of Object.entries(parsed.comments)) {
              setNote(key, String(value ?? ''));
            }
          }
          if (parsed.categoryOverrides && typeof parsed.categoryOverrides === 'object') {
            setCategoryOverrides(parsed.categoryOverrides);
          }
          if (Array.isArray(parsed.customCourses)) setCustomCourses(parsed.customCourses);
          if (Array.isArray(parsed.selectedCourseKeys)) {
            saveLocalStorage('ku_selected_keys', parsed.selectedCourseKeys);
            const keySet = new Set<string>(parsed.selectedCourseKeys);
            setSelectedCourses(coursesWithSchedules.filter(course => keySet.has(courseKey(course))));
          }

          const ratedNum = Object.keys(parsed.ratings || {}).length;
          const commentsNum = Object.keys(parsed.comments || {}).length;
          setJsonError(null);
          setCatalogSource(`Session restaurée (${ratedNum} notes, ${commentsNum} commentaires)`);
          toast.success('Session restaurée.');
          return;
        }

        const normalized = processJsonPayload(cleanText);
        setCourses([...customCourses, ...normalized]);
        setCatalogSource(`catalogue importé (${normalized.length} cours)`);
        setJsonError(null);
        toast.success(`${normalized.length} cours importés.`);
      } catch (err: any) {
        setJsonError(`Erreur de lecture du JSON : ${err.message}`);
        toast.error('JSON invalide.');
      }
    },
    [coursesWithSchedules, customCourses, setCategoryOverrides, setCustomCourses, setNote, setRating]
  );

  const addCustomCourse = useCallback(
    (newCourse: Course) => {
      setCustomCourses(prev => [newCourse, ...prev]);
      setCourses(prev => [newCourse, ...prev]);
      toast.success(`« ${newCourse.COUR_NM} » ajouté au catalogue.`);
    },
    [setCustomCourses]
  );

  return {
    courses,
    selectedCourses,
    setSelectedCourses,
    coursesWithSchedules,
    filteredCoursesList,
    ratedCoursesCount,
    categoryOverrides,
    ratings,
    comments,
    customCourses,
    totalCredits,
    activeCalendar,
    activeCalendarId,
    loadCalendarById,
    saveActiveCalendar,
    createNewCalendar,
    updateCalendarMeta,
    updateCalendarAccess,
    duplicateCalendar,
    deleteCalendar,
    detachCalendar,
    searchTerm,
    setSearchTerm,
    showClosedExchange,
    setShowClosedExchange,
    showOnlyEnglish,
    setShowOnlyEnglish,
    showOnlyWithoutConflict,
    setShowOnlyWithoutConflict,
    hideThursdayFriday,
    setHideThursdayFriday,
    activeTab,
    setActiveTab,
    sortBy,
    setSortBy,
    jsonError,
    setJsonError,
    loadingCatalog,
    catalogSource,
    setCatalogSource,
    toggleCourse,
    cycleCategory,
    handleSetRating,
    handleSetComment,
    processJsonText,
    addCustomCourse
  };
}
