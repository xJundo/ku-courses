import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CATEGORY_ORDER, FALLBACK_COURSES } from '@/constants/schedule';
import { ApiError, calendarApi } from '@/lib/api';
import type {
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

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function useCoursesData() {
  const [courses, setCourses] = useState<Course[]>(FALLBACK_COURSES);
  const [selectedCourses, setSelectedCourses] = useState<ProcessedCourse[]>([]);
  const [categoryOverrides, setCategoryOverrides] = useLocalStorageState<Record<string, Category>>('ku_cat_overrides', {});
  const [ratings, setRatings] = useLocalStorageState<Record<string, number>>('ku_ratings', {});
  // Private per-course notes of the current session (published as `notes`).
  const [comments, setComments] = useLocalStorageState<Record<string, string>>('ku_comments', {});
  const [customCourses, setCustomCourses] = useLocalStorageState<Course[]>('ku_custom_courses', []);

  const [activeCalendar, setActiveCalendar] = useState<CommunityCalendar | null>(null);
  const [activeCalendarId, setActiveCalendarId] = useLocalStorageState<string | null>('ku_active_calendar_id', null);

  const [searchTerm, setSearchTerm] = useState('');
  const [showClosedExchange, setShowClosedExchange] = useState(false);
  const [showOnlyEnglish, setShowOnlyEnglish] = useState(true);
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

  // Restore the previous selection once the catalog is available.
  useEffect(() => {
    if (selectedCourses.length > 0 || coursesWithSchedules.length === 0) return;
    const savedKeys = loadLocalStorage<string[]>('ku_selected_keys', []);
    if (savedKeys.length === 0) return;

    const keySet = new Set(savedKeys);
    const restored = coursesWithSchedules.filter(course => keySet.has(courseKey(course)));
    if (restored.length > 0) setSelectedCourses(restored);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs when the catalog lands
  }, [coursesWithSchedules]);

  const loadCalendarById = useCallback(
    async (id: string, options: { silent?: boolean } = {}) => {
      try {
        const { calendar } = await calendarApi.get(id);

        setActiveCalendar(calendar);
        setActiveCalendarId(calendar.id);
        setCategoryOverrides(calendar.categoryOverrides || {});
        setRatings(calendar.ratings || {});
        setComments(calendar.notes || {});
        if (Array.isArray(calendar.customCourses) && calendar.customCourses.length > 0) {
          setCustomCourses(calendar.customCourses);
          setCourses(prev => {
            const existing = new Set(prev.map(courseKey));
            const extra = calendar.customCourses.filter(course => !existing.has(courseKey(course)));
            return extra.length > 0 ? [...extra, ...prev] : prev;
          });
        }

        const keySet = new Set(calendar.selectedCourseKeys || []);
        setSelectedCourses(coursesWithSchedules.filter(course => keySet.has(courseKey(course))));

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
    [coursesWithSchedules, setActiveCalendarId, setCategoryOverrides, setComments, setCustomCourses, setRatings]
  );

  // Resolve a calendar from the URL (?calendar=) or the last one used.
  const [bootstrapped, setBootstrapped] = useState(false);
  useEffect(() => {
    if (bootstrapped || coursesWithSchedules.length === 0) return;
    setBootstrapped(true);

    const params = new URLSearchParams(window.location.search);
    const targetId = params.get('calendar') || params.get('c') || activeCalendarId;
    if (targetId) void loadCalendarById(targetId, { silent: true });
  }, [bootstrapped, coursesWithSchedules.length, activeCalendarId, loadCalendarById]);

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
        ratings,
        notes: comments,
        customCourses,
        totalCredits
      });
      setActiveCalendar(calendar);
      toast.success(`Modifications enregistrées sur « ${calendar.name} ».`);
    } catch (err) {
      toast.error(errorMessage(err, "Erreur lors de l'enregistrement."));
    }
  }, [activeCalendar, categoryOverrides, comments, customCourses, ratings, selectedCourses, totalCredits]);

  const createNewCalendar = useCallback(
    async (name: string, description: string, copyCurrent: boolean) => {
      try {
        const { calendar } = await calendarApi.create({
          name,
          description,
          selectedCourseKeys: copyCurrent ? selectedCourses.map(courseKey) : [],
          categoryOverrides: copyCurrent ? categoryOverrides : {},
          ratings: copyCurrent ? ratings : {},
          notes: copyCurrent ? comments : {},
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
    [categoryOverrides, comments, customCourses, ratings, selectedCourses, setActiveCalendarId, totalCredits]
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

  /** Copies someone else's calendar into a new one owned by the current user. */
  const duplicateCalendar = useCallback(
    async (source: CommunityCalendar) => {
      try {
        const { calendar } = await calendarApi.create({
          name: `Copie de ${source.name}`,
          description: source.description || '',
          selectedCourseKeys: source.selectedCourseKeys || [],
          categoryOverrides: source.categoryOverrides || {},
          ratings: source.ratings || {},
          notes: source.notes || {},
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
    (course: ProcessedCourse, rating: number) => {
      const key = courseKey(course);
      setRatings(prev => {
        const next = { ...prev };
        if (rating <= 0) delete next[key];
        else next[key] = rating;
        return next;
      });
    },
    [setRatings]
  );

  const handleSetComment = useCallback(
    (course: ProcessedCourse, comment: string) => {
      const key = courseKey(course);
      setComments(prev => {
        const next = { ...prev };
        if (!comment.trim()) delete next[key];
        else next[key] = comment;
        return next;
      });
    },
    [setComments]
  );

  const ratedCoursesCount = useMemo(
    () => coursesWithSchedules.filter(course => course.rating > 0 || course.comment.trim().length > 0).length,
    [coursesWithSchedules]
  );

  const filteredCoursesList = useMemo(() => {
    const term = searchTerm.toLowerCase();

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

      return matchesSearch && matchesTab && matchesExchange && matchesEnglish;
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
  }, [coursesWithSchedules, searchTerm, activeTab, showClosedExchange, showOnlyEnglish, sortBy]);

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
          if (parsed.ratings && typeof parsed.ratings === 'object') setRatings(parsed.ratings);
          if (parsed.comments && typeof parsed.comments === 'object') setComments(parsed.comments);
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
    [coursesWithSchedules, customCourses, setCategoryOverrides, setComments, setCustomCourses, setRatings]
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
    duplicateCalendar,
    deleteCalendar,
    detachCalendar,
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
