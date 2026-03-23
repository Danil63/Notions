import { useState, useCallback } from "react";
import type { CalendarEntry } from "../types/task";

const STORAGE_KEY = "notion_calendar";
const MAX_AGE_DAYS = 7;

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function loadEntries(): CalendarEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const entries: CalendarEntry[] = JSON.parse(raw);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - MAX_AGE_DAYS);
    const cutoffKey = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;
    const fresh = entries.filter((e) => e.date >= cutoffKey);
    if (fresh.length !== entries.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    }
    return fresh;
  } catch {
    return [];
  }
}

function saveEntries(entries: CalendarEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function useCalendar() {
  const [entries, setEntries] = useState<CalendarEntry[]>(loadEntries);

  const addEntry = useCallback((taskId: string, taskText: string, hour: number) => {
    setEntries((prev) => {
      const date = getTodayKey();
      const occupied = prev.some((e) => e.date === date && e.hour === hour);
      if (occupied) return prev;
      const next = [...prev, { taskId, taskText, hour, date }];
      saveEntries(next);
      return next;
    });
  }, []);

  const removeEntry = useCallback((taskId: string, date: string, hour: number) => {
    setEntries((prev) => {
      const next = prev.filter(
        (e) => !(e.taskId === taskId && e.date === date && e.hour === hour)
      );
      saveEntries(next);
      return next;
    });
  }, []);

  const todayEntries = entries.filter((e) => e.date === getTodayKey());

  const isSlotOccupied = useCallback(
    (hour: number) => todayEntries.some((e) => e.hour === hour),
    [todayEntries]
  );

  const getEntryAt = useCallback(
    (hour: number) => todayEntries.find((e) => e.hour === hour) ?? null,
    [todayEntries]
  );

  return { entries, todayEntries, addEntry, removeEntry, isSlotOccupied, getEntryAt };
}
