import { ParsedSchedule } from '../types/course';
import { DAY_NORMALIZER } from '../constants/schedule';

export function parseSchedule(timeRoomStr: string): ParsedSchedule[] {
  if (!timeRoomStr) return [];

  const formatted = timeRoomStr.replace(/<br>/gi, '\n').replace(/\\r/gi, '').replace(/\r/g, '').replace(/\\n/gi, '\n');
  const parts = formatted.split('\n');
  const schedules: ParsedSchedule[] = [];

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

export function slotsConflict(a: { parsedSchedules: { day: string; periods: number[] }[] }[]): boolean {
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

export function inPersonDays(course: { parsedSchedules: { day: string }[]; isOnline?: boolean }): Set<string> {
  if (course.isOnline) return new Set<string>();
  return new Set(course.parsedSchedules.map(sc => sc.day));
}

export function unionInPersonDays(courses: { parsedSchedules: { day: string }[]; isOnline?: boolean }[]): Set<string> {
  const s = new Set<string>();
  courses.forEach(c => inPersonDays(c).forEach(d => s.add(d)));
  return s;
}

export function withinAllowedDays(
  course: { parsedSchedules: { day: string }[]; isOnline?: boolean },
  allowedDays: Set<string> | null
): boolean {
  if (!allowedDays) return true;
  if (course.isOnline) return true;
  return course.parsedSchedules.every(sc => allowedDays.has(sc.day));
}
