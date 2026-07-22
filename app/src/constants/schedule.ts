import { Category, Course } from '../types/course';

export const CATEGORY_LABELS: Record<Category, string> = {
  IT: 'IT',
  BUSINESS: 'Business',
  KOREAN: 'Coréen',
  OTHERS: 'Autre'
};

export const CATEGORY_ORDER: Category[] = ['IT', 'BUSINESS', 'KOREAN', 'OTHERS'];

export const CATEGORY_COLORS: Record<Category, { bg: string; grid: string }> = {
  KOREAN: {
    bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    grid: 'bg-emerald-950/70 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/60'
  },
  IT: {
    bg: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
    grid: 'bg-violet-950/70 text-violet-300 border-violet-500/30 hover:bg-violet-900/60'
  },
  BUSINESS: {
    bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    grid: 'bg-amber-950/70 text-amber-300 border-amber-500/30 hover:bg-amber-900/60'
  },
  OTHERS: {
    bg: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    grid: 'bg-blue-950/70 text-blue-300 border-blue-500/30 hover:bg-blue-900/60'
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
