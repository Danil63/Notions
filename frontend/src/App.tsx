import { useState, useCallback, useEffect, useRef } from "react";
import type { Subtask } from "./types/task";
import { ProgressBar } from "./components/ProgressBar";
import { InfoCard } from "./components/InfoCard";
import { TaskList } from "./components/TaskList";
import { DayCalendar } from "./components/DayCalendar";
import { WeekDayStrip } from "./components/WeekDayStrip";
import { WeekCalendar } from "./components/WeekCalendar";
import { SkillBlocks } from "./components/SkillBlocks";
import { TagManager } from "./components/TagManager";
import { useTasks } from "./hooks/useTasks";
import { useTags } from "./hooks/useTags";
import { useTimer } from "./hooks/useTimer";
import { useCalendar } from "./hooks/useCalendar";
import { useSelectedDate } from "./hooks/useSelectedDate";
import { useSwipe } from "./hooks/useSwipe";
import { useWeekDayProgress } from "./hooks/useWeekDayProgress";
import { useSkillBlocks } from "./hooks/useSkillBlocks";
import { getTopicsCardColor, getHoursCardColor } from "./utils/colors";
import styles from "./App.module.css";

const MOBILE_MQ = "(max-width: 768px)";

type ViewMode = "day" | "week";

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>("day");

  const {
    selectedDate,
    today,
    maxDate,
    goToNextDay,
    goToPrevDay,
    goToDate,
    goToNextWeek,
    goToPrevWeek,
    goToToday,
  } = useSelectedDate();

  const { tasks, allTasks, addTask, toggleTask, deleteTask, updateTaskTag, removeTaskTag, addSubtask, toggleSubtask, deleteSubtask, canAdd, doneCount } =
    useTasks(selectedDate);

  const { tags, addTag, deleteTag } = useTags();

  const timeLeft = useTimer();

  const {
    entries,
    addEntry,
    removeEntry,
    moveEntry,
    resizeEntry,
    toggleEntry,
    addCalendarSubtask,
    toggleCalendarSubtask,
    deleteCalendarSubtask,
    isSlotOccupied,
    dateEntries,
    dateTotal,
    dateDoneCount,
    getEntriesForDate,
  } = useCalendar(selectedDate);

  const weekProgress = useWeekDayProgress(selectedDate, entries, allTasks);
  const skills = useSkillBlocks(allTasks, entries);

  const [selectedTask, setSelectedTask] = useState<{ id: string; text: string; tag?: string; tagColor?: string; subtasks?: Subtask[] } | null>(null);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_MQ).matches);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
      if (!e.matches) setSelectedTask(null);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const total = tasks.length + dateTotal;
  const totalDone = doneCount + dateDoneCount;
  const dayPercent = total > 0 ? Math.min(100, Math.round((totalDone / total) * 100)) : 0;
  const allDone = total > 0 && totalDone >= total;

  const handleCalendarDrop = useCallback(
    (
      taskId: string,
      taskText: string,
      startMinute: number,
      fromCalendar?: boolean,
      fromDate?: string,
      fromStartMinute?: number,
      tag?: string,
      tagColor?: string
    ) => {
      if (fromCalendar && fromDate !== undefined && fromStartMinute !== undefined) {
        moveEntry(taskId, fromDate, fromStartMinute, startMinute);
      } else {
        const sourceTask = allTasks.find((t) => t.id === taskId);
        addEntry(taskId, taskText, startMinute, 60, tag, tagColor, sourceTask?.subtasks);
        deleteTask(taskId);
      }
    },
    [addEntry, deleteTask, moveEntry, allTasks]
  );

  const handleReturnToList = useCallback(
    (taskId: string, taskText: string, date: string, startMinute: number) => {
      removeEntry(taskId, date, startMinute);
      addTask(taskText);
    },
    [removeEntry, addTask]
  );

  const handleSelectTask = useCallback((id: string, text: string) => {
    const found = tasks.find((t) => t.id === id);
    setSelectedTask((prev) => (prev?.id === id ? null : { id, text, tag: found?.tag, tagColor: found?.tagColor, subtasks: found?.subtasks }));
  }, [tasks]);

  const handleDeleteWithClear = useCallback(
    (id: string) => {
      deleteTask(id);
      setSelectedTask((prev) => (prev?.id === id ? null : prev));
    },
    [deleteTask]
  );

  const handleTapEmptySlot = useCallback(
    (startMinute: number) => {
      if (!selectedTask) return;
      addEntry(selectedTask.id, selectedTask.text, startMinute, 60, selectedTask.tag, selectedTask.tagColor, selectedTask.subtasks);
      deleteTask(selectedTask.id);
      setSelectedTask(null);
    },
    [selectedTask, addEntry, deleteTask]
  );

  const handleTapOccupiedSlot = useCallback(
    (taskId: string, taskText: string, date: string, startMinute: number) => {
      if (!canAdd) return;
      removeEntry(taskId, date, startMinute);
      addTask(taskText);
    },
    [canAdd, removeEntry, addTask]
  );

  const handleWeekDayClick = useCallback(
    (dateKey: string) => {
      goToDate(dateKey);
      setViewMode("day");
    },
    [goToDate]
  );

  const pendingTaskRef = useRef<{ text: string; targetDate: string } | null>(null);

  const handleWeekEntryDragToDay = useCallback(
    (
      taskId: string,
      taskText: string,
      fromDate: string,
      fromStartMinute: number,
      targetDateKey: string
    ) => {
      removeEntry(taskId, fromDate, fromStartMinute);
      pendingTaskRef.current = { text: taskText, targetDate: targetDateKey };
      goToDate(targetDateKey);
      setViewMode("day");
    },
    [removeEntry, goToDate]
  );

  useEffect(() => {
    const pending = pendingTaskRef.current;
    if (pending && selectedDate === pending.targetDate) {
      pendingTaskRef.current = null;
      addTask(pending.text);
    }
  }, [selectedDate, addTask]);

  const swipeHandlers = useSwipe(goToNextDay, goToPrevDay);
  const weekSwipeHandlers = useSwipe(goToNextWeek, goToPrevWeek);

  const handleToggleViewMode = useCallback(() => {
    setViewMode((prev) => (prev === "day" ? "week" : "day"));
  }, []);

  const dayContent = (
    <>
      <ProgressBar percent={dayPercent} />
      <div className={styles.infoCards}>
        <InfoCard
          value={`${totalDone} / ${total}`}
          label="тем сегодня"
          bgColor={getTopicsCardColor(doneCount)}
        />
        <InfoCard
          value={timeLeft}
          label="до конца дня"
          bgColor={getHoursCardColor(allDone)}
        />
        <InfoCard value={String(total)} label="тем / день" />
      </div>
      <div className={styles.dayColumns}>
        <div className={styles.leftColumn}>
          <TaskList
            tasks={tasks}
            tags={tags}
            canAdd={canAdd}
            onToggle={toggleTask}
            onDelete={isMobile ? handleDeleteWithClear : deleteTask}
            onAdd={addTask}
            onUpdateTag={updateTaskTag}
            onRemoveTag={removeTaskTag}
            onReturnFromCalendar={handleReturnToList}
            selectedTaskId={isMobile ? (selectedTask?.id ?? null) : undefined}
            onSelectTask={isMobile ? handleSelectTask : undefined}
            onAddSubtask={addSubtask}
            onToggleSubtask={toggleSubtask}
            onDeleteSubtask={deleteSubtask}
          />
        </div>
        <div className={styles.rightColumn}>
          <DayCalendar
            selectedDate={selectedDate}
            entries={dateEntries}
            isSlotOccupied={isSlotOccupied}
            onDrop={handleCalendarDrop}
            onRemove={removeEntry}
            onToggle={toggleEntry}
            onResize={resizeEntry}
            onMove={moveEntry}
            onReturnToList={handleReturnToList}
            selectedTask={isMobile ? selectedTask : undefined}
            onTapEmptySlot={isMobile ? handleTapEmptySlot : undefined}
            onTapOccupiedSlot={isMobile ? handleTapOccupiedSlot : undefined}
            onAddCalendarSubtask={addCalendarSubtask}
            onToggleCalendarSubtask={toggleCalendarSubtask}
            onDeleteCalendarSubtask={deleteCalendarSubtask}
          />
        </div>
      </div>
    </>
  );

  const weekContent = (
    <>
      <ProgressBar percent={weekProgress.percent} />
      <div className={styles.infoCards}>
        <InfoCard
          value={`${weekProgress.completedDays} / 7`}
          label="дней закрыто"
          bgColor={getTopicsCardColor(weekProgress.completedDays)}
        />
        <InfoCard
          value={String(
            weekProgress.weekDays.reduce((sum, d) => sum + d.done, 0)
          )}
          label="задач за неделю"
        />
        <InfoCard
          value={String(weekProgress.completedDays)}
          label="дней на 100%"
        />
      </div>
      <WeekCalendar
        selectedDate={selectedDate}
        today={today}
        getEntriesForDate={getEntriesForDate}
        onDayClick={handleWeekDayClick}
        onPrevWeek={goToPrevWeek}
        onNextWeek={goToNextWeek}
        onToday={goToToday}
        onEntryDragToDay={handleWeekEntryDragToDay}
      />
    </>
  );

  const activeSwipeHandlers = isMobile
    ? (viewMode === "day" ? swipeHandlers : weekSwipeHandlers)
    : {};

  return (
    <div className={styles.widget}>
      <WeekDayStrip
        selectedDate={selectedDate}
        today={today}
        onSelectDate={goToDate}
        minDate={today}
        maxDate={maxDate}
        onPrevWeek={goToPrevWeek}
        onNextWeek={goToNextWeek}
      />

      <div className={styles.swipeContainer} {...activeSwipeHandlers}>
        {viewMode === "day" && dayContent}
        {viewMode === "week" && weekContent}
      </div>

      {viewMode === "day" && (
        <>
          <SkillBlocks skills={skills} />
          <TagManager tags={tags} onAddTag={addTag} onDeleteTag={deleteTag} />
        </>
      )}

      <button
        className={styles.fab}
        onClick={handleToggleViewMode}
        aria-label={viewMode === "day" ? "Переключить на неделю" : "Переключить на день"}
      >
        {viewMode === "day" ? "Неделя" : "День"}
      </button>
    </div>
  );
}
