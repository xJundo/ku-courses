import { Category, Course, PreferenceTags, RawCourse } from '../types/course';
import {
  COLLEGE_RULES,
  IT_DEPT_REGEX,
  BUSINESS_DEPT_REGEX,
  KOREAN_DEPT_REGEX,
  CYBER_REGEX,
  ROBOTICS_REGEX,
  ELECTRONICS_DEPT_AVOID_REGEX,
  MATH_HEAVY_REGEX,
  AI_FIT_REGEX,
  SOFTWARE_EASY_REGEX
} from '../constants/rules';

export function courseKey(c: { COUR_CD: string; COUR_CLS: string }): string {
  return `${c.COUR_CD}-${c.COUR_CLS}`;
}

export function getCollege(department: string): string {
  const dept = department.toLowerCase();
  const match = COLLEGE_RULES.find(r => r.regex.test(dept));
  return match ? match.college : 'Collège non identifié (vérifier sur sugang.korea.ac.kr)';
}

export function getDifficultyLevel(courCd: string): number | null {
  const m = courCd.match(/(\d)\d*/);
  if (!m) return null;
  const level = parseInt(m[1], 10);
  if (!level || level < 1) return null;
  return level;
}

export function getDifficultyLabel(level: number | null): string {
  if (level === null) return 'Niveau indéterminé';
  if (level === 1) return `Niveau 1 — Introductif`;
  if (level === 2) return `Niveau 2 — Charge modérée`;
  if (level === 3) return `Niveau 3 — Charge équivalente à une année Epitech`;
  if (level === 4) return `Niveau 4 — Charge élevée`;
  return `Niveau ${level} — Charge très élevée`;
}

export function getDifficultyColor(level: number | null): string {
  if (level === null) return 'bg-zinc-700';
  if (level <= 2) return 'bg-emerald-500';
  if (level === 3) return 'bg-amber-500';
  if (level === 4) return 'bg-orange-500';
  return 'bg-red-500';
}

export function computePreferenceTags(course: {
  COUR_NM: string;
  DEPARTMENT: string;
  MOOC_YN?: string;
  NEMO_YN?: string;
  EXCH_COR_YN?: string;
  LMT_YN?: string;
}): PreferenceTags {
  const name = course.COUR_NM.toLowerCase();
  const dept = course.DEPARTMENT.toLowerCase();

  const cyber = CYBER_REGEX.test(name);
  const robotics = ROBOTICS_REGEX.test(name) || ROBOTICS_REGEX.test(dept);
  const electronicsAvoid = ELECTRONICS_DEPT_AVOID_REGEX.test(dept);
  const mathHeavy = MATH_HEAVY_REGEX.test(name);
  const aiFit = AI_FIT_REGEX.test(name);
  const softwareEasy = /department of computer software/.test(dept) || SOFTWARE_EASY_REGEX.test(name);
  const isOnline = course.MOOC_YN === '1' || course.NEMO_YN === '1';

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

export function autoClassify(course: { COUR_CD: string; COUR_NM: string; DEPARTMENT: string }): Category {
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

export function getInsensitiveKey(obj: any, keyName: string): any {
  if (!obj) return null;
  const target = keyName.toLowerCase();
  const foundKey = Object.keys(obj).find(k => k.toLowerCase() === target);
  return foundKey ? obj[foundKey] : null;
}

export function normalizeRow(row: RawCourse): Course {
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

export function processJsonPayload(rawText: string): Course[] {
  let cleanText = rawText.trim();
  if (cleanText.charCodeAt(0) === 0xfeff) cleanText = cleanText.slice(1);

  if (cleanText.startsWith('{') && !cleanText.startsWith('[{') && cleanText.includes('\n')) {
    try {
      cleanText = '[' + cleanText.replace(/}\s*\n*\s*{/g, '},{') + ']';
    } catch {
      // ignore
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
