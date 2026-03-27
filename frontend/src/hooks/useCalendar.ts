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

  const addEntry = useCallback((taskId: string, taskText: string, hour: number) => {
    setEntries((prev) => {
      const date = getTodayKey();
      const occupied = prev.some((e) => e.date === date && coversHour(e, hour));
      if (occupied) return prev;
      const next = [...prev, { taskId, taskText, hour, duration: 1, date, done: false }];
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
      const entry = prev.find((e) => e.taskId === taskId && e.date === fromDate && e.hour === fromHour);
      if (!entry) return prev;
      const dur = entry.duration ?? 1;
      if (toHour < 0 || toHour + dur > 24) return prev;
      const others = prev.filter((e) => !(e.taskId === taskId && e.date === fromDate && e.hour === fromHour));
      const todayKey = getTodayKey();
      for (let h = toHour; h < toHour + dur; h++) {
        if (others.some((e) => e.date === todayKey && coversHour(e, h))) return prev;
      }
      const next = prev.map((e) =>
        e.taskId === taskId && e.date === fromDate && e.hour === fromHour
          ? { ...e, hour: toHour }
          : e
      );
      saveEntries(next);
      return next;
    });
  }, []);

  const resizeEntry = useCallback((taskId: string, date: string, hour: number, newDuration: number) => {
    setEntries((prev) => {
      if (newDuration < 1 || hour + newDuration > 24) return prev;
      const entry = prev.find((e) => e.taskId === taskId && e.date === date && e.hour === hour);
      if (!entry) return prev;
      const oldDur = entry.duration ?? 1;
      if (newDuration > oldDur) {
        const others = prev.filter((e) => !(e.taskId === taskId && e.date === date && e.hour === hour));
        for (let h = hour + oldDur; h < hour + newDuration; h++) {
          if (others.some((o) => o.date === date && coversHour(o, h))) return prev;
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
    (hour: number) => todayEntries.some((e) => coversHour(e, hour)),
    [todayEntries]
  );

  const getEntryAt = useCallback(
    (hour: number) => todayEntries.find((e) => coversHour(e, hour)) ?? null,
    [todayEntries]
  );

  const todayTotal = todayEntries.length;
  const todayDoneCount = useMemo(() => todayEntries.filter((e) => e.done).length, [todayEntries]);

  return { entries, todayEntries, addEntry, removeEntry, moveEntry, resizeEntry, toggleEntry, isSlotOccupied, getEntryAt, todayTotal, todayDoneCount };
}
