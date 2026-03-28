import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { Task, Subtask } from "../types/task";
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
        const mapped = data.tasks.map((t) => {
          const raw = t as Task & { tag_color?: string };
          const tagColor = raw.tagColor ?? raw.tag_color;
          const result: Task = { ...t };
          if (tagColor !== undefined) result.tagColor = tagColor;
          delete (result as Task & { tag_color?: string }).tag_color;
          return result;
        });
        const pruned = pruneOldTasks(mapped);
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

  const updateTaskTag = useCallback((id: string, tag: string, tagColor: string): void => {
    setAllTasks((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, tag, tagColor } : t));
      saveAll(next);
      return next;
    });
  }, []);

  const removeTaskTag = useCallback((id: string): void => {
    setAllTasks((prev) => {
      const next = prev.map((t) => {
        if (t.id !== id) return t;
        const updated: Task = { id: t.id, text: t.text, done: t.done, date: t.date };
        if (t.subtasks) updated.subtasks = t.subtasks;
        return updated;
      });
      saveAll(next);
      return next;
    });
  }, []);

  const addSubtask = useCallback((taskId: string, text: string): void => {
    setAllTasks((prev) => {
      const next = prev.map((t) => {
        if (t.id !== taskId) return t;
        const current = t.subtasks ?? [];
        if (current.length >= 3) return t;
        const newSubtask: Subtask = { id: crypto.randomUUID(), text, done: false };
        return { ...t, subtasks: [...current, newSubtask] };
      });
      saveAll(next);
      return next;
    });
  }, []);

  const toggleSubtask = useCallback((taskId: string, subtaskId: string): void => {
    setAllTasks((prev) => {
      const next = prev.map((t) => {
        if (t.id !== taskId) return t;
        const subtasks = (t.subtasks ?? []).map((s) =>
          s.id === subtaskId ? { ...s, done: !s.done } : s
        );
        return { ...t, subtasks };
      });
      saveAll(next);
      return next;
    });
  }, []);

  const deleteSubtask = useCallback((taskId: string, subtaskId: string): void => {
    setAllTasks((prev) => {
      const next = prev.map((t) => {
        if (t.id !== taskId) return t;
        const subtasks = (t.subtasks ?? []).filter((s) => s.id !== subtaskId);
        return { ...t, subtasks };
      });
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

  return { tasks, allTasks, addTask, toggleTask, deleteTask, updateTaskTag, removeTaskTag, addSubtask, toggleSubtask, deleteSubtask, canAdd, doneCount };
}
