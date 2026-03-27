import { useState, useCallback, useEffect } from "react";
import { Tabs } from "./components/Tabs";
import { ProgressBar } from "./components/ProgressBar";
import { InfoCard } from "./components/InfoCard";
import { TaskList } from "./components/TaskList";
import { DayCalendar } from "./components/DayCalendar";
import { useTasks } from "./hooks/useTasks";
import { useTimer } from "./hooks/useTimer";
import { useWeekProgress } from "./hooks/useWeekProgress";
import { useCalendar } from "./hooks/useCalendar";
import { getTopicsCardColor, getHoursCardColor } from "./utils/colors";
import styles from "./App.module.css";

const TAB_LABELS = ["День", "Неделя"];
const MOBILE_MQ = "(max-width: 768px)";

export default function App() {
  const [activeTab, setActiveTab] = useState(0);
  const { tasks, addTask, toggleTask, deleteTask, canAdd, doneCount } = useTasks();
  const timeLeft = useTimer();
  const week = useWeekProgress();
  const { addEntry, removeEntry, moveEntry, resizeEntry, toggleEntry, isSlotOccupied, todayEntries, todayTotal: calTotal, todayDoneCount: calDone } = useCalendar();

  const [selectedTask, setSelectedTask] = useState<{ id: string; text: string } | null>(null);
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

  const total = tasks.length + calTotal;
  const totalDone = doneCount + calDone;
  const dayPercent = total > 0 ? Math.min(100, Math.round((totalDone / total) * 100)) : 0;
  const allDone = total > 0 && totalDone >= total;

  const handleCalendarDrop = useCallback(
    (taskId: string, taskText: string, hour: number, fromCalendar?: boolean, fromDate?: string, fromHour?: number) => {
      if (fromCalendar && fromDate !== undefined && fromHour !== undefined) {
        moveEntry(taskId, fromDate, fromHour, hour);
      } else {
        addEntry(taskId, taskText, hour);
        deleteTask(taskId);
      }
    },
    [addEntry, deleteTask, moveEntry]
  );

  const handleReturnToList = useCallback(
    (taskId: string, taskText: string, date: string, hour: number) => {
      removeEntry(taskId, date, hour);
      addTask(taskText);
    },
    [removeEntry, addTask]
  );

  const handleSelectTask = useCallback((id: string, text: string) => {
    setSelectedTask((prev) => prev?.id === id ? null : { id, text });
  }, []);

  const handleDeleteWithClear = useCallback((id: string) => {
    deleteTask(id);
    setSelectedTask((prev) => prev?.id === id ? null : prev);
  }, [deleteTask]);

  const handleTapEmptySlot = useCallback((hour: number) => {
    if (!selectedTask) return;
    addEntry(selectedTask.id, selectedTask.text, hour);
    deleteTask(selectedTask.id);
    setSelectedTask(null);
  }, [selectedTask, addEntry, deleteTask]);

  const handleTapOccupiedSlot = useCallback((taskId: string, taskText: string, date: string, hour: number) => {
    if (!canAdd) return;
    removeEntry(taskId, date, hour);
    addTask(taskText);
  }, [canAdd, removeEntry, addTask]);

  return (
    <div className={styles.widget}>
      <Tabs tabs={TAB_LABELS} activeIndex={activeTab} onSelect={setActiveTab} />

      {activeTab === 0 && (
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
                canAdd={canAdd}
                onToggle={toggleTask}
                onDelete={isMobile ? handleDeleteWithClear : deleteTask}
                onAdd={addTask}
                onReturnFromCalendar={handleReturnToList}
                selectedTaskId={isMobile ? selectedTask?.id ?? null : undefined}
                onSelectTask={isMobile ? handleSelectTask : undefined}
              />
            </div>
            <div className={styles.rightColumn}>
              <DayCalendar
                todayEntries={todayEntries}
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
              />
            </div>
          </div>
        </>
      )}

      {activeTab === 1 && (
        <>
          <ProgressBar percent={week.percent} />
          <div className={styles.infoCards}>
            <InfoCard value={`${week.done} / ${week.goal}`} label="тем за неделю" />
            <InfoCard value={String(week.weeksLeft)} label="недель осталось" />
            <InfoCard value={String(week.rate)} label="тем / неделю" />
          </div>
        </>
      )}
    </div>
  );
}
