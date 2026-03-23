import { useState, useCallback } from "react";
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

export default function App() {
  const [activeTab, setActiveTab] = useState(0);
  const { tasks, addTask, toggleTask, deleteTask, canAdd, doneCount } = useTasks();
  const timeLeft = useTimer();
  const week = useWeekProgress();
  const { addEntry, removeEntry, isSlotOccupied, getEntryAt } = useCalendar();

  const total = tasks.length;
  const dayPercent = total > 0 ? Math.min(100, Math.round((doneCount / total) * 100)) : 0;
  const allDone = total > 0 && doneCount >= total;

  const handleCalendarDrop = useCallback(
    (taskId: string, taskText: string, hour: number) => {
      addEntry(taskId, taskText, hour);
      deleteTask(taskId);
    },
    [addEntry, deleteTask]
  );

  return (
    <div className={styles.widget}>
      <Tabs tabs={TAB_LABELS} activeIndex={activeTab} onSelect={setActiveTab} />

      {activeTab === 0 && (
        <>
          <ProgressBar percent={dayPercent} />
          <div className={styles.infoCards}>
            <InfoCard
              value={`${doneCount} / ${total}`}
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
                onDelete={deleteTask}
                onAdd={addTask}
              />
            </div>
            <div className={styles.rightColumn}>
              <DayCalendar
                getEntryAt={getEntryAt}
                isSlotOccupied={isSlotOccupied}
                onDrop={handleCalendarDrop}
                onRemove={removeEntry}
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
