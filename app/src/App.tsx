import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle,
  AlertTriangle,
  UploadCloud,
  Filter,
  Trash2,
  Plus,
  X,
  Search,
  Sparkles,
  Info,
  Sliders,
  CalendarDays,
  Clipboard,
  PlusCircle,
  Tag,
  Loader2
} from 'lucide-react';

// ----------------------------------------------------------------------------------
// Contrainte réelle : accès à TOUS les collèges de KU Sejong.
// Il n'y a donc plus de liste de codes "approuvés" à filtrer : on charge le
// catalogue complet et on classe chaque cours par mot-clé de département.
// Seule règle imposée par l'utilisateur : 3 cours IT + 1 cours Business + 1 cours Coréen.
// ----------------------------------------------------------------------------------

type Category = 'IT' | 'BUSINESS' | 'KOREAN' | 'OTHERS';

const IT_DEPT_REGEX = /computer|electronics|cyber|software|big data|semiconductor|mobility science|digital healthcare|electro-mechanical|standards and intelligence|data computational|ai semiconductor|smart cities|smart ecocity/i;
const BUSINESS_DEPT_REGEX = /business/i;
const KOREAN_DEPT_REGEX = /korean/i;

// --------- Préférences perso de l'utilisateur (affinité par mot-clé) ---------
const CYBER_REGEX = /cyber|security|crypto|forensic|hack/i;
const ROBOTICS_REGEX = /robot/i;
const ELECTRONICS_DEPT_AVOID_REGEX = /electronics|semiconductor physics|semiconductor element|electro-mechanical|circuit/i;
const MATH_HEAVY_REGEX = /mathematic|calculus|\bstatistic|regression|numerical analysis|matrix theory|bayesian|stochastic|probability|linear algebra|discrete math|optimization theory/i;
const AI_FIT_REGEX = /artificial intelligence|deep learning|machine learning|neural network|generative ai|computer vision|image processing|data science|big data|prompt engineering|natural language/i;
const SOFTWARE_EASY_REGEX = /programming|software|data structure|algorithm|database|operating system|compiler/i;

// --------- Collège (Sejong Campus) déduit du département ---------
// Le champ COL_CD renvoyé par l'API est une constante inutilisable ("9999"),
// donc on retrouve le collège via le nom de département, d'après le tableau
// officiel "Fields of Study (Sejong Campus)" fourni par Epitech/KU.
const COLLEGE_RULES: { college: string; regex: RegExp }[] = [
  {
    college: 'Collège des Sciences & Technologies (College of Science & Technology)',
    regex: /ai cyber security|ai semiconductor|advanced materials chemistry|computer software|electronics and information engineering|biotechnology|food and biotechnology|electro-mechanical|environmental engineering|environmental systems|mobility science|autonomous mobility|semiconductor physics|applied mathematical sciences|data computational|advanced semiconductor process|digital healthcare|pharmaceutical/i
  },
  {
    college: 'Collège Global Business (College of Global Business)',
    regex: /global studies|korean studies in|chinese studies|english studies|german studies|convergence business|digital business|global business|standards and intelligence/i
  },
  {
    college: 'Collège des Politiques Publiques (College of Public Policy)',
    regex: /public administration|public sociology|korean unification|economics and statistics|economic policy|big data science/i
  },
  {
    college: 'Collège Culture & Sports (College of Culture and Sports)',
    regex: /global sport studies|sport business|sport science|cultural heritage convergence|culture creativity|creative writing and media|culture contents/i
  },
  {
    college: 'Division of Smart Cities (unité indépendante)',
    regex: /smart cities|smart ecocity/i
  },
  {
    college: 'Institut d\'Éducation Générale (Institute for General Education)',
    regex: /institute for general education/i
  }
];

function getCollege(department: string) {
  const dept = department.toLowerCase();
  const match = COLLEGE_RULES.find(r => r.regex.test(dept));
  return match ? match.college : 'Collège non identifié (vérifier sur sugang.korea.ac.kr)';
}

// --------- Niveau de difficulté déduit du numéro de cours (1er chiffre du code : 2xx, 3xx, 4xx...) ---------
function getDifficultyLevel(courCd: string): number | null {
  const m = courCd.match(/(\d)\d*/);
  if (!m) return null;
  const level = parseInt(m[1], 10);
  if (!level || level < 1) return null;
  return level;
}

function getDifficultyLabel(level: number | null): string {
  if (level === null) return 'Niveau indéterminé';
  if (level === 1) return `Niveau 1 — Introductif`;
  if (level === 2) return `Niveau 2 — Charge modérée`;
  if (level === 3) return `Niveau 3 — Charge équivalente à une année Epitech`;
  if (level === 4) return `Niveau 4 — Charge élevée`;
  return `Niveau ${level} — Charge très élevée`;
}

function getDifficultyColor(level: number | null): string {
  if (level === null) return 'bg-zinc-700';
  if (level <= 2) return 'bg-emerald-500';
  if (level === 3) return 'bg-amber-500';
  if (level === 4) return 'bg-orange-500';
  return 'bg-red-500';
}

