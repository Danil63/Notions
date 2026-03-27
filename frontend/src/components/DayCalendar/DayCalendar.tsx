import { useState, useEffect, useMemo, useRef, useCallback, Fragment, type DragEvent } from "react";
import type { CalendarEntry } from "../../types/task";
import { usePointerResize } from "../../hooks/usePointerResize";
import { usePointerMove } from "../../hooks/usePointerMove";
import styles from "./DayCalendar.module.css";

interface Props {
  todayEntries: CalendarEntry[];
  isSlotOccupied: (hour: number) => boolean;
  onDrop: (taskId: string, taskText: string, hour: number, fromCalendar?: boolean, fromDate?: string, fromHour?: number) => void;
  onRemove: (taskId: string, date: string, hour: number) => void;
  onToggle: (taskId: string, date: string, hour: number) => void;
  onResize: (taskId: string, date: string, hour: number, newDuration: number) => void;
  onMove: (taskId: string, fromDate: string, fromHour: number, toHour: number) => void;
  onReturnToList?: (taskId: string, taskText: string, date: string, hour: number) => void;
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

export function DayCalendar({ todayEntries, isSlotOccupied, onDrop, onRemove, onToggle, onResize, onMove, onReturnToList, selectedTask, onTapEmptySlot, onTapOccupiedSlot }: Props) {
  const [currentHour, setCurrentHour] = useState(new Date().getHours());
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);
  const todayLabel = useMemo(() => formatToday(), []);
  const entryRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const isSlotFree = useCallback((hour: number, excludeTaskId: string) => {
    return !todayEntries.some((e) =>
      e.taskId !== excludeTaskId && hour >= e.hour && hour < e.hour + (e.duration ?? 1)
    );
  }, [todayEntries]);

  const { handleResizePointerDown } = usePointerResize(onResize, isSlotFree);
  const { handleMovePointerDown } = usePointerMove(onMove, isSlotFree);

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

  function handleSlotClick(hour: number) {
    if (!isSlotOccupied(hour) && selectedTask && onTapEmptySlot) {
      onTapEmptySlot(hour);
    } else if (isSlotOccupied(hour) && onTapOccupiedSlot) {
      const entry = todayEntries.find((e) => hour >= e.hour && hour < e.hour + (e.duration ?? 1));
      if (entry) {
        onTapOccupiedSlot(entry.taskId, entry.taskText, entry.date, entry.hour);
      }
    }
  }

  function setEntryRef(key: string, el: HTMLDivElement | null) {
    if (el) {
      entryRefs.current.set(key, el);
    } else {
      entryRefs.current.delete(key);
    }
  }

  return (
    <div className={styles.calendar}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>Расписание</span>
        <span className={styles.headerDate}>{todayLabel}</span>
      </div>
      <div className={styles.calendarBody}>
        {/* Background slots */}
        {HOURS.map((hour) => {
          const isCurrent = hour === currentHour;
          const isDragOver = dragOverHour === hour && !isSlotOccupied(hour);
          const isTapReady = !isSlotOccupied(hour) && !!selectedTask;

          return (
            <Fragment key={hour}>
              <span
                className={`${styles.time} ${isCurrent ? styles.currentHourTime : ""}`}
                style={{ gridRow: hour + 1 }}
              >
                {formatHour(hour)}
              </span>
              <div
                className={[
                  styles.slotContent,
                  isCurrent ? styles.currentHourSlot : "",
                  isDragOver ? styles.dragOver : "",
                  isTapReady ? styles.tapReady : "",
                ].filter(Boolean).join(" ")}
                style={{ gridRow: hour + 1 }}
                onDragOver={(e) => handleDragOver(e, hour)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, hour)}
                onClick={() => handleSlotClick(hour)}
              />
            </Fragment>
          );
        })}

        {/* Entries overlay */}
        {todayEntries.map((entry) => {
          const dur = entry.duration ?? 1;
          const key = `${entry.taskId}-${entry.hour}`;
          return (
            <div
              key={key}
              ref={(el) => setEntryRef(key, el)}
              className={[
                styles.entry,
                entry.done ? styles.entryDone : "",
                dur > 1 ? styles.multiSlot : "",
              ].filter(Boolean).join(" ")}
              style={{
                "--row-start": entry.hour + 1,
                "--row-span": dur,
              } as React.CSSProperties}
              title={entry.taskText}
              onPointerDown={(e) => handleMovePointerDown(
                e,
                { taskId: entry.taskId, date: entry.date, hour: entry.hour, duration: dur },
                entryRefs.current.get(key) ?? null,
              )}
            >
              <span className={styles.entryTimeStart}>{formatHour(entry.hour)}</span>
              {dur > 1 && (
                <span className={styles.entryTimeEnd}>{formatHour(entry.hour + dur)}</span>
              )}
              <div className={styles.entryContent}>
                <div
                  className={`${styles.entryCheckbox} ${entry.done ? styles.entryChecked : ""}`}
                  role="checkbox"
                  aria-checked={entry.done}
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); onToggle(entry.taskId, entry.date, entry.hour); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(entry.taskId, entry.date, entry.hour); } }}
                />
                <span className={styles.taskText}>{entry.taskText}</span>
                {onReturnToList && (
                  <button
                    className={styles.returnBtn}
                    onClick={(e) => { e.stopPropagation(); onReturnToList(entry.taskId, entry.taskText, entry.date, entry.hour); }}
                    title="Вернуть в список"
                  >
                    &#x21A9;
                  </button>
                )}
                <button
                  className={styles.removeBtn}
                  onClick={(e) => { e.stopPropagation(); onRemove(entry.taskId, entry.date, entry.hour); }}
                  title="Удалить"
                >
                  &times;
                </button>
              </div>
              <div
                className={styles.resizeHandle}
                data-resize-handle
                onPointerDown={(e) => handleResizePointerDown(
                  e,
                  { taskId: entry.taskId, date: entry.date, hour: entry.hour, duration: dur },
                  entryRefs.current.get(key) ?? null,
                )}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
