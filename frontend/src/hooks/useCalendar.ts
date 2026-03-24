import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { CalendarEntry } from "../types/task";
import { apiGet, apiPatch, debounce } from "./useApi";

const STORAGE_KEY = "notion_calendar";
const MAX_AGE_DAYS = 7;

interface CalendarPayload {
  entries: CalendarEntry[];
}

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

function saveToLocalStorage(entries: CalendarEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

const debouncedSync = debounce((entries: CalendarEntry[]) => {
  apiPatch<CalendarPayload>("/calendar", { entries });
});

export function useCalendar() {
  const [entries, setEntries] = useState<CalendarEntry[]>(loadEntries);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    apiGet<CalendarPayload>("/calendar").then((data) => {
      if (data && data.entries) {
        setEntries(data.entries);
        saveToLocalStorage(data.entries);
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

  const addEntry = useCallback((taskId: string, taskText: string, hour: number) => {
    setEntries((prev) => {
      const date = getTodayKey();
      const occupied = prev.some((e) => e.date === date && e.hour === hour);
      if (occupied) return prev;
      const next = [...prev, { taskId, taskText, hour, date, done: false }];
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

  const moveEntry = useCallback((taskId: string, fromDate: string, fromHour: number, toHour: number) => {
    setEntries((prev) => {
      const date = getTodayKey();
      if (prev.some((e) => e.date === date && e.hour === toHour)) return prev;
      const next = prev.map((e) =>
        e.taskId === taskId && e.date === fromDate && e.hour === fromHour
          ? { ...e, hour: toHour }
          : e
      );
      saveEntries(next);
      return next;
    });
  }, []);

  const toggleEntry = useCallback((taskId: string, date: string, hour: number) => {
    setEntries((prev) => {
      const next = prev.map((e) =>
        e.taskId === taskId && e.date === date && e.hour === hour
          ? { ...e, done: !e.done }
          : e
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

  const todayTotal = todayEntries.length;
  const todayDoneCount = useMemo(() => todayEntries.filter((e) => e.done).length, [todayEntries]);

  return { entries, todayEntries, addEntry, removeEntry, moveEntry, toggleEntry, isSlotOccupied, getEntryAt, todayTotal, todayDoneCount };
}
