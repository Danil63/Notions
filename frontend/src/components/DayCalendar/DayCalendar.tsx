import { useState, useEffect, useMemo, type DragEvent } from "react";
import type { CalendarEntry } from "../../types/task";
import styles from "./DayCalendar.module.css";

interface Props {
  getEntryAt: (hour: number) => CalendarEntry | null;
  isSlotOccupied: (hour: number) => boolean;
  onDrop: (taskId: string, taskText: string, hour: number, fromCalendar?: boolean, fromDate?: string, fromHour?: number) => void;
  onRemove: (taskId: string, date: string, hour: number) => void;
  onToggle: (taskId: string, date: string, hour: number) => void;
  selectedTask?: { id: string; text: string } | null;
  onTapEmptySlot?: (hour: number) => void;
  onTapOccupiedSlot?: (taskId: string, taskText: string, date: string, hour: number) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatHour(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

function formatToday(): string {
  return new Date().toLocaleDateString("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
}

export function DayCalendar({ getEntryAt, isSlotOccupied, onDrop, onRemove, onToggle, selectedTask, onTapEmptySlot, onTapOccupiedSlot }: Props) {
  const [currentHour, setCurrentHour] = useState(new Date().getHours());
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);
  const todayLabel = useMemo(() => formatToday(), []);

  useEffect(() => {
    const interval = setInterval(() => setCurrentHour(new Date().getHours()), 60_000);
    return () => clearInterval(interval);
  }, []);

  function handleDragOver(e: DragEvent, hour: number) {
    e.preventDefault();
    if (!isSlotOccupied(hour)) {
      setDragOverHour(hour);
    }
  }

  function handleDragLeave() {
    setDragOverHour(null);
  }

  function handleDrop(e: DragEvent, hour: number) {
    e.preventDefault();
    setDragOverHour(null);
    if (isSlotOccupied(hour)) return;
    const taskId = e.dataTransfer.getData("taskId");
    const taskText = e.dataTransfer.getData("taskText");
    const fromCalendar = e.dataTransfer.getData("fromCalendar") === "true";
    const fromDate = e.dataTransfer.getData("calendarDate");
    const fromHour = Number(e.dataTransfer.getData("calendarHour"));
    if (taskId && taskText) {
      onDrop(taskId, taskText, hour, fromCalendar, fromDate, fromHour);
    }
  }

  function handleEntryDragStart(e: DragEvent, entry: CalendarEntry) {
    e.dataTransfer.setData("taskId", entry.taskId);
    e.dataTransfer.setData("taskText", entry.taskText);
    e.dataTransfer.setData("fromCalendar", "true");
    e.dataTransfer.setData("calendarDate", entry.date);
    e.dataTransfer.setData("calendarHour", String(entry.hour));
    e.dataTransfer.setData("fromcalendar", "true");
    e.dataTransfer.effectAllowed = "move";
  }

  function handleSlotClick(hour: number) {
    const entry = getEntryAt(hour);
    if (!entry && selectedTask && onTapEmptySlot) {
      onTapEmptySlot(hour);
    } else if (entry && onTapOccupiedSlot) {
      onTapOccupiedSlot(entry.taskId, entry.taskText, entry.date, entry.hour);
    }
  }

  return (
    <div className={styles.calendar}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>Расписание</span>
        <span className={styles.headerDate}>{todayLabel}</span>
      </div>
      {HOURS.map((hour) => {
        const entry = getEntryAt(hour);
        const isCurrent = hour === currentHour;
        const isDragOver = dragOverHour === hour && !entry;
        const isTapReady = !entry && !!selectedTask;

        const slotClass = [
          styles.slot,
          isCurrent ? styles.currentHour : "",
          entry ? styles.occupied : "",
          entry?.done ? styles.entryDone : "",
          isDragOver ? styles.dragOver : "",
          isTapReady ? styles.tapReady : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <div
            key={hour}
            className={slotClass}
            onDragOver={(e) => handleDragOver(e, hour)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, hour)}
            onClick={() => handleSlotClick(hour)}
          >
            <span className={styles.time}>{formatHour(hour)}</span>
            <div
              className={styles.content}
              draggable={!!entry}
              onDragStart={entry ? (e) => handleEntryDragStart(e, entry) : undefined}
            >
              {entry && (
                <>
                  <div
                    className={`${styles.entryCheckbox} ${entry.done ? styles.entryChecked : ""}`}
                    role="checkbox"
                    aria-checked={entry.done}
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); onToggle(entry.taskId, entry.date, entry.hour); }}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(entry.taskId, entry.date, entry.hour); } }}
                  />
                  <span className={styles.taskText}>{entry.taskText}</span>
                  <button
                    className={styles.removeBtn}
                    onClick={(e) => { e.stopPropagation(); onRemove(entry.taskId, entry.date, entry.hour); }}
                    title="Удалить"
                  >
                    &times;
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
