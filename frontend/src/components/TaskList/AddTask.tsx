import { useState } from "react";
import styles from "./TaskList.module.css";

interface Props {
  onAdd: (text: string) => void;
}

export function AddTask({ onAdd }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  function submit() {
    const trimmed = value.trim();
    if (trimmed) {
      onAdd(trimmed);
      setValue("");
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        className={styles.input}
        type="text"
        placeholder="Название задачи..."
        maxLength={100}
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") { setValue(""); setEditing(false); }
        }}
        onBlur={submit}
      />
    );
  }

  return (
    <button className={styles.addBtn} onClick={() => setEditing(true)}>
      <span className={styles.plusIcon}>+</span> Добавить задачу
    </button>
  );
}
