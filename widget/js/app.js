import { reloadTasks } from './tasks.js';
import { renderTasks, updateDayProgress, updateWeekProgress, updateTimer } from './render.js';

function onTasksChanged() {
  renderTasks(onTasksChanged);
  updateDayProgress();
}

// Tabs
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
  });
});

// Tick — timer + progress + midnight reset
function tick() {
  updateTimer();
  updateDayProgress();

  const now = new Date();
  if (now.getHours() === 0 && now.getMinutes() === 0 && now.getSeconds() === 0) {
    reloadTasks();
    onTasksChanged();
  }
}

// Init
renderTasks(onTasksChanged);
updateDayProgress();
updateWeekProgress();
tick();
setInterval(tick, 1000);
