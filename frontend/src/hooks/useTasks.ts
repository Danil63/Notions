import { useState, useCallback, useMemo } from "react";
import type { Task } from "../types/task";

const MAX_TASKS = 5;
const STORAGE_KEY = "notion_day_tasks";

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

function saveTasks(tasks: Task[]): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ date: getTodayKey(), tasks })
  );
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(loadTasks);

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
