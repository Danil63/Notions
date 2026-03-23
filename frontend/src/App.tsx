import { useState } from "react";
import { Tabs } from "./components/Tabs";
import { ProgressBar } from "./components/ProgressBar";
import { InfoCard } from "./components/InfoCard";
import { TaskList } from "./components/TaskList";
import { useTasks } from "./hooks/useTasks";
import { useTimer } from "./hooks/useTimer";
import { useWeekProgress } from "./hooks/useWeekProgress";
import { getTopicsCardColor, getHoursCardColor } from "./utils/colors";
import styles from "./App.module.css";

const TAB_LABELS = ["День", "Неделя"];

export default function App() {
  const [activeTab, setActiveTab] = useState(0);
  const { tasks, addTask, toggleTask, deleteTask, canAdd, doneCount } = useTasks();
  const timeLeft = useTimer();
  const week = useWeekProgress();

  const total = tasks.length;
  const dayPercent = total > 0 ? Math.min(100, Math.round((doneCount / total) * 100)) : 0;
  const allDone = total > 0 && doneCount >= total;

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
          <TaskList
            tasks={tasks}
            canAdd={canAdd}
            onToggle={toggleTask}
            onDelete={deleteTask}
            onAdd={addTask}
          />
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
