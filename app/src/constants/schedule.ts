import { Category, Course } from '../types/course';

export const CATEGORY_LABELS: Record<Category, string> = {
  IT: 'IT',
  BUSINESS: 'Business',
  KOREAN: 'Coréen',
  OTHERS: 'Autre'
};

export const CATEGORY_ORDER: Category[] = ['IT', 'BUSINESS', 'KOREAN', 'OTHERS'];

/**
 * One secondary colour per course type, driven by the `--cat-*` tokens in
 * index.css so both light and dark themes stay legible.
 * - `badge`: tinted surface for pills and category chips
 * - `grid`: timetable cell surface
 * - `accent`: solid swatch (legend dots, left borders)
 */
export const CATEGORY_COLORS: Record<Category, { badge: string; grid: string; accent: string }> = {
  IT: {
    badge: 'bg-cat-it-soft text-cat-it-strong border-cat-it/30',
    grid: 'bg-cat-it-soft text-cat-it-strong border-cat-it/40 hover:border-cat-it',
    accent: 'bg-cat-it'
  },
  BUSINESS: {
    badge: 'bg-cat-business-soft text-cat-business-strong border-cat-business/30',
    grid: 'bg-cat-business-soft text-cat-business-strong border-cat-business/40 hover:border-cat-business',
    accent: 'bg-cat-business'
  },
  KOREAN: {
    badge: 'bg-cat-korean-soft text-cat-korean-strong border-cat-korean/30',
    grid: 'bg-cat-korean-soft text-cat-korean-strong border-cat-korean/40 hover:border-cat-korean',
    accent: 'bg-cat-korean'
  },
  OTHERS: {
    badge: 'bg-cat-others-soft text-cat-others-strong border-cat-others/30',
    grid: 'bg-cat-others-soft text-cat-others-strong border-cat-others/40 hover:border-cat-others',
    accent: 'bg-cat-others'
  }
};

export const PERIODS_MAP: Record<number, { start: string; label: string }> = {
  1: { start: '09:00', label: 'P1' },
  2: { start: '10:00', label: 'P2' },
  3: { start: '11:00', label: 'P3' },
  4: { start: '12:00', label: 'P4' },
  5: { start: '13:00', label: 'P5' },
  6: { start: '14:00', label: 'P6' },
  7: { start: '15:00', label: 'P7' },
  8: { start: '16:00', label: 'P8' },
  9: { start: '17:00', label: 'P9' },
  10: { start: '18:00', label: 'P10' },
  11: { start: '19:00', label: 'P11' },
  12: { start: '20:00', label: 'P12' },
  13: { start: '21:00', label: 'P13' },
  14: { start: '22:00', label: 'P14' }
};

export const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const DAYS_FR: Record<string, string> = {
  Mon: 'Lundi',
  Tue: 'Mardi',
  Wed: 'Mercredi',
  Thu: 'Jeudi',
  Fri: 'Vendredi',
  Sat: 'Samedi'
};

export const DAY_NORMALIZER: Record<string, string> = {
  monday: 'Mon', lundi: 'Mon', mon: 'Mon',
  tuesday: 'Tue', mardi: 'Tue', tue: 'Tue',
  wednesday: 'Wed', mercredi: 'Wed', wed: 'Wed',
  thursday: 'Thu', jeudi: 'Thu', thu: 'Thu',
  friday: 'Fri', vendredi: 'Fri', fri: 'Fri',
  saturday: 'Sat', samedi: 'Sat', sat: 'Sat'
};

export const FALLBACK_COURSES: Course[] = [
  {
    COUR_CD: 'SLSC221', COUR_NM: 'KOREAN FOR BEGINNERS I', CREDIT: '3',
    TIME_ROOM: 'Wed(3) 25-520<br>Fri(2-3) 25-408', PROF_NM: '',
    DEPARTMENT: 'Institute for General Education', COUR_CLS: '00',
    TIME: '', MOOC_YN: '0', NEMO_YN: '0', EXCH_COR_YN: '0', LMT_YN: '0'
  },
  {
    COUR_CD: 'DCSS201', COUR_NM: 'DATA STRUCTURE(English)', CREDIT: '3',
    TIME_ROOM: 'Wed(3) 7-324<br>Fri(5-6) 7-324', PROF_NM: 'Chung, In Jeong',
    DEPARTMENT: 'Department of Computer Software', COUR_CLS: '00',
    TIME: '', MOOC_YN: '0', NEMO_YN: '0', EXCH_COR_YN: '0', LMT_YN: '0'
  },
  {
    COUR_CD: 'GLOB201', COUR_NM: 'ORGANIZATIONAL BEHAVIOR(English)', CREDIT: '3',
    TIME_ROOM: 'Tuesday(2) 33-426<br>Wednesday(1-2) 33-426', PROF_NM: 'Lee, Soojin',
    DEPARTMENT: 'Global Business in Division of Convergence Business', COUR_CLS: '02',
    TIME: '', MOOC_YN: '0', NEMO_YN: '0', EXCH_COR_YN: '0', LMT_YN: '0'
  }
];
