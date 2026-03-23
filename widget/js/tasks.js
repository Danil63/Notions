import { MAX_TASKS } from './config.js';
import { loadTasks, saveTasks } from './storage.js';

let tasks = loadTasks();

export function getTasks() {
  return tasks;
}

export function getTaskCounts() {
  const total = tasks.length;
  const done = tasks.filter(t => t.done).length;
  return { total, done };
}

export function canAddTask() {
  return tasks.length < MAX_TASKS;
}

export function addTask(text) {
  if (tasks.length >= MAX_TASKS) return;
  tasks.push({ text, done: false });
  saveTasks(tasks);
}

export function toggleTask(index) {
  tasks[index].done = !tasks[index].done;
  saveTasks(tasks);
}

export function deleteTask(index) {
  tasks.splice(index, 1);
  saveTasks(tasks);
}

export function reloadTasks() {
  tasks = loadTasks();
}
