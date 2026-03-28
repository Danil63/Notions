import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { CalendarEntry } from "../types/task";
import { apiGet, apiPatch, debounce } from "./useApi";
import { addDays, getTodayKey, getWeekDays } from "../utils/dateUtils";

const STORAGE_KEY = "notion_calendar";
const MAX_AGE_DAYS = 365;

interface CalendarPayload {
  entries: CalendarEntry[];
}

function normalizeDuration(entries: CalendarEntry[]): CalendarEntry[] {
  return entries.map((e) => ({ ...e, duration: e.duration ?? 1 }));
}

function coversHour(entry: CalendarEntry, hour: number): boolean {
  return hour >= entry.hour && hour < entry.hour + (entry.duration ?? 1);
}

function loadEntries(): CalendarEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const entries: CalendarEntry[] = normalizeDuration(JSON.parse(raw));
    const cutoffKey = addDays(getTodayKey(), -MAX_AGE_DAYS);
    const fresh = entries.filter((e) => e.date >= cutoffKey);
    if (fresh.length !== entries.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    }
    return fresh;
  } catch {
    return [];
  }
}

function saveToLocalStorage(entries: CalendarEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

const debouncedSync = debounce((entries: CalendarEntry[]) => {
  apiPatch<CalendarPayload>("/calendar", { entries });
});

export function useCalendar(selectedDate: string) {
  const [entries, setEntries] = useState<CalendarEntry[]>(loadEntries);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    apiGet<CalendarPayload>("/calendar").then((data) => {
      if (data && data.entries) {
        const normalized = normalizeDuration(data.entries);
        setEntries(normalized);
        saveToLocalStorage(normalized);
      } else {
        const local = loadEntries();
        if (local.length > 0) {
          debouncedSync(local);
        }
      }
    });
  }, []);

  function saveEntries(entries: CalendarEntry[]): void {
    saveToLocalStorage(entries);
    debouncedSync(entries);
  }

  const addEntry = useCallback(
    (taskId: string, taskText: string, hour: number) => {
      setEntries((prev) => {
        const occupied = prev.some(
          (e) => e.date === selectedDate && coversHour(e, hour)
        );
        if (occupied) return prev;
        const next = [
          ...prev,
          { taskId, taskText, hour, duration: 1, date: selectedDate, done: false },
        ];
        saveEntries(next);
        return next;
      });
    },
    [selectedDate]
  );

  const removeEntry = useCallback((taskId: string, date: string, hour: number) => {
    setEntries((prev) => {
      const next = prev.filter(
        (e) => !(e.taskId === taskId && e.date === date && e.hour === hour)
      );
      saveEntries(next);
      return next;
    });
  }, []);

  const moveEntry = useCallback(
    (taskId: string, fromDate: string, fromHour: number, toHour: number) => {
      setEntries((prev) => {
        const entry = prev.find(
          (e) => e.taskId === taskId && e.date === fromDate && e.hour === fromHour
        );
        if (!entry) return prev;
        const dur = entry.duration ?? 1;
        if (toHour < 0 || toHour + dur > 24) return prev;
        const others = prev.filter(
          (e) => !(e.taskId === taskId && e.date === fromDate && e.hour === fromHour)
        );
        for (let h = toHour; h < toHour + dur; h++) {
          if (others.some((e) => e.date === selectedDate && coversHour(e, h)))
            return prev;
        }
        const next = prev.map((e) =>
          e.taskId === taskId && e.date === fromDate && e.hour === fromHour
            ? { ...e, hour: toHour }
            : e
        );
        saveEntries(next);
        return next;
      });
    },
    [selectedDate]
  );

  const resizeEntry = useCallback(
    (taskId: string, date: string, hour: number, newDuration: number) => {
      setEntries((prev) => {
        if (newDuration < 1 || hour + newDuration > 24) return prev;
        const entry = prev.find(
          (e) => e.taskId === taskId && e.date === date && e.hour === hour
        );
        if (!entry) return prev;
        const oldDur = entry.duration ?? 1;
        if (newDuration > oldDur) {
          const others = prev.filter(
            (e) => !(e.taskId === taskId && e.date === date && e.hour === hour)
          );
          for (let h = hour + oldDur; h < hour + newDuration; h++) {
            if (others.some((o) => o.date === date && coversHour(o, h)))
              return prev;
          }
        }
        const next = prev.map((e) =>
          e.taskId === taskId && e.date === date && e.hour === hour
            ? { ...e, duration: newDuration }
            : e
        );
        saveEntries(next);
        return next;
      });
    },
    []
  );

  const toggleEntry = useCallback(
    (taskId: string, date: string, hour: number) => {
      setEntries((prev) => {
        const next = prev.map((e) =>
          e.taskId === taskId && e.date === date && e.hour === hour
            ? { ...e, done: !e.done }
            : e
        );
        saveEntries(next);
        return next;
      });
    },
    []
  );

  const dateEntries = useMemo(
    () => entries.filter((e) => e.date === selectedDate),
    [entries, selectedDate]
  );

  const isSlotOccupied = useCallback(
    (hour: number) => dateEntries.some((e) => coversHour(e, hour)),
    [dateEntries]
  );

  const getEntryAt = useCallback(
    (hour: number) => dateEntries.find((e) => coversHour(e, hour)) ?? null,
    [dateEntries]
  );

  const dateTotal = dateEntries.length;
  const dateDoneCount = useMemo(
    () => dateEntries.filter((e) => e.done).length,
    [dateEntries]
  );

  /** Query: возвращает записи для заданной даты (не мутирует состояние) */
  const getEntriesForDate = useCallback(
    (date: string): CalendarEntry[] => entries.filter((e) => e.date === date),
    [entries]
  );

  const weekEntries = useMemo(() => {
    const weekSet = new Set(getWeekDays(selectedDate));
    return entries.filter((e) => weekSet.has(e.date));
  }, [entries, selectedDate]);

  return {
    entries,
    dateEntries,
    addEntry,
    removeEntry,
    moveEntry,
    resizeEntry,
    toggleEntry,
    isSlotOccupied,
    getEntryAt,
    getEntriesForDate,
    weekEntries,
    dateTotal,
    dateDoneCount,
  };
}
