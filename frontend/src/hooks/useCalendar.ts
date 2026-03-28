import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { CalendarEntry } from "../types/task";
import { apiGet, apiPatch, debounce } from "./useApi";
import { addDays, getTodayKey, getWeekDays } from "../utils/dateUtils";

const STORAGE_KEY = "notion_calendar";
const MAX_AGE_DAYS = 365;

interface CalendarPayload {
  entries: CalendarEntry[];
}

/** Мигрировать старые записи с полем hour → startMinute */
function migrateEntries(entries: CalendarEntry[]): CalendarEntry[] {
  return entries.map((e) => {
    const legacy = e as CalendarEntry & { hour?: number };
    if (legacy.hour !== undefined && e.startMinute === undefined) {
      const startMinute = legacy.hour * 60;
      // duration в старом формате — часы, в новом — минуты
      const durationMinutes = (e.duration && e.duration <= 24) ? e.duration * 60 : (e.duration ?? 60);
      const result: CalendarEntry = { ...e, startMinute, duration: durationMinutes };
      delete (result as CalendarEntry & { hour?: number }).hour;
      return result;
    }
    // Нормализация: если duration не задан — 60 минут
    return { ...e, duration: e.duration ?? 60 };
  });
}

function coversMinute(entry: CalendarEntry, minute: number): boolean {
  return minute >= entry.startMinute && minute < entry.startMinute + (entry.duration ?? 60);
}

function loadEntries(): CalendarEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown[] = JSON.parse(raw);
    const entries = migrateEntries(parsed as CalendarEntry[]);
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
        const mapped = data.entries.map((e) => {
          const raw = e as CalendarEntry & { tag_color?: string };
          const tagColor = raw.tagColor ?? raw.tag_color;
          const result: CalendarEntry = { ...e };
          if (tagColor !== undefined) result.tagColor = tagColor;
          delete (result as CalendarEntry & { tag_color?: string }).tag_color;
          return result;
        });
        const migrated = migrateEntries(mapped);
        setEntries(migrated);
        saveToLocalStorage(migrated);
      } else {
        const local = loadEntries();
        if (local.length > 0) {
          debouncedSync(local);
        }
      }
    });
  }, []);

  function saveEntries(updated: CalendarEntry[]): void {
    saveToLocalStorage(updated);
    debouncedSync(updated);
  }

  const addEntry = useCallback(
    (
      taskId: string,
      taskText: string,
      startMinute: number,
      duration = 60,
      tag?: string,
      tagColor?: string
    ) => {
      setEntries((prev) => {
        // Проверяем, не занят ли диапазон другой записью
        const occupied = prev.some(
          (e) =>
            e.date === selectedDate &&
            e.startMinute < startMinute + duration &&
            e.startMinute + e.duration > startMinute
        );
        if (occupied) return prev;
        const entry: CalendarEntry = {
          taskId,
          taskText,
          startMinute,
          duration,
          date: selectedDate,
          done: false,
        };
        if (tag !== undefined) entry.tag = tag;
        if (tagColor !== undefined) entry.tagColor = tagColor;
        const next = [...prev, entry];
        saveEntries(next);
        return next;
      });
    },
    [selectedDate]
  );

  const removeEntry = useCallback((taskId: string, date: string, startMinute: number) => {
    setEntries((prev) => {
      const next = prev.filter(
        (e) => !(e.taskId === taskId && e.date === date && e.startMinute === startMinute)
      );
      saveEntries(next);
      return next;
    });
  }, []);

  const moveEntry = useCallback(
    (taskId: string, fromDate: string, fromStartMinute: number, toStartMinute: number) => {
      setEntries((prev) => {
        const entry = prev.find(
          (e) =>
            e.taskId === taskId &&
            e.date === fromDate &&
            e.startMinute === fromStartMinute
        );
        if (!entry) return prev;
        const dur = entry.duration ?? 60;
        if (toStartMinute < 0 || toStartMinute + dur > 24 * 60) return prev;
        const others = prev.filter(
          (e) =>
            !(e.taskId === taskId && e.date === fromDate && e.startMinute === fromStartMinute)
        );
        const overlaps = others.some(
          (e) =>
            e.date === selectedDate &&
            e.startMinute < toStartMinute + dur &&
            e.startMinute + e.duration > toStartMinute
        );
        if (overlaps) return prev;
        const next = prev.map((e) =>
          e.taskId === taskId &&
          e.date === fromDate &&
          e.startMinute === fromStartMinute
            ? { ...e, startMinute: toStartMinute }
            : e
        );
        saveEntries(next);
        return next;
      });
    },
    [selectedDate]
  );

  const resizeEntry = useCallback(
    (taskId: string, date: string, startMinute: number, newDuration: number) => {
      setEntries((prev) => {
        if (newDuration < 10 || startMinute + newDuration > 24 * 60) return prev;
        const entry = prev.find(
          (e) => e.taskId === taskId && e.date === date && e.startMinute === startMinute
        );
        if (!entry) return prev;
        const oldDur = entry.duration ?? 60;
        if (newDuration > oldDur) {
          const others = prev.filter(
            (e) =>
              !(e.taskId === taskId && e.date === date && e.startMinute === startMinute)
          );
          const overlaps = others.some(
            (o) =>
              o.date === date &&
              o.startMinute < startMinute + newDuration &&
              o.startMinute + o.duration > startMinute + oldDur
          );
          if (overlaps) return prev;
        }
        const next = prev.map((e) =>
          e.taskId === taskId && e.date === date && e.startMinute === startMinute
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
    (taskId: string, date: string, startMinute: number) => {
      setEntries((prev) => {
        const next = prev.map((e) =>
          e.taskId === taskId && e.date === date && e.startMinute === startMinute
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
    (startMinute: number) =>
      dateEntries.some((e) => coversMinute(e, startMinute)),
    [dateEntries]
  );

  const getEntryAt = useCallback(
    (startMinute: number) =>
      dateEntries.find((e) => coversMinute(e, startMinute)) ?? null,
    [dateEntries]
  );

  const dateTotal = dateEntries.length;
  const dateDoneCount = useMemo(
    () => dateEntries.filter((e) => e.done).length,
    [dateEntries]
  );

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
