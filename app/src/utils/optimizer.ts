import { ProcessedCourse } from '../types/course';
import { inPersonDays, slotsConflict, unionInPersonDays, withinAllowedDays } from './scheduleUtils';

export function findValidCombo(
  itList: ProcessedCourse[],
  businessList: ProcessedCourse[],
  koreanList: ProcessedCourse[],
  allowedDays: Set<string> | null,
  maxDays: number
): ProcessedCourse[] | null {
  const BUDGET = 500000;
  const POOL_CAP = 50;
  let counter = 0;

  const itFiltered = itList.filter(c => withinAllowedDays(c, allowedDays));
  const businessFiltered = businessList.filter(c => withinAllowedDays(c, allowedDays));
  const koreanFiltered = koreanList.filter(c => withinAllowedDays(c, allowedDays));

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
