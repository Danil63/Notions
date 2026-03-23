export interface Task {
  id: string;
  text: string;
  done: boolean;
}

export interface CalendarEntry {
  taskId: string;
  taskText: string;
  hour: number;
  date: string;
}
