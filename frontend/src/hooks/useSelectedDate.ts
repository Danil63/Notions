import { useState, useCallback, useMemo } from "react";
import { getTodayKey, addDays } from "../utils/dateUtils";

const MAX_FUTURE_DAYS = 365;

export function useSelectedDate() {
  const today = useMemo(() => getTodayKey(), []);
  const maxDate = useMemo(() => addDays(today, MAX_FUTURE_DAYS), [today]);

  const [selectedDate, setSelectedDate] = useState<string>(today);

  const goToNextDay = useCallback(() => {
    setSelectedDate((prev) => {
      const next = addDays(prev, 1);
      return next <= maxDate ? next : prev;
    });
  }, [maxDate]);

  const goToPrevDay = useCallback(() => {
    setSelectedDate((prev) => {
      const next = addDays(prev, -1);
      return next >= today ? next : prev;
    });
  }, [today]);

  const goToDate = useCallback(
    (date: string) => {
      if (date >= today && date <= maxDate) {
        setSelectedDate(date);
      }
    },
    [today, maxDate]
  );

  const goToNextWeek = useCallback(() => {
    setSelectedDate((prev) => {
      const next = addDays(prev, 7);
      return next <= maxDate ? next : prev;
    });
  }, [maxDate]);

  const goToPrevWeek = useCallback(() => {
    setSelectedDate((prev) => {
      const next = addDays(prev, -7);
      return next >= today ? next : today;
    });
  }, [today]);

  const goToToday = useCallback(() => {
    setSelectedDate(today);
  }, [today]);

  const isToday = selectedDate === today;

  return {
    selectedDate,
    today,
    maxDate,
    isToday,
    goToNextDay,
    goToPrevDay,
    goToDate,
    goToNextWeek,
    goToPrevWeek,
    goToToday,
  };
}
