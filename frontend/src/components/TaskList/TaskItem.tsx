import styles from "./TaskList.module.css";

interface Props {
  text: string;
  done: boolean;
  onToggle: () => void;
  onDelete: () => void;
}

export function TaskItem({ text, done, onToggle, onDelete }: Props) {
  return (
    <div className={`${styles.item} ${done ? styles.done : ""}`}>
      <div
        className={`${styles.checkbox} ${done ? styles.checked : ""}`}
        role="checkbox"
        aria-checked={done}
        aria-label={text}
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
      />
      <div className={styles.text}>{text}</div>
      <button className={styles.deleteBtn} onClick={onDelete} title="Удалить">
        &times;
      </button>
    </div>
  );
}
