import { useState, type KeyboardEvent } from "react";
import type { Tag } from "../../types/task";
import { TAG_COLORS } from "../../config/tagColors";
import styles from "./TagManager.module.css";

interface Props {
  tags: Tag[];
  onAddTag: (name: string, color: string) => void;
  onDeleteTag: (id: string) => void;
}

export function TagManager({ tags, onAddTag, onDeleteTag }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(TAG_COLORS[0]);
  const [open, setOpen] = useState(false);

  function handleSave(): void {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAddTag(trimmed, color);
    setName("");
    setColor(TAG_COLORS[0]);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className={styles.container}>
      <button className={styles.toggleBtn} onClick={() => setOpen((v) => !v)}>
        <span className={styles.toggleIcon}>{open ? "−" : "+"}</span>
        Теги
      </button>

      {open && (
        <div className={styles.panel}>
          <div className={styles.section}>
            <p className={styles.sectionLabel}>Новый тег</p>
            <div className={styles.form}>
              <div className={styles.palette}>
                {TAG_COLORS.map((c) => (
                  <button
                    key={c}
                    className={`${styles.dot} ${color === c ? styles.dotSelected : ""}`}
                    style={{ background: c }}
                    onClick={() => setColor(c)}
                    aria-label={c}
                  />
                ))}
              </div>
              <div className={styles.inputRow}>
                <input
                  className={styles.input}
                  value={name}
                  maxLength={15}
                  placeholder="Название"
                  autoFocus
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button
                  className={styles.addBtn}
                  onClick={handleSave}
                  disabled={!name.trim()}
                >
                  Добавить
                </button>
              </div>
            </div>
          </div>

          {tags.length > 0 && (
            <div className={styles.section}>
              <p className={styles.sectionLabel}>Созданные теги</p>
              <div className={styles.list}>
                {tags.map((tag) => (
                  <div key={tag.id} className={styles.tagRow}>
                    <span
                      className={styles.dot}
                      style={{ background: tag.color, flexShrink: 0 }}
                    />
                    <span className={styles.tagName}>{tag.name}</span>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => onDeleteTag(tag.id)}
                      aria-label="Удалить тег"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tags.length === 0 && (
            <p className={styles.empty}>Теги ещё не созданы</p>
          )}
        </div>
      )}
    </div>
  );
}
