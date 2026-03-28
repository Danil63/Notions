export interface Subtask {
  id: string;
  text: string;
  done: boolean;
}

export interface Task {
  id: string;
  text: string;
  done: boolean;
  date: string;
  tag?: string;
  tagColor?: string;
  subtasks?: Subtask[];
}

export interface CalendarEntry {
  taskId: string;
  taskText: string;
  startMinute: number;  // минуты от начала дня 0..1430 (100 = 1:40)
  duration: number;     // в минутах (60 = 1 час)
  date: string;
  done: boolean;
  tag?: string;
  tagColor?: string;
  subtasks?: Subtask[];
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}
