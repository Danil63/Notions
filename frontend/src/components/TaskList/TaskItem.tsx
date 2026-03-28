import { useState, useEffect, useRef, type DragEvent } from "react";
import type { Tag, Subtask } from "../../types/task";
import { hexToRgba } from "../../utils/colors";
import styles from "./TaskList.module.css";

interface Props {
  id: string;
  text: string;
  done: boolean;
  tag?: string;
  tagColor?: string;
  tags: Tag[];
  subtasks?: Subtask[];
  onToggle: () => void;
  onDelete: () => void;
  onRename: (newText: string) => void;
  onUpdateTag: (tag: string, tagColor: string) => void;
  onRemoveTag: () => void;
  onAddSubtask: (text: string) => void;
  onToggleSubtask: (subtaskId: string) => void;
  onDeleteSubtask: (subtaskId: string) => void;
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
  subtasks,
  onToggle,
  onDelete,
  onRename,
  onUpdateTag,
  onRemoveTag,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onSelect,
  isSelected,
}: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [newSubtask, setNewSubtask] = useState('');
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const progress = subtasks && subtasks.length > 0
    ? subtasks.filter(s => s.done).length / subtasks.length
    : 0;

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

  useEffect(() => {
    if (editing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editing]);

  function handleStartEdit(e: React.MouseEvent): void {
    e.stopPropagation();
    setEditValue(text);
    setEditing(true);
  }

  function handleEditCommit(): void {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== text) onRename(trimmed);
    setEditing(false);
  }

  function handleEditKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter') { e.preventDefault(); handleEditCommit(); }
    if (e.key === 'Escape') { setEditing(false); }
  }

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

  function handleAddSubtask(e: React.FormEvent): void {
    e.preventDefault();
    const t = newSubtask.trim();
    if (!t) return;
    onAddSubtask(t);
    setNewSubtask('');
  }

  const cardStyle = tagColor ? { background: hexToRgba(tagColor, 0.1) } : undefined;

  return (
    <div className={styles.itemWrapper}>
      <div
        className={`${styles.item} ${done ? styles.done : ""} ${isSelected ? styles.selected : ""}`}
        style={cardStyle}
        draggable={!editing}
        onDragStart={editing ? undefined : handleDragStart}
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
          {editing ? (
            <input
              ref={editInputRef}
              className={styles.editInput}
              value={editValue}
              maxLength={80}
              onChange={e => setEditValue(e.target.value)}
              onBlur={handleEditCommit}
              onKeyDown={handleEditKeyDown}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <div className={styles.text} onDoubleClick={handleStartEdit}>{text}</div>
          )}
          <button
            className={`${styles.expandBtn} ${expanded ? styles.expandBtnOpen : ''}`}
            onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
            aria-label="Подзадачи"
          >›</button>
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

        {subtasks && subtasks.length > 0 && (
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{
                width: `${progress * 100}%`,
                background: tagColor ? hexToRgba(tagColor, 0.45) : 'rgba(52,199,89,0.45)'
              }}
            />
          </div>
        )}

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

      {expanded && (
        <div className={styles.subtaskPanel}>
          {subtasks?.map(s => (
            <div key={s.id} className={styles.subtaskRow}>
              <div
                className={`${styles.subtaskCheck} ${s.done ? styles.subtaskChecked : ''}`}
                onClick={() => onToggleSubtask(s.id)}
              />
              <span className={`${styles.subtaskText} ${s.done ? styles.subtaskDone : ''}`}>
                {s.text}
              </span>
              <button className={styles.subtaskDelete} onClick={() => onDeleteSubtask(s.id)}>×</button>
            </div>
          ))}
          {(!subtasks || subtasks.length < 3) && (
            <form className={styles.subtaskForm} onSubmit={handleAddSubtask}>
              <input
                className={styles.subtaskInput}
                value={newSubtask}
                onChange={e => setNewSubtask(e.target.value)}
                placeholder="Подзадача..."
                maxLength={40}
                onKeyDown={e => { if (e.key === 'Escape') setExpanded(false); }}
              />
              <button type="submit" className={styles.subtaskAddBtn} disabled={!newSubtask.trim()}>+</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
