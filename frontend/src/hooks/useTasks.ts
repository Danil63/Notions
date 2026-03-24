import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { Task } from "../types/task";
import { apiGet, apiPatch, debounce } from "./useApi";

const MAX_TASKS = 5;
const STORAGE_KEY = "notion_day_tasks";

interface TasksPayload {
  date: string;
  tasks: Task[];
}

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (data.date !== getTodayKey()) {
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
    return data.tasks ?? [];
  } catch {
    return [];
  }
}

function saveToLocalStorage(tasks: Task[]): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ date: getTodayKey(), tasks })
  );
}

const debouncedSync = debounce((tasks: Task[]) => {
  apiPatch<TasksPayload>("/tasks", { date: getTodayKey(), tasks });
});

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(loadTasks);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    apiGet<TasksPayload>("/tasks").then((data) => {
      if (data && data.date === getTodayKey()) {
        setTasks(data.tasks);
        saveToLocalStorage(data.tasks);
      } else if (data && data.date !== getTodayKey()) {
        setTasks([]);
        saveToLocalStorage([]);
      } else {
        const local = loadTasks();
        if (local.length > 0) {
          debouncedSync(local);
        }
      }
    });
  }, []);

  function saveTasks(tasks: Task[]): void {
    saveToLocalStorage(tasks);
    debouncedSync(tasks);
  }

  const addTask = useCallback((text: string) => {
    setTasks((prev) => {
      if (prev.length >= MAX_TASKS) return prev;
      const next = [...prev, { id: crypto.randomUUID(), text, done: false }];
      saveTasks(next);
      return next;
    });
  }, []);

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
      saveTasks(next);
      return next;
    });
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => {
      const next = prev.filter((t) => t.id !== id);
      saveTasks(next);
      return next;
    });
  }, []);

  const canAdd = tasks.length < MAX_TASKS;
  const doneCount = useMemo(() => tasks.filter((t) => t.done).length, [tasks]);

  return { tasks, addTask, toggleTask, deleteTask, canAdd, doneCount };
}
