import { useState, useEffect, useRef, type DragEvent } from "react";
import type { Tag } from "../../types/task";
import { hexToRgba } from "../../utils/colors";
import styles from "./TaskList.module.css";

interface Props {
  id: string;
  text: string;
  done: boolean;
  tag?: string;
  tagColor?: string;
  tags: Tag[];
  onToggle: () => void;
  onDelete: () => void;
  onUpdateTag: (tag: string, tagColor: string) => void;
  onRemoveTag: () => void;
  onSelect?: () => void;
  isSelected?: boolean;
}

export function TaskItem({
  id,
  text,
  done,
  tag,
  tagColor,
  tags,
  onToggle,
  onDelete,
  onUpdateTag,
  onRemoveTag,
  onSelect,
  isSelected,
}: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPicker) return;
    function handleClickOutside(e: MouseEvent): void {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPicker]);

  function handleDragStart(e: DragEvent): void {
    e.dataTransfer.setData("taskId", id);
    e.dataTransfer.setData("taskText", text);
    e.dataTransfer.effectAllowed = "move";
    if (tag) e.dataTransfer.setData("taskTag", tag);
    if (tagColor) e.dataTransfer.setData("taskTagColor", tagColor);
  }

  function handleTagBtnClick(e: React.MouseEvent): void {
    e.stopPropagation();
    setShowPicker((v) => !v);
  }

  function handlePickTag(t: Tag): void {
    onUpdateTag(t.name, t.color);
    setShowPicker(false);
  }

  function handleRemoveTag(e: React.MouseEvent): void {
    e.stopPropagation();
    onRemoveTag();
    setShowPicker(false);
  }

  const cardStyle = tagColor ? { background: hexToRgba(tagColor, 0.1) } : undefined;

  return (
    <div
      className={`${styles.item} ${done ? styles.done : ""} ${isSelected ? styles.selected : ""}`}
      style={cardStyle}
      draggable
      onDragStart={handleDragStart}
      onClick={onSelect}
    >
      <div className={styles.itemTop}>
        <div
          className={`${styles.checkbox} ${done ? styles.checked : ""}`}
          role="checkbox"
          aria-checked={done}
          aria-label={text}
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggle();
            }
          }}
        />
        <div className={styles.text}>{text}</div>
        <button
          className={styles.deleteBtn}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Удалить"
        >
          &times;
        </button>
      </div>

      <div className={styles.tagArea} ref={pickerRef}>
        {tag ? (
          <span
            className={styles.tagBadge}
            style={{ background: tagColor }}
            onClick={handleTagBtnClick}
            title="Сменить тег"
          >
            {tag}
          </span>
        ) : (
          <button className={styles.tagAddBtn} onClick={handleTagBtnClick}>
            + тег
          </button>
        )}

        {showPicker && (
          <div className={styles.tagPicker} onClick={(e) => e.stopPropagation()}>
            {tags.length === 0 && (
              <div className={styles.tagPickerEmpty}>
                Нет тегов. Создай в «Управление тегами»
              </div>
            )}
            {tags.map((t) => (
              <div
                key={t.id}
                className={`${styles.tagPickerItem} ${t.name === tag ? styles.tagPickerItemActive : ""}`}
                onClick={() => handlePickTag(t)}
              >
                <span className={styles.tagPickerDot} style={{ background: t.color }} />
                {t.name}
              </div>
            ))}
            {tag && (
              <div className={styles.tagPickerRemove} onClick={handleRemoveTag}>
                ✕ Убрать тег
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
