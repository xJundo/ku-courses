import { useState, useMemo, useEffect } from 'react';
import { Category, Course, ProcessedCourse } from '../types/course';
import { FALLBACK_COURSES, CATEGORY_ORDER } from '../constants/schedule';
import {
  autoClassify,
  computePreferenceTags,
  courseKey,
  getCollege,
  getDifficultyLevel,
  normalizeRow,
  processJsonPayload
} from '../utils/courseUtils';
import { parseSchedule } from '../utils/scheduleUtils';
import { loadLocalStorage, saveLocalStorage } from '../utils/storage';
import { useLocalStorageState } from './useLocalStorage';

export function useCoursesData() {
  const [courses, setCourses] = useState<Course[]>(FALLBACK_COURSES);
  const [selectedCourses, setSelectedCourses] = useState<ProcessedCourse[]>([]);
  const [categoryOverrides, setCategoryOverrides] = useLocalStorageState<Record<string, Category>>('ku_cat_overrides', {});
  const [ratings, setRatings] = useLocalStorageState<Record<string, number>>('ku_ratings', {});
  const [comments, setComments] = useLocalStorageState<Record<string, string>>('ku_comments', {});
  const [customCourses, setCustomCourses] = useLocalStorageState<Course[]>('ku_custom_courses', []);

  const [searchTerm, setSearchTerm] = useState('');
  const [showClosedExchange, setShowClosedExchange] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [sortBy, setSortBy] = useState<'default' | 'rating-desc' | 'rating-asc' | 'code' | 'name'>('default');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogSource, setCatalogSource] = useState('secours (intégré)');

  // Persistence of selected course keys
  useEffect(() => {
    if (selectedCourses.length > 0) {
      saveLocalStorage('ku_selected_keys', selectedCourses.map(courseKey));
    } else {
      saveLocalStorage('ku_selected_keys', []);
    }
  }, [selectedCourses]);

  // Automatic catalog loading on init
  useEffect(() => {
    fetch('/courses.json')
      .then(res => {
        if (!res.ok) throw new Error('Fichier introuvable');
        return res.json();
      })
      .then(data => {
        const rows = Array.isArray(data) ? data : data.rows || [];
        const normalized = rows.map(normalizeRow).filter((r: any) => r.COUR_CD);
        if (normalized.length > 0) {
          const combined = [...customCourses, ...normalized];
          setCourses(combined);
          setCatalogSource(`courses.json (${normalized.length} cours, Fall 2026)`);

          const savedKeys = loadLocalStorage<string[]>('ku_selected_keys', []);
          if (savedKeys.length > 0) {
            const keySet = new Set(savedKeys);
            const restoreSelected = combined.filter(c => keySet.has(courseKey(c)));
            if (restoreSelected.length > 0) {
              // We'll process them to full ProcessedCourse later
            }
          }
        }
      })
      .catch(() => {
        const combined = [...customCourses, ...FALLBACK_COURSES];
        setCourses(combined);
        setJsonError("Impossible de charger public/courses.json automatiquement — le catalogue de secours (3 cours) est utilisé.");
      })
      .finally(() => setLoadingCatalog(false));
  }, []);

  const getEffectiveCategory = (c: Course): Category => {
    const override = categoryOverrides[courseKey(c)];
    return override || autoClassify(c);
  };

  const cycleCategory = (c: ProcessedCourse) => {
    const current = getEffectiveCategory(c);
    const idx = CATEGORY_ORDER.indexOf(current);
    const next = CATEGORY_ORDER[(idx + 1) % CATEGORY_ORDER.length];
    setCategoryOverrides(prev => ({ ...prev, [courseKey(c)]: next }));
  };

  const handleSetRating = (c: ProcessedCourse, rating: number) => {
    const key = courseKey(c);
    setRatings(prev => {
      const next = { ...prev };
      if (rating <= 0) delete next[key];
      else next[key] = rating;
      return next;
    });
  };

  const handleSetComment = (c: ProcessedCourse, comment: string) => {
    const key = courseKey(c);
    setComments(prev => {
      const next = { ...prev };
      if (!comment.trim()) delete next[key];
      else next[key] = comment;
      return next;
    });
  };

  const coursesBase = useMemo(() => {
    return courses.map(c => {
      const category = getEffectiveCategory(c);
      const college = getCollege(c.DEPARTMENT);
      const difficultyLevel = getDifficultyLevel(c.COUR_CD);
      const parsedSchedules = parseSchedule(c.TIME_ROOM);
      const creditsNum = parseFloat(c.CREDIT) || 0;
      const tags = computePreferenceTags(c);
      return {
        ...c,
        category,
        college,
        difficultyLevel,
        parsedSchedules,
        creditsNum,
        ...tags
      };
    });
  }, [courses, categoryOverrides]);

  const coursesWithSchedules: ProcessedCourse[] = useMemo(() => {
    return coursesBase.map(c => {
      const key = courseKey(c);
      const rating = ratings[key] || 0;
      const comment = comments[key] || '';
      return { ...c, rating, comment };
    });
  }, [coursesBase, ratings, comments]);

  // Restore selected courses once coursesWithSchedules is populated
  useEffect(() => {
    if (selectedCourses.length === 0) {
      const savedKeys = loadLocalStorage<string[]>('ku_selected_keys', []);
      if (savedKeys.length > 0 && coursesWithSchedules.length > 0) {
        const keySet = new Set(savedKeys);
        const restoreSelected = coursesWithSchedules.filter(c => keySet.has(courseKey(c)));
        if (restoreSelected.length > 0) {
          setSelectedCourses(restoreSelected);
        }
      }
    }
  }, [coursesWithSchedules]);

  const ratedCoursesCount = useMemo(() => {
    return coursesWithSchedules.filter(c => c.rating > 0 || (c.comment && c.comment.trim().length > 0)).length;
  }, [coursesWithSchedules]);

  const filteredCoursesList = useMemo(() => {
    const filtered = coursesWithSchedules.filter(c => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        c.COUR_NM.toLowerCase().includes(term) ||
        c.COUR_CD.toLowerCase().includes(term) ||
        c.DEPARTMENT.toLowerCase().includes(term) ||
        c.college.toLowerCase().includes(term) ||
        c.PROF_NM.toLowerCase().includes(term) ||
        (c.comment && c.comment.toLowerCase().includes(term));

      let matchesTab = false;
      if (activeTab === 'all') matchesTab = true;
      else if (activeTab === 'rated') matchesTab = c.rating > 0 || (c.comment && c.comment.trim().length > 0);
      else matchesTab = c.category === activeTab.toUpperCase();

      const matchesExchange = showClosedExchange || c.openToExchange;

      return matchesSearch && matchesTab && matchesExchange;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'rating-desc') {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return a.COUR_CD.localeCompare(b.COUR_CD);
      }
      if (sortBy === 'rating-asc') {
        if (a.rating !== b.rating) return a.rating - b.rating;
        return a.COUR_CD.localeCompare(b.COUR_CD);
      }
      if (sortBy === 'code') return a.COUR_CD.localeCompare(b.COUR_CD);
      if (sortBy === 'name') return a.COUR_NM.localeCompare(b.COUR_NM);
      return 0;
    });
  }, [coursesWithSchedules, searchTerm, activeTab, showClosedExchange, sortBy]);

  const toggleCourse = (course: ProcessedCourse) => {
    const isSelected = selectedCourses.some(sc => courseKey(sc) === courseKey(course));
    if (isSelected) {
      setSelectedCourses(selectedCourses.filter(sc => courseKey(sc) !== courseKey(course)));
    } else {
      setSelectedCourses([...selectedCourses, course]);
    }
  };

  const processJsonText = (rawText: string) => {
    try {
      let cleanText = rawText.trim();
      if (cleanText.charCodeAt(0) === 0xfeff) cleanText = cleanText.slice(1);

      const parsed = JSON.parse(cleanText);

      // Session backup file check
      if (parsed.type === 'ku_planner_backup' || parsed.ratings || parsed.comments || parsed.selectedCourseKeys) {
        if (parsed.ratings && typeof parsed.ratings === 'object') setRatings(parsed.ratings);
        if (parsed.comments && typeof parsed.comments === 'object') setComments(parsed.comments);
        if (parsed.categoryOverrides && typeof parsed.categoryOverrides === 'object') setCategoryOverrides(parsed.categoryOverrides);
        if (parsed.customCourses && Array.isArray(parsed.customCourses)) setCustomCourses(parsed.customCourses);

        const restoreKeys = parsed.selectedCourseKeys || [];
        if (Array.isArray(restoreKeys) && restoreKeys.length > 0) {
          const keySet = new Set(restoreKeys);
          const allAvailable = [...(parsed.customCourses || []), ...courses];
          const matched = allAvailable.filter(c => keySet.has(courseKey(c)));
          // update will process via effect
        }

        const ratedNum = Object.keys(parsed.ratings || {}).length;
        const commentsNum = Object.keys(parsed.comments || {}).length;
        setJsonError(null);
        setImportSuccess(true);
        setCatalogSource(`Session restaurée (${ratedNum} notes, ${commentsNum} commentaires)`);
        setTimeout(() => setImportSuccess(false), 5000);
        return;
      }

      // Otherwise raw catalog JSON
      const normalized = processJsonPayload(cleanText);
      const combined = [...customCourses, ...normalized];
      setCourses(combined);
      setCatalogSource(`fichier catalogue importé (${normalized.length} cours)`);
      setJsonError(null);
      setImportSuccess(true);
      setTimeout(() => setImportSuccess(false), 5000);
    } catch (err: any) {
      setJsonError(`Erreur de lecture du JSON : ${err.message}`);
      setImportSuccess(false);
    }
  };

  const addCustomCourse = (newCourse: Course) => {
    setCustomCourses(prev => [newCourse, ...prev]);
    setCourses(prev => [newCourse, ...prev]);
  };

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
    searchTerm,
    setSearchTerm,
    showClosedExchange,
    setShowClosedExchange,
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
  };
}
