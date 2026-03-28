import { useState, useEffect, useMemo, useRef, useCallback, type DragEvent } from "react";
import type { CalendarEntry } from "../../types/task";
import { usePointerResize } from "../../hooks/usePointerResize";
import { usePointerMove } from "../../hooks/usePointerMove";
import { formatFullDate } from "../../utils/dateUtils";
import { hexToRgba } from "../../utils/colors";
import styles from "./DayCalendar.module.css";

const HOUR_HEIGHT = 66; // px на 1 час
const PX_PER_MINUTE = HOUR_HEIGHT / 60; // = 1.1px/мин

interface Props {
  selectedDate: string;
  entries: CalendarEntry[];
  isSlotOccupied: (startMinute: number) => boolean;
  onDrop: (
    taskId: string,
    taskText: string,
    startMinute: number,
    fromCalendar?: boolean,
    fromDate?: string,
    fromStartMinute?: number,
    tag?: string,
    tagColor?: string
  ) => void;
  onRemove: (taskId: string, date: string, startMinute: number) => void;
  onToggle: (taskId: string, date: string, startMinute: number) => void;
  onResize: (taskId: string, date: string, startMinute: number, newDuration: number) => void;
  onMove: (taskId: string, fromDate: string, fromStartMinute: number, toStartMinute: number) => void;
  onReturnToList?: (taskId: string, taskText: string, date: string, startMinute: number) => void;
  selectedTask?: { id: string; text: string; tag?: string; tagColor?: string } | null;
  onTapEmptySlot?: (startMinute: number) => void;
  onTapOccupiedSlot?: (taskId: string, taskText: string, date: string, startMinute: number) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatHour(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

function formatMinute(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h}:${String(min).padStart(2, "0")}`;
}

export function DayCalendar({
  selectedDate,
  entries,
  onDrop,
  onRemove,
  onToggle,
  onResize,
  onMove,
  onReturnToList,
  selectedTask,
  onTapEmptySlot,
  onTapOccupiedSlot,
}: Props) {
  const [currentMinute, setCurrentMinute] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);
  const dateLabel = useMemo(() => formatFullDate(selectedDate), [selectedDate]);
  const entryRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const isSlotFree = useCallback(
    (startMinute: number, excludeTaskId: string) => {
      return !entries.some(
        (e) =>
          e.taskId !== excludeTaskId &&
          e.startMinute < startMinute + 60 &&
          e.startMinute + e.duration > startMinute
      );
    },
    [entries]
  );

  const { handleResizePointerDown } = usePointerResize(onResize, isSlotFree);
  const { handleMovePointerDown } = usePointerMove(onMove, isSlotFree);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentMinute(now.getHours() * 60 + now.getMinutes());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  function handleDragOver(e: DragEvent, hour: number) {
    e.preventDefault();
    setDragOverHour(hour);
  }

  function handleDragLeave() {
    setDragOverHour(null);
  }

  function handleDrop(e: DragEvent, hour: number) {
    e.preventDefault();
    setDragOverHour(null);
    const taskId = e.dataTransfer.getData("taskId");
    const taskText = e.dataTransfer.getData("taskText");
    const fromCalendar = e.dataTransfer.getData("fromCalendar") === "true";
    const fromDate = e.dataTransfer.getData("calendarDate");
    const fromStartMinute = Number(e.dataTransfer.getData("calendarStartMinute"));
    const tag = e.dataTransfer.getData("taskTag") || undefined;
    const tagColor = e.dataTransfer.getData("taskTagColor") || undefined;
    if (!taskId || !taskText) return;

    // Вычисляем позицию внутри ячейки по Y
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const yInCell = e.clientY - rect.top;
    const rawMinute = hour * 60 + (yInCell / HOUR_HEIGHT) * 60;
    const snappedMinute = Math.round(rawMinute / 10) * 10;

    onDrop(taskId, taskText, snappedMinute, fromCalendar, fromDate, fromStartMinute, tag, tagColor);
  }

  function handleSlotClick(e: React.MouseEvent<HTMLDivElement>, hour: number) {
    const rawMinute = hour * 60 + (e.nativeEvent.offsetY / HOUR_HEIGHT) * 60;
    const snappedMinute = Math.round(rawMinute / 10) * 10;

    // Проверяем занятость по snappedMinute
    const occupiedEntry = entries.find(
      (entry) =>
        snappedMinute >= entry.startMinute &&
        snappedMinute < entry.startMinute + entry.duration
    );

    if (!occupiedEntry && selectedTask && onTapEmptySlot) {
      onTapEmptySlot(snappedMinute);
    } else if (occupiedEntry && onTapOccupiedSlot) {
      onTapOccupiedSlot(occupiedEntry.taskId, occupiedEntry.taskText, occupiedEntry.date, occupiedEntry.startMinute);
    }
  }

  function setEntryRef(key: string, el: HTMLDivElement | null) {
    if (el) {
      entryRefs.current.set(key, el);
    } else {
      entryRefs.current.delete(key);
    }
  }

  const currentLineTop = currentMinute * PX_PER_MINUTE;

  return (
    <div className={styles.calendar}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>Расписание</span>
        <span className={styles.headerDate}>{dateLabel}</span>
      </div>
      <div className={styles.calendarBody}>
        {/* Линия текущего времени — абсолютно поверх всего */}
        <div
          className={styles.currentTimeLine}
          style={{ top: `${currentLineTop}px` }}
        >
          <div className={styles.currentTimeDot} />
        </div>

        {HOURS.map((hour) => {
          const isDragOver = dragOverHour === hour;
          const isTapReady = selectedTask !== null && selectedTask !== undefined;
          const isCurrentHour = Math.floor(currentMinute / 60) === hour;

          // Записи, начинающиеся в этом часу
          const hourEntries = entries.filter(
            (e) => Math.floor(e.startMinute / 60) === hour
          );

          return (
            <div key={hour} className={styles.hourRow}>
              {/* Метка времени с засечками */}
              <div
                className={`${styles.timeLabel} ${isCurrentHour ? styles.timeLabelCurrent : ""}`}
              >
                {formatHour(hour)}
                <div className={styles.tickMarks}>
                  {[10, 20, 30, 40, 50].map((min) => (
                    <div
                      key={min}
                      className={min === 30 ? styles.tickHalf : styles.tick}
                      style={{ top: `${(min / 60) * 100}%` }}
                    />
                  ))}
                </div>
              </div>

              {/* Ячейка — drop-зона */}
              <div
                className={[
                  styles.cell,
                  isCurrentHour ? styles.cellCurrent : "",
                  isDragOver ? styles.cellDragOver : "",
                  isTapReady ? styles.cellTapReady : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onDragOver={(e) => handleDragOver(e, hour)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, hour)}
                onClick={(e) => handleSlotClick(e, hour)}
              >
                {/* Записи этого часа */}
                {hourEntries.map((entry) => {
                  const minuteInHour = entry.startMinute % 60;
                  const top = minuteInHour * PX_PER_MINUTE;
                  const height = Math.max(entry.duration * PX_PER_MINUTE - 4, 20);
                  const dur = entry.duration;
                  const key = `${entry.taskId}-${entry.startMinute}`;
                  const accentColor = entry.tagColor ?? "#34c759";
                  const entryStyle: React.CSSProperties = {
                    top: `${top}px`,
                    height: `${height}px`,
                    background: entry.done
                      ? hexToRgba(accentColor, 0.05)
                      : `linear-gradient(135deg, ${hexToRgba(accentColor, 0.1)}, ${hexToRgba(accentColor, 0.06)})`,
                    borderColor: hexToRgba(accentColor, entry.done ? 0.1 : 0.15),
                  };
                  function handleEntryDragStart(e: DragEvent<HTMLDivElement>) {
                    e.dataTransfer.setData("taskId", entry.taskId);
                    e.dataTransfer.setData("taskText", entry.taskText);
                    e.dataTransfer.setData("fromCalendar", "true");
                    e.dataTransfer.setData("calendarDate", entry.date);
                    e.dataTransfer.setData("calendarStartMinute", String(entry.startMinute));
                    if (entry.tag) e.dataTransfer.setData("taskTag", entry.tag);
                    if (entry.tagColor) e.dataTransfer.setData("taskTagColor", entry.tagColor);
                    e.dataTransfer.effectAllowed = "move";
                  }

                  return (
                    <div
                      key={key}
                      ref={(el) => setEntryRef(key, el)}
                      className={[
                        styles.entry,
                        entry.done ? styles.entryDone : "",
                        dur > 60 ? styles.multiSlot : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      style={entryStyle}
                      title={entry.taskText}
                      draggable
                      onDragStart={handleEntryDragStart}
                      onPointerDown={(e) =>
                        handleMovePointerDown(
                          e,
                          {
                            taskId: entry.taskId,
                            date: entry.date,
                            startMinute: entry.startMinute,
                            duration: entry.duration,
                          },
                          entryRefs.current.get(key) ?? null
                        )
                      }
                    >
                      <span className={styles.entryTimeStart} data-time-start>
                        {formatMinute(entry.startMinute)}
                      </span>
                      <span className={styles.entryTimeEnd} data-time-end>
                        {formatMinute(entry.startMinute + dur)}
                      </span>
                      <div className={styles.entryContent}>
                        <div
                          className={`${styles.entryCheckbox} ${entry.done ? styles.entryChecked : ""}`}
                          style={{
                            borderColor: entry.done
                              ? accentColor
                              : hexToRgba(accentColor, 0.4),
                            background: entry.done ? accentColor : "transparent",
                          }}
                          role="checkbox"
                          aria-checked={entry.done}
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggle(entry.taskId, entry.date, entry.startMinute);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onToggle(entry.taskId, entry.date, entry.startMinute);
                            }
                          }}
                        />
                        <span
                          className={styles.taskText}
                          style={{
                            color: entry.done
                              ? "var(--color-text-muted)"
                              : accentColor,
                          }}
                        >
                          {entry.taskText}
                        </span>
                        {entry.tag && (
                          <span
                            className={styles.entryTagBadge}
                            style={{
                              background: hexToRgba(accentColor, 0.15),
                              color: accentColor,
                            }}
                          >
                            {entry.tag}
                          </span>
                        )}
                        {onReturnToList && (
                          <button
                            className={styles.returnBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              onReturnToList(
                                entry.taskId,
                                entry.taskText,
                                entry.date,
                                entry.startMinute
                              );
                            }}
                            title="Вернуть в список"
                          />
                        )}
                        <button
                          className={styles.removeBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemove(entry.taskId, entry.date, entry.startMinute);
                          }}
                          title="Удалить"
                        >
                          &times;
                        </button>
                      </div>
                      <div
                        className={styles.resizeHandle}
                        data-resize-handle
                        onPointerDown={(e) =>
                          handleResizePointerDown(
                            e,
                            {
                              taskId: entry.taskId,
                              date: entry.date,
                              startMinute: entry.startMinute,
                              duration: entry.duration,
                            },
                            entryRefs.current.get(key) ?? null
                          )
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
