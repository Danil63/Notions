import { WEEK_CONFIG } from './config.js';
import { getTasks, getTaskCounts, canAddTask, addTask, toggleTask, deleteTask } from './tasks.js';

export function renderTasks(onUpdate) {
  const container = document.getElementById('tasks-container');
  container.innerHTML = '';
  const tasks = getTasks();

  tasks.forEach((task, index) => {
    const item = document.createElement('div');
    item.className = 'task-item' + (task.done ? ' done' : '');

    const checkbox = document.createElement('div');
    checkbox.className = 'task-checkbox' + (task.done ? ' checked' : '');
    checkbox.setAttribute('role', 'checkbox');
    checkbox.setAttribute('aria-checked', task.done);
    checkbox.setAttribute('aria-label', task.text);
    checkbox.setAttribute('tabindex', '0');
    checkbox.addEventListener('click', () => { toggleTask(index); onUpdate(); });
    checkbox.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleTask(index); onUpdate(); }
    });

    const text = document.createElement('div');
    text.className = 'task-text';
    text.textContent = task.text;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'task-delete';
    deleteBtn.innerHTML = '&#215;';
    deleteBtn.title = 'Удалить';
    deleteBtn.addEventListener('click', () => { deleteTask(index); onUpdate(); });

    item.appendChild(checkbox);
    item.appendChild(text);
    item.appendChild(deleteBtn);
    container.appendChild(item);
  });

  if (canAddTask()) {
    const addBtn = document.createElement('button');
    addBtn.className = 'add-task-btn';
    addBtn.innerHTML = '<span class="plus-icon">+</span> Добавить задачу';

    const inputWrap = document.createElement('div');
    inputWrap.className = 'add-task-input-wrap';

    const input = document.createElement('input');
    input.className = 'add-task-input';
    input.type = 'text';
    input.placeholder = 'Название задачи...';
    input.maxLength = 100;

    addBtn.addEventListener('click', () => {
      addBtn.style.display = 'none';
      inputWrap.classList.add('visible');
      input.focus();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = input.value.trim();
        if (val) { input.value = ''; addTask(val); onUpdate(); }
      } else if (e.key === 'Escape') {
        inputWrap.classList.remove('visible');
        addBtn.style.display = '';
      }
    });

    input.addEventListener('blur', () => {
      setTimeout(() => {
        const val = input.value.trim();
        if (val) { addTask(val); onUpdate(); }
        else { inputWrap.classList.remove('visible'); addBtn.style.display = ''; }
      }, 150);
    });

    inputWrap.appendChild(input);
    container.appendChild(addBtn);
    container.appendChild(inputWrap);
  }
}

export function updateDayProgress() {
  const { total, done } = getTaskCounts();
  const percent = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  const allDone = total > 0 && done >= total;

  document.getElementById('day-topics-done').textContent = done;
  document.getElementById('day-topics-goal').textContent = total;
  document.getElementById('day-rate').textContent = total;
  document.getElementById('day-topics-fill').style.width = percent + '%';

  const topicsCard = document.getElementById('day-topics-card');
  if (done <= 1) topicsCard.style.background = 'var(--color-danger-bg)';
  else if (done === 2) topicsCard.style.background = 'var(--color-warning-bg)';
  else topicsCard.style.background = 'var(--color-success-muted-bg)';

  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const hoursCard = document.getElementById('day-hours-card');
  if (allDone) hoursCard.style.background = 'var(--color-success-muted-bg)';
  else if (h >= 9 && (h < 14 || (h === 14 && m === 0))) hoursCard.style.background = 'var(--color-success-bg)';
  else if (h >= 14 && (h < 19 || (h === 19 && m === 0))) hoursCard.style.background = 'var(--color-warning-bg)';
  else if (h >= 19) hoursCard.style.background = 'var(--color-danger-bg)';
  else hoursCard.style.background = 'var(--color-bg)';
}

export function updateWeekProgress() {
  const now = new Date();
  const deadline = new Date(WEEK_CONFIG.deadline);
  const daysLeft = Math.max(0, Math.ceil((deadline - now) / 86_400_000));
  const weeksLeft = Math.max(1, Math.ceil(daysLeft / 7));
  const topicsLeft = WEEK_CONFIG.topicsTotal - WEEK_CONFIG.topicsDone;
  const weeklyRate = Math.ceil(topicsLeft / weeksLeft);
  const weekDone = WEEK_CONFIG.weeklyTopicsDone;
  const percent = weeklyRate > 0 ? Math.min(100, Math.round((weekDone / weeklyRate) * 100)) : 0;

  document.getElementById('week-topics-fill').style.width = percent + '%';
  document.getElementById('week-topics-done').textContent = weekDone;
  document.getElementById('week-topics-goal').textContent = weeklyRate;
  document.getElementById('week-weeks-left').textContent = weeksLeft;
  document.getElementById('week-rate').textContent = weeklyRate;
}

export function updateTimer() {
  const now = new Date();
  const secsLeft = Math.max(0, 23 * 3600 + 59 * 60 + 59 - (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()));
  const h = Math.floor(secsLeft / 3600);
  const m = Math.floor((secsLeft % 3600) / 60);
  const s = secsLeft % 60;
  document.getElementById('day-hours-left').textContent = h + 'ч ' + m + 'м ' + s + 'с';
}
