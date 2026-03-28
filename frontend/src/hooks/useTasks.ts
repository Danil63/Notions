import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { Task } from "../types/task";
import { apiGet, apiPatch, debounce } from "./useApi";
import { getTodayKey, addDays } from "../utils/dateUtils";

const MAX_TASKS = 5;
const STORAGE_KEY = "notion_day_tasks_v2";
const MAX_AGE_DAYS = 365;

interface TasksPayload {
  tasks: Task[];
}

function loadAllTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Task[];
  } catch {
    return [];
  }
}

function pruneOldTasks(tasks: Task[]): Task[] {
  const minDate = addDays(getTodayKey(), -MAX_AGE_DAYS);
  return tasks.filter((t) => t.date >= minDate);
}

function saveToLocalStorage(tasks: Task[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

const debouncedSync = debounce((tasks: Task[]) => {
  apiPatch<TasksPayload>("/tasks", { tasks });
});

export function useTasks(selectedDate: string) {
  const [allTasks, setAllTasks] = useState<Task[]>(() => {
    const loaded = loadAllTasks();
    return pruneOldTasks(loaded);
  });
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    apiGet<TasksPayload>("/tasks").then((data) => {
      if (data && data.tasks) {
        const pruned = pruneOldTasks(data.tasks);
        setAllTasks(pruned);
        saveToLocalStorage(pruned);
      } else {
        const local = loadAllTasks();
        const pruned = pruneOldTasks(local);
        if (pruned.length > 0) {
          debouncedSync(pruned);
        }
      }
    });
  }, []);

  function saveAll(tasks: Task[]): void {
    saveToLocalStorage(tasks);
    debouncedSync(tasks);
  }

  const addTask = useCallback(
    (text: string) => {
      setAllTasks((prev) => {
        const forDate = prev.filter((t) => t.date === selectedDate);
        if (forDate.length >= MAX_TASKS) return prev;
        const next = [
          ...prev,
          { id: crypto.randomUUID(), text, done: false, date: selectedDate },
        ];
        saveAll(next);
        return next;
      });
    },
    [selectedDate]
  );

  const toggleTask = useCallback((id: string) => {
    setAllTasks((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
      saveAll(next);
      return next;
    });
  }, []);

  const deleteTask = useCallback((id: string) => {
    setAllTasks((prev) => {
      const next = prev.filter((t) => t.id !== id);
      saveAll(next);
      return next;
    });
  }, []);

  const tasks = useMemo(
    () => allTasks.filter((t) => t.date === selectedDate),
    [allTasks, selectedDate]
  );

  const canAdd = tasks.length < MAX_TASKS;
  const doneCount = useMemo(() => tasks.filter((t) => t.done).length, [tasks]);

  return { tasks, allTasks, addTask, toggleTask, deleteTask, canAdd, doneCount };
}
