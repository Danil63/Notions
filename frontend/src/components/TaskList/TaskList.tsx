import { useState, type DragEvent } from "react";
import type { Task, Tag } from "../../types/task";
import { TaskItem } from "./TaskItem";
import { AddTask } from "./AddTask";
import styles from "./TaskList.module.css";

interface Props {
  tasks: Task[];
  tags: Tag[];
  canAdd: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: (text: string) => void;
  onUpdateTag: (id: string, tag: string, tagColor: string) => void;
  onRemoveTag: (id: string) => void;
  onReturnFromCalendar?: (taskId: string, taskText: string, date: string, startMinute: number) => void;
  selectedTaskId?: string | null;
  onSelectTask?: (id: string, text: string) => void;
  onAddSubtask: (taskId: string, text: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onDeleteSubtask: (taskId: string, subtaskId: string) => void;
}

export function TaskList({
  tasks,
  tags,
  canAdd,
  onToggle,
  onDelete,
  onAdd,
  onUpdateTag,
  onRemoveTag,
  onReturnFromCalendar,
  selectedTaskId,
  onSelectTask,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
}: Props) {
  const [dragOver, setDragOver] = useState(false);

  function handleDragOver(e: DragEvent): void {
    if (e.dataTransfer.types.includes("fromcalendar")) {
      e.preventDefault();
      setDragOver(true);
    }
  }

  function handleDragLeave(): void {
    setDragOver(false);
  }

  function handleDrop(e: DragEvent): void {
    e.preventDefault();
    setDragOver(false);
    const fromCalendar = e.dataTransfer.getData("fromCalendar") === "true";
    if (!fromCalendar || !onReturnFromCalendar) return;
    const taskId = e.dataTransfer.getData("taskId");
    const taskText = e.dataTransfer.getData("taskText");
    const date = e.dataTransfer.getData("calendarDate");
    const startMinute = Number(e.dataTransfer.getData("calendarStartMinute"));
    if (taskId && taskText) {
      onReturnFromCalendar(taskId, taskText, date, startMinute);
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
          tag={task.tag}
          tagColor={task.tagColor}
          tags={tags}
          subtasks={task.subtasks}
          onToggle={() => onToggle(task.id)}
          onDelete={() => onDelete(task.id)}
          onUpdateTag={(tag, tagColor) => onUpdateTag(task.id, tag, tagColor)}
          onRemoveTag={() => onRemoveTag(task.id)}
          onAddSubtask={(text) => onAddSubtask(task.id, text)}
          onToggleSubtask={(subtaskId) => onToggleSubtask(task.id, subtaskId)}
          onDeleteSubtask={(subtaskId) => onDeleteSubtask(task.id, subtaskId)}
          onSelect={onSelectTask ? () => onSelectTask(task.id, task.text) : undefined}
          isSelected={selectedTaskId === task.id}
        />
      ))}
      {canAdd && <AddTask onAdd={onAdd} />}
    </div>
  );
}
