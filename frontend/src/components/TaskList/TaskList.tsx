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
}

export function TaskList({ tasks, canAdd, onToggle, onDelete, onAdd }: Props) {
  return (
    <div className={styles.container}>
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          id={task.id}
          text={task.text}
          done={task.done}
          onToggle={() => onToggle(task.id)}
          onDelete={() => onDelete(task.id)}
        />
      ))}
      {canAdd && <AddTask onAdd={onAdd} />}
    </div>
  );
}
