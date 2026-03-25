import type { DragEvent } from "react";
import styles from "./TaskList.module.css";

interface Props {
  id: string;
  text: string;
  done: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onSelect?: () => void;
  isSelected?: boolean;
}

export function TaskItem({ id, text, done, onToggle, onDelete, onSelect, isSelected }: Props) {
  function handleDragStart(e: DragEvent) {
    e.dataTransfer.setData("taskId", id);
    e.dataTransfer.setData("taskText", text);
    e.dataTransfer.effectAllowed = "move";
  }

  return (
    <div
      className={`${styles.item} ${done ? styles.done : ""} ${isSelected ? styles.selected : ""}`}
      draggable
      onDragStart={handleDragStart}
      onClick={onSelect}
    >
      <div
        className={`${styles.checkbox} ${done ? styles.checked : ""}`}
        role="checkbox"
        aria-checked={done}
        aria-label={text}
        tabIndex={0}
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
      />
      <div className={styles.text}>{text}</div>
      <button className={styles.deleteBtn} onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Удалить">
        &times;
      </button>
    </div>
  );
}
