import { useMemo } from "react";
import type { Task, CalendarEntry } from "../types/task";

export interface SkillBlock {
  tag: string;
  tagColor: string;
  total: number;
  done: number;
}

export function useSkillBlocks(allTasks: Task[], calendarEntries: CalendarEntry[]): SkillBlock[] {
  return useMemo(() => {
    const map = new Map<string, SkillBlock>();

    function processItem(tag: string, tagColor: string, done: boolean): void {
      const key = `${tag}::${tagColor}`;
      const existing = map.get(key);
      if (existing) {
        existing.total += 1;
        if (done) existing.done += 1;
      } else {
        map.set(key, { tag, tagColor, total: 1, done: done ? 1 : 0 });
      }
    }

    for (const task of allTasks) {
      if (!task.tag || !task.tagColor) continue;
      processItem(task.tag, task.tagColor, task.done);
    }

    for (const entry of calendarEntries) {
      if (!entry.tag || !entry.tagColor) continue;
      processItem(entry.tag, entry.tagColor, entry.done);
    }

    return Array.from(map.values())
      .filter((s) => s.total >= 5)
      .sort((a, b) => b.total - a.total);
  }, [allTasks, calendarEntries]);
}
