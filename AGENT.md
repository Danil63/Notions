# Notions — To-Do List App

Full-stack приложение для трекинга задач и прогресса обучения (Hexlet).

## Цель проекта

Реализовать To-Do лист с расширенным набором инструментов: дневной/недельный прогресс, таймер до конца дня, цветовая индикация состояния, ежедневный авто-сброс задач.

## Стек

- **Frontend:** TypeScript + React 19 + Vite 8 + CSS Modules
- **Backend:** Python 3.12+ (директория `backend/`) — расчёт прогресса на основе данных из `data/`
- **Линтеры:** Ruff (Python), ESLint (TypeScript/React)
- **Пакетный менеджер:** npm (frontend), uv (Python)

## Структура проекта

```
Notions/
├── AGENT.md                 — описание проекта
├── main.py                  — точка входа Python
├── pyproject.toml           — Python-зависимости (ruff)
├── frontend/                — FRONTEND (React + TypeScript + Vite)
│   ├── src/
│   │   ├── main.tsx         — точка входа React
│   │   ├── App.tsx          — корневой компонент (табы День/Неделя, прогресс, задачи)
│   │   ├── App.module.css
│   │   ├── components/
│   │   │   ├── InfoCard/    — карточка метрики (значение + подпись + цвет фона)
│   │   │   ├── ProgressBar/ — прогресс-бар (процент заполнения)
│   │   │   ├── Tabs/        — переключатель вкладок (День / Неделя)
│   │   │   └── TaskList/    — список задач (TaskList, TaskItem, AddTask)
│   │   ├── hooks/
│   │   │   ├── useTasks.ts  — CRUD задач + localStorage с авто-сбросом по дате
│   │   │   ├── useTimer.ts  — обратный отсчёт до конца дня (обновление каждую секунду)
│   │   │   └── useWeekProgress.ts — расчёт прогресса по неделе
│   │   ├── config/
│   │   │   └── weekConfig.ts — конфигурация недельных целей
│   │   ├── utils/
│   │   │   └── colors.ts    — логика выбора цвета карточек
│   │   ├── types/
│   │   │   └── task.ts      — интерфейс Task { id, text, done }
│   │   └── styles/
│   │       └── variables.css — CSS-переменные (дизайн-токены)
│   ├── index.html           — HTML-шаблон Vite
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── widget/                  — STANDALONE-виджет (vanilla HTML/CSS/JS)
│   ├── index.html           — разметка
│   ├── css/
│   │   └── styles.css       — стили + CSS-переменные
│   └── js/
│       ├── config.js        — константы (WEEK_CONFIG, MAX_TASKS)
│       ├── storage.js       — localStorage (load/save/daily reset)
│       ├── tasks.js         — CRUD задач + состояние
│       ├── render.js        — DOM-рендеринг (задачи, прогресс, таймер)
│       └── app.js           — инициализация + табы + main loop
├── backend/                 — BACKEND (Python) — расчёт прогресса
└── data/                    — JSON-файлы с данными задач для бекенда
```

## Frontend: архитектура

### Компоненты (frontend/src/components/)

| Компонент      | Файлы                                    | Назначение                                    |
|----------------|------------------------------------------|-----------------------------------------------|
| `ProgressBar`  | ProgressBar.tsx + .module.css + index.ts  | Полоса прогресса, принимает `percent: number`  |
| `Tabs`         | Tabs.tsx + .module.css + index.ts         | Переключатель вкладок, принимает labels/index  |
| `InfoCard`     | InfoCard.tsx + .module.css + index.ts     | Карточка метрики с динамическим цветом фона    |
| `TaskList`     | TaskList.tsx, TaskItem.tsx, AddTask.tsx    | Список задач: toggle, delete, add (макс. 5)   |

### Хуки (frontend/src/hooks/)

- **useTasks** — управление задачами через localStorage. Ежедневный авто-сброс: если дата в storage не совпадает с текущей — задачи обнуляются. Лимит: 5 задач.
- **useTimer** — возвращает строку "Xч Yм Zс" до конца дня. Обновляется каждую секунду через `setInterval`.
- **useWeekProgress** — расчёт прогресса по неделе на основе конфигурации из `config/weekConfig.ts`.

### Ключевые решения

- **CSS Modules** — изоляция стилей на уровне компонента, без конфликтов имён
- **CSS-переменные** (`styles/variables.css`) — единая палитра цветов (дизайн-токены)
- **Barrel exports** (`index.ts`) — чистый импорт: `import { TaskList } from "./components/TaskList"`
- **crypto.randomUUID()** — генерация ID задач без внешних зависимостей
- **Конфигурация недели** (`config/weekConfig.ts`) — в будущем будет приходить из бекенда (`backend/`)

## Команды

```bash
# Frontend — dev-сервер
cd frontend && npm run dev

# Frontend — продакшен-билд
cd frontend && npm run build

# Python — линтер
uv run ruff check .

# TypeScript — линтер
cd frontend && npx eslint src/
```

## TODO

- [ ] Реализовать бекенд в `backend/` — API для расчёта прогресса
- [ ] Наполнить `data/` JSON-файлами с данными задач
- [ ] Подключить фронтенд к бекенду (fetch вместо хардкода WEEK_CONFIG)
