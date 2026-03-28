import { useMemo } from "react";
import type { Task, CalendarEntry } from "../types/task";
import { getWeekDays } from "../utils/dateUtils";

export interface DayStatus {
  date: string;
  total: number;
  done: number;
  isComplete: boolean;
}

export interface WeekDayProgressResult {
  completedDays: number;
  totalDays: 7;
  percent: number;
  weekDays: DayStatus[];
}

export function useWeekDayProgress(
  selectedDate: string,
  entries: CalendarEntry[],
  allTasks: Task[]
): WeekDayProgressResult {
  return useMemo(() => {
    const weekDayKeys = getWeekDays(selectedDate);

    const weekDays: DayStatus[] = weekDayKeys.map((date) => {
      const dayTasks = allTasks.filter((t) => t.date === date);
      const dayEntries = entries.filter((e) => e.date === date);

      const total = dayTasks.length + dayEntries.length;
      const done =
        dayTasks.filter((t) => t.done).length +
        dayEntries.filter((e) => e.done).length;

      const isComplete = total > 0 && done === total;

      return { date, total, done, isComplete };
    });

    const completedDays = weekDays.filter((d) => d.isComplete).length;
    const percent = Math.round((completedDays / 7) * 100);

    return { completedDays, totalDays: 7, percent, weekDays };
  }, [selectedDate, entries, allTasks]);
}