function DifficultyScale({ level, compact }: { level: number | null; compact?: boolean }) {
  const MAX_SEGMENTS = 5;
  const filled = level ? Math.min(level, MAX_SEGMENTS) : 0;
  const color = getDifficultyColor(level);

  if (compact) {
    return (
      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold text-white ${color}`}>
        N{level ?? '?'}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: MAX_SEGMENTS }).map((_, i) => (
          <span key={i} className={`h-1.5 w-3.5 rounded-sm ${i < filled ? color : 'bg-zinc-700'}`} />
        ))}
      </div>
      <span className="text-[10px] text-zinc-400">{getDifficultyLabel(level)}</span>
    </div>
  );
}

function computePreferenceTags(course: { COUR_NM: string; DEPARTMENT: string; MOOC_YN?: string; NEMO_YN?: string; EXCH_COR_YN?: string; LMT_YN?: string }) {
  const name = course.COUR_NM.toLowerCase();
  const dept = course.DEPARTMENT.toLowerCase();

  const cyber = CYBER_REGEX.test(name);
  const robotics = ROBOTICS_REGEX.test(name) || ROBOTICS_REGEX.test(dept);
  const electronicsAvoid = ELECTRONICS_DEPT_AVOID_REGEX.test(dept);
  const mathHeavy = MATH_HEAVY_REGEX.test(name);
  const aiFit = AI_FIT_REGEX.test(name);
  const softwareEasy = /department of computer software/.test(dept) || SOFTWARE_EASY_REGEX.test(name);
  const isOnline = course.MOOC_YN === '1' || course.NEMO_YN === '1';

  // Colonnes "3) X : Exchange Student" et "2) L : Enrollment Limit" du site sugang.korea.ac.kr
  // EXCH_COR_YN = '1' signifie une restriction pour les étudiants en échange (donc FERMÉ) ; '0' = ouvert.
  const openToExchange = course.EXCH_COR_YN !== '1';
  const seatsLimited = course.LMT_YN === '1';

  let score = 0;
  if (cyber) score -= 3;
  if (electronicsAvoid) score -= 2;
  if (mathHeavy) score -= 1;
  if (robotics) score += 3;
  if (aiFit) score += 2;
  if (softwareEasy) score += 1;
  if (!openToExchange) score -= 5;

  return { cyber, robotics, electronicsAvoid, mathHeavy, aiFit, softwareEasy, isOnline, openToExchange, seatsLimited, score };
}

const CATEGORY_LABELS: Record<Category, string> = {
  IT: 'IT',
  BUSINESS: 'Business',
  KOREAN: 'Coréen',
  OTHERS: 'Autre'
};

const CATEGORY_ORDER: Category[] = ['IT', 'BUSINESS', 'KOREAN', 'OTHERS'];

// Petit jeu de secours si /courses.json n'a pas pu être chargé
const FALLBACK_COURSES = [
  {
    COUR_CD: 'SLSC221', COUR_NM: 'KOREAN FOR BEGINNERS I', CREDIT: '3',
    TIME_ROOM: 'Wed(3) 25-520<br>Fri(2-3) 25-408', PROF_NM: '',
    DEPARTMENT: 'Institute for General Education', COUR_CLS: '00'
  },
  {
    COUR_CD: 'DCSS201', COUR_NM: 'DATA STRUCTURE(English)', CREDIT: '3',
    TIME_ROOM: 'Wed(3) 7-324<br>Fri(5-6) 7-324', PROF_NM: 'Chung, In Jeong',
    DEPARTMENT: 'Department of Computer Software', COUR_CLS: '00'
  },
  {
    COUR_CD: 'GLOB201', COUR_NM: 'ORGANIZATIONAL BEHAVIOR(English)', CREDIT: '3',
    TIME_ROOM: 'Tuesday(2) 33-426<br>Wednesday(1-2) 33-426', PROF_NM: 'Lee, Soojin',
    DEPARTMENT: 'Global Business in Division of Convergence Business', COUR_CLS: '02'
  }
];

const PERIODS_MAP: Record<number, { start: string; label: string }> = {
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

const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_FR: Record<string, string> = {
  Mon: 'Lundi', Tue: 'Mardi', Wed: 'Mercredi', Thu: 'Jeudi', Fri: 'Vendredi', Sat: 'Samedi'
};

const DAY_NORMALIZER: Record<string, string> = {
  monday: 'Mon', lundi: 'Mon', mon: 'Mon',
  tuesday: 'Tue', mardi: 'Tue', tue: 'Tue',
  wednesday: 'Wed', mercredi: 'Wed', wed: 'Wed',
  thursday: 'Thu', jeudi: 'Thu', thu: 'Thu',
  friday: 'Fri', vendredi: 'Fri', fri: 'Fri',
  saturday: 'Sat', samedi: 'Sat', sat: 'Sat'
};

function getInsensitiveKey(obj: any, keyName: string) {
  if (!obj) return null;
  const target = keyName.toLowerCase();
  const foundKey = Object.keys(obj).find(k => k.toLowerCase() === target);
  return foundKey ? obj[foundKey] : null;
}

function normalizeRow(row: any) {
  const params = getInsensitiveKey(row, 'PARAMS') || '';
  const rawCode = getInsensitiveKey(row, 'COUR_CD') || getInsensitiveKey(row, 'course_code') || String(params).split('@')[0] || '';
  const name = getInsensitiveKey(row, 'COUR_NM') || getInsensitiveKey(row, 'course_name') || '';
  const credit = getInsensitiveKey(row, 'CREDIT') || getInsensitiveKey(row, 'credit') || '3';
  const timeRoom = getInsensitiveKey(row, 'TIME_ROOM') || getInsensitiveKey(row, 'timeRoom') || '';
  const prof = getInsensitiveKey(row, 'PROF_NM') || getInsensitiveKey(row, 'profNm') || '';
  const dept = getInsensitiveKey(row, 'DEPARTMENT') || getInsensitiveKey(row, 'department') || '';
  const cls = getInsensitiveKey(row, 'COUR_CLS') || getInsensitiveKey(row, 'courCls') || '00';
  const time = getInsensitiveKey(row, 'TIME') || '';
  const mooc = getInsensitiveKey(row, 'MOOC_YN') || '0';
  const nemo = getInsensitiveKey(row, 'NEMO_YN') || '0';
  const exchOk = getInsensitiveKey(row, 'EXCH_COR_YN') || '0';
  const lmt = getInsensitiveKey(row, 'LMT_YN') || '0';

  return {
    COUR_CD: String(rawCode).trim(),
    COUR_NM: String(name).trim(),
    CREDIT: String(credit).trim(),
    TIME_ROOM: String(timeRoom).trim(),
    PROF_NM: String(prof).trim(),
    DEPARTMENT: String(dept).trim(),
    COUR_CLS: String(cls).trim(),
    TIME: String(time).trim(),
    MOOC_YN: String(mooc).trim(),
    NEMO_YN: String(nemo).trim(),
    EXCH_COR_YN: String(exchOk).trim(),
    LMT_YN: String(lmt).trim()
  };
}

function processJsonPayload(rawText: string) {
  let cleanText = rawText.trim();
  if (cleanText.charCodeAt(0) === 0xfeff) cleanText = cleanText.slice(1);

  if (cleanText.startsWith('{') && !cleanText.startsWith('[{') && cleanText.includes('\n')) {
    try {
      cleanText = '[' + cleanText.replace(/}\s*\n*\s*{/g, '},{') + ']';
    } catch {
      // ignore, will fail JSON.parse below with a clear error
    }
  }

  const parsed = JSON.parse(cleanText);
  let rowsList: any[] = [];

  if (Array.isArray(parsed)) rowsList = parsed;
  else if (parsed.rows && Array.isArray(parsed.rows)) rowsList = parsed.rows;
  else if (parsed.data && Array.isArray(parsed.data)) rowsList = parsed.data;
  else if (typeof parsed === 'object') rowsList = [parsed];

  if (rowsList.length === 0) {
    throw new Error("Aucun tableau de cours trouvé (attendu: un array, ou un objet avec une clé 'rows'/'data').");
  }

  return rowsList.map(normalizeRow).filter(r => r.COUR_CD);
}

function autoClassify(course: { COUR_CD: string; COUR_NM: string; DEPARTMENT: string }): Category {
  const dept = course.DEPARTMENT.toLowerCase();
  const name = course.COUR_NM.toLowerCase();
  const code = course.COUR_CD.toUpperCase();

  if (code.startsWith('KORS')) return 'KOREAN';
  if (code.startsWith('SLSC') && name.includes('korean')) return 'KOREAN';
  if (KOREAN_DEPT_REGEX.test(dept)) return 'KOREAN';
  if (BUSINESS_DEPT_REGEX.test(dept)) return 'BUSINESS';
  if (IT_DEPT_REGEX.test(dept)) return 'IT';
  return 'OTHERS';
}

function parseSchedule(timeRoomStr: string) {
  if (!timeRoomStr) return [] as { day: string; periods: number[]; room: string; raw: string }[];

  const formatted = timeRoomStr.replace(/<br>/gi, '\n').replace(/\\r/gi, '').replace(/\r/g, '').replace(/\\n/gi, '\n');
  const parts = formatted.split('\n');
  const schedules: { day: string; periods: number[]; room: string; raw: string }[] = [];

  parts.forEach(part => {
    const trimmed = part.trim();
    if (!trimmed) return;

    const match = trimmed.match(/([A-Za-z]+)\(([^)]+)\)\s*(.*)/);
    if (match) {
      const rawDay = match[1].toLowerCase();
      const day = DAY_NORMALIZER[rawDay] || null;
      if (!day) return;
      const periodsStr = match[2];
      const room = match[3] ? match[3].replace(/&nbsp;/g, ' ').trim() : 'N/A';

      const periods: number[] = [];
      if (periodsStr.includes('-')) {
        const [start, end] = periodsStr.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = start; i <= end; i++) periods.push(i);
        }
      } else {
        const single = Number(periodsStr);
        if (!isNaN(single)) periods.push(single);
      }

      schedules.push({ day, periods, room, raw: trimmed });
    }
  });

  return schedules;
}

function slotsConflict(a: { parsedSchedules: { day: string; periods: number[] }[] }[]) {
  const occ: Record<string, boolean> = {};
  for (const c of a) {
    for (const sc of c.parsedSchedules) {
      for (const p of sc.periods) {
        const key = `${sc.day}-${p}`;
        if (occ[key]) return true;
        occ[key] = true;
      }
    }
  }
  return false;
}

// Jours "présentiel" d'un cours : un cours MOOC/NEMO (visio) ne compte pour aucun jour.
function inPersonDays(course: { parsedSchedules: { day: string }[]; isOnline?: boolean }) {
  if (course.isOnline) return new Set<string>();
  return new Set(course.parsedSchedules.map(sc => sc.day));
}

function unionInPersonDays(courses: { parsedSchedules: { day: string }[]; isOnline?: boolean }[]) {
  const s = new Set<string>();
  courses.forEach(c => inPersonDays(c).forEach(d => s.add(d)));
  return s;
}

// Un cours en ligne (MOOC/NEMO) n'est jamais contraint par les jours autorisés.
function withinAllowedDays(course: { parsedSchedules: { day: string }[]; isOnline?: boolean }, allowedDays: Set<string> | null) {
  if (!allowedDays) return true;
  if (course.isOnline) return true;
  return course.parsedSchedules.every(sc => allowedDays.has(sc.day));
}

// Recherche d'une combinaison valide : 1 Coréen + 1 Business + 3 IT, sans conflit,
// contrainte aux `allowedDays` (sauf cours en ligne), en priorisant les cours IT
// au score de préférence le plus élevé (robotique/IA d'abord, cyber/électronique/maths évités).
function findValidCombo(itList: any[], businessList: any[], koreanList: any[], allowedDays: Set<string> | null, maxDays: number) {
  const BUDGET = 500000;
  const POOL_CAP = 50;
  let counter = 0;

  const itFiltered = itList.filter(c => withinAllowedDays(c, allowedDays));
  const businessFiltered = businessList.filter(c => withinAllowedDays(c, allowedDays));
  const koreanFiltered = koreanList.filter(c => withinAllowedDays(c, allowedDays));

  // Cours IT les mieux notés en premier (préférences : robotique > IA > software, cyber/électronique/maths pénalisés)
  const itSorted = [...itFiltered].sort((a, b) => (b.score || 0) - (a.score || 0));

  for (const k of koreanFiltered) {
    for (const b of businessFiltered) {
      counter++;
      if (counter > BUDGET) return null;

      const base = [k, b];
      if (slotsConflict(base)) continue;
      const baseDays = unionInPersonDays(base);
      if (baseDays.size > maxDays) continue;

      const occBase: Record<string, boolean> = {};
      base.forEach(c => c.parsedSchedules.forEach((sc: any) => sc.periods.forEach((p: number) => (occBase[`${sc.day}-${p}`] = true))));

      const itCandidates = itSorted.filter(it => {
        for (const sc of it.parsedSchedules) {
          for (const p of sc.periods) {
            if (occBase[`${sc.day}-${p}`]) return false;
          }
        }
        return true;
      });

      const pool = itCandidates.slice(0, POOL_CAP);
      const n = pool.length;

      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const pair = [pool[i], pool[j]];
          if (slotsConflict(pair)) continue;
          const daysIJ = new Set(baseDays);
          pair.forEach(c => inPersonDays(c).forEach(d => daysIJ.add(d)));
          if (daysIJ.size > maxDays) continue;

          const occIJ = { ...occBase };
          pair.forEach(c => c.parsedSchedules.forEach((sc: any) => sc.periods.forEach((p: number) => (occIJ[`${sc.day}-${p}`] = true))));

          for (let l = j + 1; l < n; l++) {
            counter++;
            if (counter > BUDGET) return null;
            const third = pool[l];
            let ok = true;
            for (const sc of third.parsedSchedules) {
              for (const p of sc.periods) {
                if (occIJ[`${sc.day}-${p}`]) { ok = false; break; }
              }
              if (!ok) break;
            }
            if (!ok) continue;

            const daysAll = new Set(daysIJ);
            inPersonDays(third).forEach(d => daysAll.add(d));
            if (daysAll.size > maxDays) continue;

            return [k, b, pool[i], pool[j], third];
          }
        }
      }
    }
  }
  return null;
}

export default function App() {
  const [courses, setCourses] = useState<any[]>(FALLBACK_COURSES);
  const [selectedCourses, setSelectedCourses] = useState<any[]>([]);
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, Category>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showClosedExchange, setShowClosedExchange] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteValue, setPasteValue] = useState('');
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogSource, setCatalogSource] = useState('secours (intégré)');
  const [optimizeInfo, setOptimizeInfo] = useState<string | null>(null);

  const [showCustomModal, setShowCustomModal] = useState(false);
  const [detailsCourse, setDetailsCourse] = useState<any>(null);
  const [customCourse, setCustomCourse] = useState({
    COUR_CD: '', COUR_NM: '', CREDIT: '3', PROF_NM: '', DEPARTMENT: '',
    COUR_CLS: '00', DAY: 'Mon', START_PERIOD: '1', END_PERIOD: '2', ROOM: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chargement automatique du catalogue complet (public/courses.json) au démarrage
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
          setCourses(normalized);
          setCatalogSource(`courses.json (${normalized.length} cours, tous collèges, Fall 2R 2026)`);
        }
      })
      .catch(() => {
        setJsonError("Impossible de charger public/courses.json automatiquement — le catalogue de secours (3 cours) est utilisé. Chargez votre propre fichier via 'Charger Fichier'.");
      })
      .finally(() => setLoadingCatalog(false));
  }, []);

  const courseKey = (c: any) => `${c.COUR_CD}-${c.COUR_CLS}`;

  const getEffectiveCategory = (c: any): Category => {
    const override = categoryOverrides[courseKey(c)];
    return override || autoClassify(c);
  };

  const cycleCategory = (c: any) => {
    const current = getEffectiveCategory(c);
    const idx = CATEGORY_ORDER.indexOf(current);
    const next = CATEGORY_ORDER[(idx + 1) % CATEGORY_ORDER.length];
    setCategoryOverrides(prev => ({ ...prev, [courseKey(c)]: next }));
  };

  const processJsonText = (rawText: string) => {
    try {
      const normalized = processJsonPayload(rawText);
      setCourses(normalized);
      setCategoryOverrides({});
      setSelectedCourses([]);
      setCatalogSource(`fichier importé (${normalized.length} cours)`);
      setJsonError(null);
      setImportSuccess(true);
      setPasteMode(false);
      setPasteValue('');
      setTimeout(() => setImportSuccess(false), 5000);
    } catch (err: any) {
      setJsonError(`Erreur de lecture du JSON : ${err.message}`);
      setImportSuccess(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => processJsonText(String(event.target?.result || ''));
    reader.readAsText(file);
  };

  const handlePasteSubmit = () => {
    if (!pasteValue.trim()) return;
    processJsonText(pasteValue);
  };

  const coursesWithSchedules = useMemo(() => {
    return courses.map(c => ({
      ...c,
      category: getEffectiveCategory(c),
      college: getCollege(c.DEPARTMENT),
      difficultyLevel: getDifficultyLevel(c.COUR_CD),
      parsedSchedules: parseSchedule(c.TIME_ROOM),
      creditsNum: parseFloat(c.CREDIT) || 0,
      ...computePreferenceTags(c)
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courses, categoryOverrides]);

  const filteredCoursesList = useMemo(() => {
    return coursesWithSchedules.filter(c => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        c.COUR_NM.toLowerCase().includes(term) ||
        c.COUR_CD.toLowerCase().includes(term) ||
        c.DEPARTMENT.toLowerCase().includes(term) ||
        c.college.toLowerCase().includes(term) ||
        c.PROF_NM.toLowerCase().includes(term);

      const matchesTab = activeTab === 'all' || c.category === activeTab.toUpperCase();
      const matchesExchange = showClosedExchange || c.openToExchange;

      return matchesSearch && matchesTab && matchesExchange;
    });
  }, [coursesWithSchedules, searchTerm, activeTab, showClosedExchange]);

  const toggleCourse = (course: any) => {
    const isSelected = selectedCourses.some(sc => courseKey(sc) === courseKey(course));
    if (isSelected) {
      setSelectedCourses(selectedCourses.filter(sc => courseKey(sc) !== courseKey(course)));
    } else {
      setSelectedCourses([...selectedCourses, course]);
    }
  };

  const selectedStats = useMemo(() => {
    const stats = {
      totalCredits: 0,
      koreanCount: 0,
      itCount: 0,
      businessCount: 0,
      othersCount: 0,
      activeDays: new Set<string>(),
      hasConflict: false,
      nonExchangeCourses: [] as any[],
      limitedSeatsCourses: [] as any[]
    };

    const occupiedSlots: Record<string, any> = {};

    selectedCourses.forEach(c => {
      stats.totalCredits += c.creditsNum;
      if (c.category === 'KOREAN') stats.koreanCount++;
      if (c.category === 'IT') stats.itCount++;
      if (c.category === 'BUSINESS') stats.businessCount++;
      if (c.category === 'OTHERS') stats.othersCount++;
      if (!c.openToExchange) stats.nonExchangeCourses.push(c);
      if (c.seatsLimited) stats.limitedSeatsCourses.push(c);

      c.parsedSchedules.forEach((sched: any) => {
        if (!c.isOnline) stats.activeDays.add(sched.day);
        sched.periods.forEach((p: number) => {
          const slotKey = `${sched.day}-${p}`;
          if (occupiedSlots[slotKey]) stats.hasConflict = true;
          occupiedSlots[slotKey] = c;
        });
      });
    });

    return stats;
  }, [selectedCourses]);

  const validationDetails = useMemo(() => {
    const { koreanCount, itCount, businessCount, totalCredits, activeDays } = selectedStats;

    const ruleMet = itCount >= 3 && businessCount >= 1 && koreanCount >= 1;
    const creditsMet = totalCredits >= 15;
    const daysMet = activeDays.size <= 4 && activeDays.size > 0;
    const exchangeMet = selectedStats.nonExchangeCourses.length === 0;

    return {
      ruleMet,
      creditsMet,
      daysMet,
      exchangeMet,
      isValidOverall: ruleMet && creditsMet && daysMet && exchangeMet && !selectedStats.hasConflict
    };
  }, [selectedStats]);

  const handleAutoOptimize = () => {
    // Colonne "X" du site sugang : un cours non coché ne peut pas être pris par un étudiant en échange,
    // donc on l'exclut d'emblée de la recherche automatique.
    const it = coursesWithSchedules.filter(c => c.category === 'IT' && c.openToExchange);
    const business = coursesWithSchedules.filter(c => c.category === 'BUSINESS' && c.openToExchange);
    const korean = coursesWithSchedules.filter(c => c.category === 'KOREAN' && c.openToExchange);

    if (korean.length === 0 || business.length === 0 || it.length < 3) {
      setJsonError("Pas assez de cours ouverts aux échanges (colonne X) dans ces catégories pour générer une combinaison (il faut au moins 1 Coréen, 1 Business et 3 IT marqués OUVERT). Vérifiez les catégories via le badge cliquable sur chaque carte, ou composez manuellement.");
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
      setJsonError("Aucune combinaison valide trouvée, même en autorisant jusqu'à Vendredi/Samedi. Essayez de composer manuellement, ou reclassez certains cours (badge de catégorie cliquable).");
    }
  };

  const handleAddCustomCourseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const timeRoomStr = `${customCourse.DAY}(${customCourse.START_PERIOD}-${customCourse.END_PERIOD}) ${customCourse.ROOM}`;

    const newCourseObj = {
      COUR_CD: customCourse.COUR_CD.toUpperCase().trim(),
      COUR_NM: customCourse.COUR_NM.toUpperCase().trim(),
      CREDIT: customCourse.CREDIT,
      TIME_ROOM: timeRoomStr,
      PROF_NM: customCourse.PROF_NM,
      DEPARTMENT: customCourse.DEPARTMENT,
      COUR_CLS: customCourse.COUR_CLS,
      TIME: ''
    };

    setCourses(prev => [newCourseObj, ...prev]);
    setShowCustomModal(false);
  };

  const categoryColors: Record<Category, { bg: string; grid: string }> = {
    KOREAN: { bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', grid: 'bg-emerald-950/70 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/60' },
    IT: { bg: 'bg-violet-500/10 border-violet-500/20 text-violet-400', grid: 'bg-violet-950/70 text-violet-300 border-violet-500/30 hover:bg-violet-900/60' },
    BUSINESS: { bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400', grid: 'bg-amber-950/70 text-amber-300 border-amber-500/30 hover:bg-amber-900/60' },
    OTHERS: { bg: 'bg-blue-500/10 border-blue-500/20 text-blue-400', grid: 'bg-blue-950/70 text-blue-300 border-blue-500/30 hover:bg-blue-900/60' }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col selection:bg-violet-500 selection:text-white">

      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-violet-600 to-fuchsia-600 p-2.5 rounded-xl shadow-lg shadow-violet-900/20">
              <CalendarDays className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                KU Sejong Planificateur <span className="text-xs bg-violet-500/20 text-violet-400 border border-violet-500/30 px-2 py-0.5 rounded-full font-mono">Epitech Tech4</span>
              </h1>
              <p className="text-xs text-zinc-400">3 IT + 1 Business + 1 Coréen · 15 crédits mini · Lun-Mer prioritaire, sinon Lun-Jeu</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button onClick={handleAutoOptimize} className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-medium text-sm px-4 py-2 rounded-xl transition duration-200 shadow-md shadow-violet-950/40">
              <Sparkles className="h-4 w-4" />
              <span>Optimisation Auto</span>
            </button>

            <button onClick={() => setShowCustomModal(true)} className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-violet-300 border border-violet-500/30 text-sm px-4 py-2 rounded-xl transition">
              <PlusCircle className="h-4 w-4" />
              <span>Ajouter un cours</span>
            </button>

            <button onClick={() => setPasteMode(!pasteMode)} className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs px-3 py-2 rounded-xl">
              <Clipboard className="h-3.5 w-3.5" />
              <span>{pasteMode ? 'Annuler' : 'Copier-Coller JSON'}</span>
            </button>

            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".json" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-sm px-4 py-2 rounded-xl transition duration-150">
              <UploadCloud className="h-4 w-4" />
              <span>Charger Fichier</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

        <div className="lg:col-span-4 flex flex-col gap-6">

          {loadingCatalog && (
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center gap-3 text-xs text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
              <span>Chargement du catalogue complet...</span>
            </div>
          )}

          {pasteMode && (
            <div className="bg-zinc-900 border border-violet-500/40 p-5 rounded-3xl shadow-xl flex flex-col gap-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clipboard className="h-4 w-4 text-violet-400" />
                <span>Coller le contenu du JSON directement</span>
              </h3>
              <p className="text-xs text-zinc-400">Collez un export de l'API (objet avec "rows", ou tableau brut de cours).</p>
              <textarea
                value={pasteValue}
                onChange={e => setPasteValue(e.target.value)}
                placeholder="Collez le texte JSON ici..."
                className="w-full h-36 bg-zinc-950 text-xs font-mono p-3 rounded-xl border border-zinc-800 focus:outline-none focus:border-violet-500 text-zinc-200"
              />
              <button onClick={handlePasteSubmit} className="bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs py-2 rounded-lg transition">
                Analyser le texte collé
              </button>
            </div>
          )}

          {jsonError && (
            <div className="bg-red-950/40 border border-red-800 text-red-200 p-4 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold text-sm">Rapport</p>
                <p className="mt-1 text-red-300 leading-relaxed">{jsonError}</p>
              </div>
            </div>
          )}

          {importSuccess && (
            <div className="bg-emerald-950/40 border border-emerald-800 text-emerald-200 p-4 rounded-2xl flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold text-sm text-emerald-300">Catalogue mis à jour</p>
                <p className="mt-1 text-emerald-400">{catalogSource}</p>
              </div>
            </div>
          )}

          {optimizeInfo && (
            <div className="bg-violet-950/40 border border-violet-800 text-violet-200 p-4 rounded-2xl flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-violet-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold text-sm text-violet-300">Optimisation Auto</p>
                <p className="mt-1 text-violet-300/90 leading-relaxed">{optimizeInfo}</p>
              </div>
            </div>
          )}

          <div className="bg-zinc-900/60 border border-zinc-800 p-3 rounded-2xl text-[11px] text-zinc-500 text-center">
            Source active : <span className="text-zinc-300">{catalogSource}</span> · {courses.length} cours au total
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col gap-5">
            <h2 className="text-md font-bold text-white flex items-center justify-between border-b border-zinc-800 pb-3">
              <span>Validation de l'inscription</span>
              <span className={`h-2.5 w-2.5 rounded-full ${validationDetails.isValidOverall ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`}></span>
            </h2>

            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-2.5">
                <div className={`p-1 rounded-md mt-0.5 ${validationDetails.creditsMet ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                  {validationDetails.creditsMet ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-zinc-100">Crédits locaux ({selectedStats.totalCredits} / 15)</h3>
                  <p className="text-xs text-zinc-400">Minimum 15 crédits par semestre.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className={`p-1 rounded-md mt-0.5 ${validationDetails.daysMet ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                  {validationDetails.daysMet ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-zinc-100">Jours de présence ({selectedStats.activeDays.size} / 4)</h3>
                  <p className="text-xs text-zinc-400">
                    Jours réservés : {[...selectedStats.activeDays].map(d => DAYS_FR[d] || d).join(', ') || 'aucun'}
                    {' '}(les cours en visio MOOC/NEMO ne comptent pas)
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className={`p-1 rounded-md mt-0.5 ${validationDetails.ruleMet ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                  {validationDetails.ruleMet ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-zinc-100">3 IT + 1 Business + 1 Coréen</h3>
                  <p className="text-xs text-zinc-400">
                    Actuel : {selectedStats.itCount} IT · {selectedStats.businessCount} Business · {selectedStats.koreanCount} Coréen
                    {selectedStats.othersCount > 0 && ` · ${selectedStats.othersCount} Autre`}
                  </p>
                </div>
              </div>

              {selectedStats.hasConflict && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-3 rounded-xl flex items-start gap-2 text-xs">
                  <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  <div><span className="font-semibold">Conflit détecté :</span> deux cours sélectionnés se chevauchent.</div>
                </div>
              )}

              {selectedStats.nonExchangeCourses.length > 0 && (
                <div className="bg-red-950/60 border-2 border-red-600 text-red-200 p-4 rounded-xl flex items-start gap-3 text-xs">
                  <AlertTriangle className="h-6 w-6 text-red-400 shrink-0 animate-pulse" />
                  <div>
                    <p className="font-bold text-sm text-red-300">Cours fermé aux étudiants en échange</p>
                    <p className="mt-1 leading-relaxed">
                      Sur sugang.korea.ac.kr, ces cours n'ont pas la case <strong>"3) X : Exchange Student"</strong> cochée — vous ne pourrez probablement <strong>pas vous y inscrire</strong> :
                    </p>
                    <ul className="mt-1.5 space-y-0.5 list-disc list-inside">
                      {selectedStats.nonExchangeCourses.map((c: any, i: number) => (
                        <li key={i}><span className="font-mono font-bold">{c.COUR_CD}-{c.COUR_CLS}</span> — {c.COUR_NM}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {selectedStats.limitedSeatsCourses.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-3 rounded-xl flex items-start gap-2 text-xs">
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Places limitées (colonne "2) L") :</span> {selectedStats.limitedSeatsCourses.length} cours sélectionné(s) ont un nombre de places restreint — inscrivez-vous en priorité dès l'ouverture de sugang.korea.ac.kr.
                  </div>
                </div>
              )}
            </div>

            <div className={`p-4 rounded-2xl border text-center ${validationDetails.isValidOverall ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-zinc-800/50 border-zinc-800 text-zinc-400'}`}>
              {validationDetails.isValidOverall ? (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-sm font-bold">Emploi du temps éligible</span>
                  <span className="text-xs">15 crédits mini, ≤ 4 jours, 3 IT + 1 Business + 1 Coréen, sans conflit.</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-sm font-semibold">En attente de validation</span>
                  <span className="text-xs">Ajustez votre sélection pour respecter tous les critères.</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col gap-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Info className="h-4 w-4 text-violet-400" />
              <span>Aide</span>
            </h3>
            <div className="text-xs text-zinc-400 space-y-2">
              <p><strong>Catégorie auto-détectée</strong> par département (IT / Business / Coréen / Autre). Si un cours est mal classé, cliquez sur son badge de catégorie pour le corriger manuellement.</p>
              <p><strong>Difficulté</strong> : déduite du 1er chiffre du numéro de cours (2xx = Niveau 2, 3xx = Niveau 3, 4xx = Niveau 4...). Niveau 3 ≈ charge d'une année Epitech classique, au-delà c'est plus lourd.</p>
              <p><strong>Affinités perso</strong> (badges sur chaque carte) : ROBOTIQUE et IA sont priorisés par "Optimisation Auto", CYBER / ÉLECTRONIQUE / MATHS sont évités, SOFTWARE = votre branche (facile).</p>
              <p><strong>Visio (MOOC/NEMO)</strong> : ces cours ne comptent pas dans la limite de jours, vous pouvez les ajouter librement.</p>
              <p><strong>Salles</strong> : le code de salle indique d'abord le bâtiment puis la salle (ex : 35-322).</p>
              <p>Le catalogue chargé par défaut est le fichier <code>public/courses.json</code> (tout Sejong, semestre d'automne 2026). Vous pouvez le remplacer via "Charger Fichier".</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col gap-6">

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-md font-bold text-white flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-violet-400" />
                <span>Mon Emploi du Temps Hebdomadaire</span>
              </h2>
              {selectedCourses.length > 0 && (
                <button onClick={() => setSelectedCourses([])} className="text-xs text-zinc-500 hover:text-red-400 transition">
                  Tout vider
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-xs text-zinc-300">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-2 w-[10%] font-medium">Période</th>
                    {DAYS_SHORT.map(day => (
                      <th key={day} className={`py-3 px-2 w-[15%] text-center font-bold ${selectedStats.activeDays.has(day) ? 'text-violet-400 bg-violet-950/20' : ''}`}>
                        {DAYS_FR[day]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {Object.entries(PERIODS_MAP).map(([pIndex, info]) => (
                    <tr key={pIndex} className="hover:bg-zinc-800/10 transition">
                      <td className="py-3 px-2 font-mono text-[11px] text-zinc-500 font-medium">
                        <div>P{pIndex}</div>
                        <div className="text-[9px] text-zinc-600 font-normal">{info.start}</div>
                      </td>
                      {DAYS_SHORT.map(day => {
                        const coursesAtThisSlot = selectedCourses.filter(c =>
                          c.parsedSchedules.some((s: any) => s.day === day && s.periods.includes(Number(pIndex)))
                        );
                        const hasConflict = coursesAtThisSlot.length > 1;

                        return (
                          <td key={day} className={`p-1.5 border-l border-zinc-800/30 relative min-h-[92px] align-top ${hasConflict ? 'bg-red-950/15' : ''}`}>
                            {coursesAtThisSlot.map((course, cIdx) => (
                              <div
                                key={cIdx}
                                title={`${course.COUR_NM} (${course.COUR_CD})\n${course.college}\n${course.DEPARTMENT}`}
                                className={`rounded-xl p-2 border text-[10px] leading-tight flex flex-col justify-between h-full shadow cursor-pointer transition ${categoryColors[course.category as Category]?.grid || 'bg-zinc-800'} ${hasConflict ? 'ring-2 ring-red-500' : ''} ${!course.openToExchange ? 'ring-1 ring-red-600' : ''}`}
                                onClick={() => setDetailsCourse(course)}
                              >
                                <div>
                                  <div className="font-bold line-clamp-1">{course.COUR_CD}</div>
                                  <div className="text-[9px] font-normal opacity-80 truncate">{course.COUR_NM}</div>
                                </div>

                                <div className="flex items-center gap-1 flex-wrap my-1">
                                  <span className={`text-[8px] px-1 rounded font-bold text-white ${course.openToExchange ? 'bg-emerald-600' : 'bg-red-600'}`}>
                                    {course.openToExchange ? 'OUVERT' : 'FERMÉ'}
                                  </span>
                                  <DifficultyScale level={course.difficultyLevel} compact />
                                  {course.seatsLimited && <span className="text-[8px] px-1 rounded font-bold text-white bg-amber-600">LIMITÉ</span>}
                                </div>

                                <div className="flex items-center justify-between text-[8px] opacity-70">
                                  <span className="truncate">{course.PROF_NM || 'N/A'}</span>
                                  <span className="font-mono bg-black/25 px-1 rounded">
                                    {course.parsedSchedules.find((s: any) => s.day === day)?.room || 'N/A'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col gap-5">

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="text-md font-bold text-white flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-violet-400" />
                  <span>Catalogue des cours ({filteredCoursesList.length})</span>
                </h2>
                <p className="text-xs text-zinc-400 font-normal">Activez les cours souhaités pour composer votre emploi du temps</p>
              </div>

              <div className="flex flex-wrap gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 w-full md:w-auto">
                {['all', 'it', 'business', 'korean', 'others'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`text-[11px] px-3 py-1.5 rounded-lg capitalize font-semibold transition ${activeTab === tab ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    {tab === 'all' ? 'Tous' : CATEGORY_LABELS[tab.toUpperCase() as Category]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div className="relative">
                <Search className="absolute left-4 top-3.5 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Filtrer par code, mot-clé, département ou professeur..."
                  className="w-full bg-zinc-950 text-xs text-zinc-100 pl-11 pr-4 py-3.5 rounded-2xl border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
                />
              </div>

              <div className="flex items-center gap-2 px-1">
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[520px] overflow-y-auto pr-1">
              {filteredCoursesList.length > 0 ? (
                filteredCoursesList.map((course, idx) => {
                  const isSelected = selectedCourses.some(sc => courseKey(sc) === courseKey(course));
                  const cat = categoryColors[course.category as Category] || categoryColors.OTHERS;

                  return (
                    <div
                      key={idx}
                      className={`border rounded-2xl ml-[1px] p-4 flex flex-col justify-between gap-4 transition duration-150 ${isSelected ? 'bg-zinc-800/50 border-violet-500 shadow-md' : 'bg-zinc-950/30 border-zinc-800/80 hover:border-zinc-700'} ${!course.openToExchange ? 'ring-1 ring-red-600/40' : ''}`}
                    >
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono font-bold text-zinc-400">{course.COUR_CD}-{course.COUR_CLS}</span>
                          <button
                            onClick={() => cycleCategory(course)}
                            title="Cliquer pour changer la catégorie"
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 ${cat.bg}`}
                          >
                            <Tag className="h-2.5 w-2.5" />
                            {CATEGORY_LABELS[course.category as Category]}
                          </button>
                        </div>
                        <h3 className="text-xs font-bold text-white line-clamp-2">{course.COUR_NM}</h3>

                        <div className="flex flex-col gap-1 text-[11px] text-zinc-400 mt-2">
                          <div className="flex items-start gap-1.5">
                            <span className="text-zinc-600 font-medium shrink-0">Collège :</span>
                            <span className="text-zinc-300 leading-tight">{course.college}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-zinc-600 font-medium">Dépt :</span>
                            <span className="truncate text-zinc-300">{course.DEPARTMENT || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-zinc-600 font-medium">Prof :</span>
                            <span className="truncate text-zinc-300">{course.PROF_NM || 'Non spécifié'}</span>
                          </div>
                          <div className="flex items-start gap-1.5">
                            <span className="text-zinc-600 font-medium shrink-0">Horaires :</span>
                            {course.parsedSchedules.length > 0 ? (
                              <div className="flex flex-col gap-0.5">
                                {course.parsedSchedules.map((s: any, sIdx: number) => (
                                  <span key={sIdx} className="text-zinc-300 leading-tight">
                                    <span className="text-zinc-100 font-semibold">{DAYS_FR[s.day] || s.day}</span>
                                    {' '}P{s.periods.join('-')} · {s.room || 'N/A'}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-zinc-500 italic">Non planifié (ex: stage)</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-zinc-600 font-medium">Crédits :</span>
                            <span className="text-zinc-300">{course.CREDIT}</span>
                          </div>
                        </div>

                        <div className="border-t border-zinc-800/80 mt-2 pt-2 flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-zinc-600 font-semibold uppercase tracking-wide">Difficulté</span>
                            <DifficultyScale level={course.difficultyLevel} />
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-zinc-600 font-semibold uppercase tracking-wide">Échange (X)</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${course.openToExchange ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/50'}`}>
                              {course.openToExchange ? 'OUVERT' : 'FERMÉ'}
                            </span>
                          </div>

                          {course.seatsLimited && (
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-zinc-600 font-semibold uppercase tracking-wide">Places (L)</span>
                              <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">LIMITÉES</span>
                            </div>
                          )}

                          {course.isOnline && (
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-zinc-600 font-semibold uppercase tracking-wide">Format</span>
                              <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">VISIO (MOOC/NEMO)</span>
                            </div>
                          )}

                          {(course.robotics || course.aiFit || course.softwareEasy || course.cyber || course.electronicsAvoid || course.mathHeavy) && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {course.robotics && <span className="text-[9px] px-1.5 py-0.5 rounded border border-fuchsia-500/30 text-fuchsia-300 bg-fuchsia-500/10 font-semibold">ROBOTIQUE</span>}
                              {course.aiFit && <span className="text-[9px] px-1.5 py-0.5 rounded border border-indigo-500/30 text-indigo-300 bg-indigo-500/10 font-semibold">IA</span>}
                              {course.softwareEasy && <span className="text-[9px] px-1.5 py-0.5 rounded border border-sky-500/30 text-sky-300 bg-sky-500/10 font-semibold">SOFTWARE</span>}
                              {course.cyber && <span className="text-[9px] px-1.5 py-0.5 rounded border border-red-500/30 text-red-300 bg-red-500/10 font-semibold">CYBER</span>}
                              {course.electronicsAvoid && <span className="text-[9px] px-1.5 py-0.5 rounded border border-orange-500/30 text-orange-300 bg-orange-500/10 font-semibold">ÉLECTRONIQUE</span>}
                              {course.mathHeavy && <span className="text-[9px] px-1.5 py-0.5 rounded border border-orange-500/30 text-orange-300 bg-orange-500/10 font-semibold">MATHS</span>}
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => toggleCourse(course)}
                        className={`w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${isSelected ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20' : 'bg-zinc-800 hover:bg-zinc-750 text-white'}`}
                      >
                        {isSelected ? (<><Trash2 className="h-3.5 w-3.5" /><span>Retirer</span></>) : (<><Plus className="h-3.5 w-3.5" /><span>Ajouter</span></>)}
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full py-12 text-center flex flex-col items-center gap-2 text-zinc-500">
                  <Filter className="h-8 w-8 text-zinc-700 animate-pulse" />
                  <p className="text-xs">Aucun cours trouvé dans cette catégorie.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {detailsCourse && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setDetailsCourse(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-zinc-850 pb-3 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-violet-400" />
                <span>Détails du cours</span>
              </h3>
              <button onClick={() => setDetailsCourse(null)} className="text-zinc-400 hover:text-zinc-200 transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-zinc-300 text-sm">{detailsCourse.COUR_CD}-{detailsCourse.COUR_CLS}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${categoryColors[detailsCourse.category as Category]?.bg}`}>
                  {CATEGORY_LABELS[detailsCourse.category as Category]}
                </span>
              </div>

              <h4 className="text-sm font-bold text-white">{detailsCourse.COUR_NM}</h4>

              <div className="flex flex-col gap-1.5 text-zinc-400">
                <div className="flex items-start gap-1.5">
                  <span className="text-zinc-600 font-medium shrink-0">Collège :</span>
                  <span className="text-zinc-300 leading-tight">{detailsCourse.college}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-600 font-medium">Dépt :</span>
                  <span className="text-zinc-300">{detailsCourse.DEPARTMENT || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-600 font-medium">Prof :</span>
                  <span className="text-zinc-300">{detailsCourse.PROF_NM || 'Non spécifié'}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-zinc-600 font-medium shrink-0">Horaires :</span>
                  {detailsCourse.parsedSchedules.length > 0 ? (
                    <div className="flex flex-col gap-0.5">
                      {detailsCourse.parsedSchedules.map((s: any, sIdx: number) => (
                        <span key={sIdx} className="text-zinc-300 leading-tight">
                          <span className="text-zinc-100 font-semibold">{DAYS_FR[s.day] || s.day}</span>
                          {' '}P{s.periods.join('-')} · {s.room || 'N/A'}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-zinc-500 italic">Non planifié</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-600 font-medium">Crédits :</span>
                  <span className="text-zinc-300">{detailsCourse.CREDIT}</span>
                </div>
              </div>

              <div className="border-t border-zinc-800 pt-3 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-600 font-semibold uppercase tracking-wide">Difficulté</span>
                  <DifficultyScale level={detailsCourse.difficultyLevel} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-600 font-semibold uppercase tracking-wide">Échange (X)</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${detailsCourse.openToExchange ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/50'}`}>
                    {detailsCourse.openToExchange ? 'OUVERT' : 'FERMÉ'}
                  </span>
                </div>
                {detailsCourse.seatsLimited && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-600 font-semibold uppercase tracking-wide">Places (L)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">LIMITÉES</span>
                  </div>
                )}
                {(detailsCourse.robotics || detailsCourse.aiFit || detailsCourse.softwareEasy || detailsCourse.cyber || detailsCourse.electronicsAvoid || detailsCourse.mathHeavy) && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {detailsCourse.robotics && <span className="text-[9px] px-1.5 py-0.5 rounded border border-fuchsia-500/30 text-fuchsia-300 bg-fuchsia-500/10 font-semibold">ROBOTIQUE</span>}
                    {detailsCourse.aiFit && <span className="text-[9px] px-1.5 py-0.5 rounded border border-indigo-500/30 text-indigo-300 bg-indigo-500/10 font-semibold">IA</span>}
                    {detailsCourse.softwareEasy && <span className="text-[9px] px-1.5 py-0.5 rounded border border-sky-500/30 text-sky-300 bg-sky-500/10 font-semibold">SOFTWARE</span>}
                    {detailsCourse.cyber && <span className="text-[9px] px-1.5 py-0.5 rounded border border-red-500/30 text-red-300 bg-red-500/10 font-semibold">CYBER</span>}
                    {detailsCourse.electronicsAvoid && <span className="text-[9px] px-1.5 py-0.5 rounded border border-orange-500/30 text-orange-300 bg-orange-500/10 font-semibold">ÉLECTRONIQUE</span>}
                    {detailsCourse.mathHeavy && <span className="text-[9px] px-1.5 py-0.5 rounded border border-orange-500/30 text-orange-300 bg-orange-500/10 font-semibold">MATHS</span>}
                  </div>
                )}
              </div>

              <button
                onClick={() => { toggleCourse(detailsCourse); setDetailsCourse(null); }}
                className="w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 mt-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Supprimer de l'emploi du temps</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showCustomModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-3 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PlusCircle className="h-4 w-4 text-violet-400" />
                <span>Ajouter un cours personnalisé</span>
              </h3>
              <button onClick={() => setShowCustomModal(false)} className="text-zinc-400 hover:text-zinc-200 transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomCourseSubmit} className="flex flex-col gap-4 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1 font-semibold">Code du cours (ex: BDSC152, GLOB161)</label>
                <input type="text" required value={customCourse.COUR_CD}
                  onChange={e => setCustomCourse({ ...customCourse, COUR_CD: e.target.value })}
                  className="w-full bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 text-zinc-100 uppercase focus:outline-none focus:border-violet-500" />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-semibold">Nom complet du cours</label>
                <input type="text" required value={customCourse.COUR_NM}
                  onChange={e => setCustomCourse({ ...customCourse, COUR_NM: e.target.value })}
                  className="w-full bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 text-zinc-100 uppercase focus:outline-none focus:border-violet-500" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Crédits</label>
                  <select value={customCourse.CREDIT} onChange={e => setCustomCourse({ ...customCourse, CREDIT: e.target.value })}
                    className="w-full bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 text-zinc-100 focus:outline-none focus:border-violet-500">
                    <option value="3">3 Crédits (Standard)</option>
                    <option value="1">1 Crédit (Sport/Lab)</option>
                    <option value="2">2 Crédits</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Section (00, 01...)</label>
                  <input type="text" required value={customCourse.COUR_CLS}
                    onChange={e => setCustomCourse({ ...customCourse, COUR_CLS: e.target.value })}
                    className="w-full bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 text-zinc-100 focus:outline-none focus:border-violet-500" />
                </div>
              </div>

              <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-850 flex flex-col gap-3">
                <p className="font-semibold text-zinc-400 text-[11px]">Créneau horaire</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-zinc-500 mb-1">Jour</label>
                    <select value={customCourse.DAY} onChange={e => setCustomCourse({ ...customCourse, DAY: e.target.value })}
                      className="w-full bg-zinc-900 p-2 rounded-lg text-zinc-200">
                      <option value="Mon">Lundi</option>
                      <option value="Tue">Mardi</option>
                      <option value="Wed">Mercredi</option>
                      <option value="Thu">Jeudi</option>
                      <option value="Fri">Vendredi</option>
                      <option value="Sat">Samedi</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-500 mb-1">Période Début</label>
                    <select value={customCourse.START_PERIOD} onChange={e => setCustomCourse({ ...customCourse, START_PERIOD: e.target.value })}
                      className="w-full bg-zinc-900 p-2 rounded-lg text-zinc-200">
                      {Object.keys(PERIODS_MAP).map(p => (<option key={p} value={p}>P{p}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-500 mb-1">Période Fin</label>
                    <select value={customCourse.END_PERIOD} onChange={e => setCustomCourse({ ...customCourse, END_PERIOD: e.target.value })}
                      className="w-full bg-zinc-900 p-2 rounded-lg text-zinc-200">
                      {Object.keys(PERIODS_MAP).map(p => (
                        <option key={p} value={p} disabled={Number(p) < Number(customCourse.START_PERIOD)}>P{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 mb-1">Bâtiment - Salle (ex: 35-322)</label>
                  <input type="text" required value={customCourse.ROOM}
                    onChange={e => setCustomCourse({ ...customCourse, ROOM: e.target.value })}
                    className="w-full bg-zinc-900 p-2 rounded-lg text-zinc-200 focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="block text-zinc-400 mb-1">Enseignant</label>
                  <input type="text" value={customCourse.PROF_NM}
                    onChange={e => setCustomCourse({ ...customCourse, PROF_NM: e.target.value })}
                    className="w-full bg-zinc-950 p-2 rounded-xl border border-zinc-800 text-zinc-100 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Département (sert à la catégorie auto)</label>
                  <input type="text" value={customCourse.DEPARTMENT}
                    onChange={e => setCustomCourse({ ...customCourse, DEPARTMENT: e.target.value })}
                    className="w-full bg-zinc-950 p-2 rounded-xl border border-zinc-800 text-zinc-100 focus:outline-none" />
                </div>
              </div>

              <button type="submit" className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold p-3 rounded-xl transition mt-2">
                Valider et insérer au catalogue
              </button>
            </form>
          </div>
        </div>
      )}

      <footer className="border-t border-zinc-800 py-6 text-center text-xs text-zinc-500 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>KU Sejong · Fall 2026 · Planificateur personnel (non-officiel)</p>
        </div>
      </footer>
    </div>
  );
}
