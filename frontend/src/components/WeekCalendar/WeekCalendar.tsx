import { useEffect, useRef, useState, useCallback, useMemo, type DragEvent } from "react";
import type { CalendarEntry } from "../../types/task";
import { hexToRgba } from "../../utils/colors";
import {
  getWeekDays,
  getWeekdayShort,
  getDayNumber,
  formatWeekHeader,
} from "../../utils/dateUtils";
import styles from "./WeekCalendar.module.css";

interface Props {
  selectedDate: string;
  today: string;
  getEntriesForDate: (date: string) => CalendarEntry[];
  onDayClick: (dateKey: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onEntryDragToDay?: (
    taskId: string,
    taskText: string,
    fromDate: string,
    fromHour: number,
    targetDateKey: string
  ) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatHour(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

export function WeekCalendar({
  selectedDate,
  today,
  getEntriesForDate,
  onDayClick,
  onPrevWeek,
  onNextWeek,
  onToday,
  onEntryDragToDay,
}: Props) {
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const weekHeader = useMemo(() => formatWeekHeader(weekDays), [weekDays]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentMinute, setCurrentMinute] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

  // Auto-scroll к текущему часу при маунте
  useEffect(() => {
    if (!scrollRef.current) return;
    const now = new Date();
    const hour = now.getHours();
    // каждая строка 44px, показываем 2 часа до текущего
    const scrollTarget = Math.max(0, (hour - 2) * 44);
    scrollRef.current.scrollTop = scrollTarget;
  }, []);

  // Обновление текущего времени каждую минуту
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentMinute(now.getHours() * 60 + now.getMinutes());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const currentHour = Math.floor(currentMinute / 60);
  const currentMinuteInHour = currentMinute % 60;
  const todayInWeek = weekDays.includes(today);

  const handleDayHeaderDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>, dateKey: string) => {
      e.preventDefault();
      setDragOverDay(dateKey);
    },
    []
  );

  const handleDayHeaderDragLeave = useCallback(() => {
    setDragOverDay(null);
  }, []);

  const handleDayHeaderDrop = useCallback(
    (e: DragEvent<HTMLDivElement>, targetDateKey: string) => {
      e.preventDefault();
      setDragOverDay(null);
      if (!onEntryDragToDay) return;
      const taskId = e.dataTransfer.getData("taskId");
      const taskText = e.dataTransfer.getData("taskText");
      const fromCalendar = e.dataTransfer.getData("fromCalendar") === "true";
      const fromDate = e.dataTransfer.getData("calendarDate");
      const fromHour = Number(e.dataTransfer.getData("calendarHour"));
      if (taskId && taskText && fromCalendar) {
        onEntryDragToDay(taskId, taskText, fromDate, fromHour, targetDateKey);
      }
    },
    [onEntryDragToDay]
  );

  return (
    <div className={styles.weekCalendar}>
      {/* Заголовок */}
      <div className={styles.header}>
        <span className={styles.headerTitle}>{weekHeader}</span>
        <div className={styles.headerControls}>
          <button
            className={styles.navBtn}
            onClick={onPrevWeek}
            aria-label="Предыдущая неделя"
          >
            ‹
          </button>
          <button
            className={styles.todayBtn}
            onClick={onToday}
          >
            Сегодня
          </button>
          <button
            className={styles.navBtn}
            onClick={onNextWeek}
            aria-label="Следующая неделя"
          >
            ›
          </button>
        </div>
      </div>

      {/* Дни-заголовки */}
      <div className={styles.dayHeaders}>
        <div className={styles.timeGutter} />
        {weekDays.map((dateKey) => {
          const isToday = dateKey === today;
          const isSelected = dateKey === selectedDate && !isToday;
          const isDragOver = dragOverDay === dateKey;
          return (
            <div
              key={dateKey}
              className={[
                styles.dayHeader,
                isToday ? styles.dayHeaderToday : "",
                isDragOver ? styles.dayHeaderDragOver : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onDayClick(dateKey)}
              onDragOver={(e) => handleDayHeaderDragOver(e, dateKey)}
              onDragLeave={handleDayHeaderDragLeave}
              onDrop={(e) => handleDayHeaderDrop(e, dateKey)}
            >
              <span className={styles.dayName}>{getWeekdayShort(dateKey)}</span>
              <span
                className={[
                  styles.dayNumber,
                  isToday ? styles.dayNumberToday : "",
                  isSelected ? styles.dayNumberSelected : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {getDayNumber(dateKey)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Тело календаря — прокручиваемая область */}
      <div className={styles.calendarBody} ref={scrollRef}>
        {HOURS.map((hour) => {
          const isCurrentHour = hour === currentHour && todayInWeek;
          return (
            <div key={hour} className={styles.hourRow}>
              {/* Метка времени */}
              <div
                className={[
                  styles.timeLabel,
                  isCurrentHour ? styles.timeLabelCurrent : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {formatHour(hour)}
              </div>

              {/* Ячейки для каждого дня */}
              {weekDays.map((dateKey) => {
                const isToday = dateKey === today;
                const isCurrentCell = isCurrentHour && isToday;
                const dayEntries = getEntriesForDate(dateKey);
                // Находим запись, которая НАЧИНАЕТСЯ в этом часу
                const startEntry = dayEntries.find((e) => e.hour === hour);
                // Проверяем, занята ли ячейка записью, начавшейся ранее
                const coveredByPrev = dayEntries.some(
                  (e) => e.hour < hour && hour < e.hour + (e.duration ?? 1)
                );

                return (
                  <div
                    key={dateKey}
                    className={[
                      styles.cell,
                      isToday ? styles.cellToday : "",
                      isCurrentCell ? styles.cellCurrent : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {/* Линия текущего времени — только в колонке сегодня */}
                    {isCurrentCell && (
                      <div
                        className={styles.currentTimeLine}
                        style={{
                          top: `${(currentMinuteInHour / 60) * 100}%`,
                        }}
                      >
                        <div className={styles.currentTimeDot} />
                      </div>
                    )}

                    {/* Запись, начинающаяся в этом часу */}
                    {startEntry && !coveredByPrev && (
                      <WeekEntry entry={startEntry} />
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface WeekEntryProps {
  entry: CalendarEntry;
}

function WeekEntry({ entry }: WeekEntryProps) {
  const dur = entry.duration ?? 1;
  const accentColor = entry.tagColor ?? "#34c759";

  function handleDragStart(e: DragEvent<HTMLDivElement>) {
    e.dataTransfer.setData("taskId", entry.taskId);
    e.dataTransfer.setData("taskText", entry.taskText);
    e.dataTransfer.setData("fromCalendar", "true");
    e.dataTransfer.setData("calendarDate", entry.date);
    e.dataTransfer.setData("calendarHour", String(entry.hour));
    e.dataTransfer.effectAllowed = "move";
  }

  const entryStyle = {
    "--dur": dur,
    background: entry.done
      ? hexToRgba(accentColor, 0.05)
      : `linear-gradient(135deg, ${hexToRgba(accentColor, 0.1)}, ${hexToRgba(accentColor, 0.06)})`,
    borderColor: hexToRgba(accentColor, entry.done ? 0.1 : 0.15),
  } as React.CSSProperties;

  return (
    <div
      className={[
        styles.entry,
        entry.done ? styles.entryDone : "",
        dur > 1 ? styles.entryMulti : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={entryStyle}
      draggable
      onDragStart={handleDragStart}
      title={entry.taskText}
    >
      <span className={styles.entryText}>{entry.taskText}</span>
    </div>
  );
}
