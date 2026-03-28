export interface Task {
  id: string;
  text: string;
  done: boolean;
  date: string;
  tag?: string;
  tagColor?: string;
}

export interface CalendarEntry {
  taskId: string;
  taskText: string;
  hour: number;
  duration: number;
  date: string;
  done: boolean;
  tag?: string;
  tagColor?: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}
