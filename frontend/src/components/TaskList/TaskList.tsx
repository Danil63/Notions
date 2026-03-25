import { useState, type DragEvent } from "react";
import type { Task } from "../../types/task";
import { TaskItem } from "./TaskItem";
import { AddTask } from "./AddTask";
import styles from "./TaskList.module.css";

interface Props {
  tasks: Task[];
  canAdd: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: (text: string) => void;
  onReturnFromCalendar?: (taskId: string, taskText: string, date: string, hour: number) => void;
  selectedTaskId?: string | null;
  onSelectTask?: (id: string, text: string) => void;
}

export function TaskList({ tasks, canAdd, onToggle, onDelete, onAdd, onReturnFromCalendar, selectedTaskId, onSelectTask }: Props) {
  const [dragOver, setDragOver] = useState(false);

  function handleDragOver(e: DragEvent) {
    if (e.dataTransfer.types.includes("fromcalendar")) {
      e.preventDefault();
      setDragOver(true);
    }
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const fromCalendar = e.dataTransfer.getData("fromCalendar") === "true";
    if (!fromCalendar || !onReturnFromCalendar) return;
    const taskId = e.dataTransfer.getData("taskId");
    const taskText = e.dataTransfer.getData("taskText");
    const date = e.dataTransfer.getData("calendarDate");
    const hour = Number(e.dataTransfer.getData("calendarHour"));
    if (taskId && taskText) {
      onReturnFromCalendar(taskId, taskText, date, hour);
    }
  }

  const containerClass = `${styles.container} ${dragOver ? styles.dropTarget : ""}`;

  return (
    <div
      className={containerClass}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          id={task.id}
          text={task.text}
          done={task.done}
          onToggle={() => onToggle(task.id)}
          onDelete={() => onDelete(task.id)}
          onSelect={onSelectTask ? () => onSelectTask(task.id, task.text) : undefined}
          isSelected={selectedTaskId === task.id}
        />
      ))}
      {canAdd && <AddTask onAdd={onAdd} />}
    </div>
  );
}
