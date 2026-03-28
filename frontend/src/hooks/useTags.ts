import { useState, useCallback } from "react";
import type { Tag } from "../types/task";

const TAGS_KEY = "notion_tags_v1";

function loadTags(): Tag[] {
  try {
    const raw = localStorage.getItem(TAGS_KEY);
    return raw ? (JSON.parse(raw) as Tag[]) : [];
  } catch {
    return [];
  }
}

function saveTags(tags: Tag[]): void {
  localStorage.setItem(TAGS_KEY, JSON.stringify(tags));
}

export function useTags() {
  const [tags, setTags] = useState<Tag[]>(loadTags);

  const addTag = useCallback((name: string, color: string): void => {
    setTags((prev) => {
      const next = [...prev, { id: crypto.randomUUID(), name, color }];
      saveTags(next);
      return next;
    });
  }, []);

  const deleteTag = useCallback((id: string): void => {
    setTags((prev) => {
      const next = prev.filter((t) => t.id !== id);
      saveTags(next);
      return next;
    });
  }, []);

  return { tags, addTag, deleteTag };
}
