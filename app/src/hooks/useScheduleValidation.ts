import { useMemo } from 'react';
import { ProcessedCourse, SelectedStats, ValidationDetails } from '../types/course';

export function useScheduleValidation(selectedCourses: ProcessedCourse[]) {
  const selectedStats = useMemo<SelectedStats>(() => {
    const stats: SelectedStats = {
      totalCredits: 0,
      koreanCount: 0,
      itCount: 0,
      businessCount: 0,
      othersCount: 0,
      activeDays: new Set<string>(),
      hasConflict: false,
      nonExchangeCourses: [],
      limitedSeatsCourses: []
    };

    const occupiedSlots: Record<string, ProcessedCourse> = {};

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

  const validationDetails = useMemo<ValidationDetails>(() => {
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

  return { selectedStats, validationDetails };
}
