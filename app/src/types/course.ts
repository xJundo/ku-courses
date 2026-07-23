export type Category = 'IT' | 'BUSINESS' | 'KOREAN' | 'OTHERS';
export type SortOption = 'default' | 'rating-desc' | 'rating-asc' | 'level-asc' | 'level-desc' | 'code' | 'name';


export interface RawCourse {
  COUR_CD?: string;
  COUR_NM?: string;
  CREDIT?: string;
  TIME_ROOM?: string;
  PROF_NM?: string;
  DEPARTMENT?: string;
  COUR_CLS?: string;
  TIME?: string;
  MOOC_YN?: string;
  NEMO_YN?: string;
  EXCH_COR_YN?: string;
  LMT_YN?: string;
  ENG_YN?: string;
  ENG100?: string;
  PARAMS?: string;
  [key: string]: any;
}

export interface Course {
  COUR_CD: string;
  COUR_NM: string;
  CREDIT: string;
  TIME_ROOM: string;
  PROF_NM: string;
  DEPARTMENT: string;
  COUR_CLS: string;
  TIME: string;
  MOOC_YN: string;
  NEMO_YN: string;
  EXCH_COR_YN: string;
  LMT_YN: string;
  ENG_YN?: string;
  ENG100?: string;
  YEAR?: string;
  TERM?: string;
  GRAD_CD?: string;
  DEPT_CD?: string;
}

export interface ParsedSchedule {
  day: string;
  periods: number[];
  room: string;
  raw: string;
}

export interface PreferenceTags {
  cyber: boolean;
  robotics: boolean;
  electronicsAvoid: boolean;
  mathHeavy: boolean;
  aiFit: boolean;
  softwareEasy: boolean;
  isOnline: boolean;
  openToExchange: boolean;
  seatsLimited: boolean;
  isEnglish: boolean;
  score: number;
}

export interface ProcessedCourse extends Course, PreferenceTags {
  category: Category;
  college: string;
  difficultyLevel: number | null;
  parsedSchedules: ParsedSchedule[];
  creditsNum: number;
  rating: number;
  comment: string;
}

export interface SelectedStats {
  totalCredits: number;
  koreanCount: number;
  itCount: number;
  businessCount: number;
  othersCount: number;
  activeDays: Set<string>;
  hasConflict: boolean;
  nonExchangeCourses: ProcessedCourse[];
  limitedSeatsCourses: ProcessedCourse[];
}

export interface ValidationDetails {
  ruleMet: boolean;
  creditsMet: boolean;
  daysMet: boolean;
  exchangeMet: boolean;
  isValidOverall: boolean;
}

export interface SessionBackup {
  type: string;
  version: string;
  exportDate: string;
  selectedCourseKeys: string[];
  categoryOverrides: Record<string, Category>;
  ratings: Record<string, number>;
  comments: Record<string, string>;
  customCourses: Course[];
}

export interface CommunityCalendar {
  id: string;
  name: string;
  author: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  selectedCourseKeys: string[];
  categoryOverrides: Record<string, Category>;
  ratings: Record<string, number>;
  comments: Record<string, string>;
  customCourses: Course[];
  courseCount?: number;
  totalCredits?: number;
}

export interface CustomCourseFormData {
  COUR_CD: string;
  COUR_NM: string;
  CREDIT: string;
  PROF_NM: string;
  DEPARTMENT: string;
  COUR_CLS: string;
  DAY: string;
  START_PERIOD: string;
  END_PERIOD: string;
  ROOM: string;
  ENG_YN: string;
}

