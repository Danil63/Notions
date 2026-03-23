# Notions — To-Do List App

Full-stack приложение для трекинга задач и прогресса обучения (Hexlet).

## Цель проекта

Реализовать To-Do лист с расширенным набором инструментов: дневной/недельный прогресс, таймер до конца дня, цветовая индикация состояния, ежедневный авто-сброс задач.

## Стек

- **Frontend (React):** TypeScript + React 19 + Vite 8 + CSS Modules
- **Widget (standalone):** Vanilla HTML/CSS/JS (ES Modules)
- **Backend:** Python 3.12+ (директория `backend/`) — расчёт прогресса на основе данных из `data/`
- **Линтеры:** Ruff (Python), ESLint (TypeScript/React)
- **Пакетный менеджер:** npm (frontend), uv (Python)

## Структура проекта

```
Notions/
├── AGENT.md                 — описание проекта
├── main.py                  — точка входа Python
├── pyproject.toml           — Python-зависимости (ruff)
│
├── frontend/                — FRONTEND (React + TypeScript + Vite)
│   ├── src/
│   │   ├── main.tsx         — точка входа React
│   │   ├── App.tsx          — корневой компонент (табы, прогресс, задачи)
│   │   ├── App.module.css
│   │   ├── components/
│   │   │   ├── InfoCard/    — карточка метрики (значение + подпись + цвет фона)
│   │   │   │   ├── InfoCard.tsx, InfoCard.module.css, index.ts
│   │   │   ├── ProgressBar/ — прогресс-бар (процент заполнения)
│   │   │   │   ├── ProgressBar.tsx, ProgressBar.module.css, index.ts
│   │   │   ├── Tabs/        — переключатель вкладок (День / Неделя)
│   │   │   │   ├── Tabs.tsx, Tabs.module.css, index.ts
│   │   │   └── TaskList/    — список задач (toggle, delete, add; макс. 5)
│   │   │       ├── TaskList.tsx, TaskItem.tsx, AddTask.tsx
│   │   │       ├── TaskList.module.css, index.ts
│   │   ├── hooks/
│   │   │   ├── useTasks.ts          — CRUD задач + localStorage + авто-сброс по дате
│   │   │   ├── useTimer.ts          — обратный отсчёт до конца дня (каждую секунду)
│   │   │   └── useWeekProgress.ts   — расчёт прогресса по неделе
│   │   ├── config/
│   │   │   └── weekConfig.ts        — конфигурация недельных целей
│   │   ├── utils/
│   │   │   └── colors.ts            — логика выбора цвета карточек по состоянию
│   │   ├── types/
│   │   │   └── task.ts              — интерфейс Task { id, text, done }
│   │   └── styles/
│   │       └── variables.css        — CSS-переменные (дизайн-токены)
│   ├── index.html           — HTML-шаблон Vite
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── widget/                  — STANDALONE-виджет (vanilla HTML/CSS/JS)
│   ├── index.html           — чистая разметка (без инлайн-стилей и скриптов)
│   ├── css/
│   │   └── styles.css       — стили + CSS-переменные (дизайн-токены)
│   └── js/
│       ├── config.js        — константы (WEEK_CONFIG, MAX_TASKS, STORAGE_KEY)
│       ├── storage.js       — localStorage (load/save/daily reset)
│       ├── tasks.js         — CRUD задач + состояние
│       ├── render.js        — DOM-рендеринг (задачи, прогресс, таймер)
│       └── app.js           — точка входа: инициализация + табы + main loop
│
├── backend/                 — BACKEND (Python) — расчёт прогресса (TODO)
└── data/                    — JSON-файлы с данными задач для бекенда (TODO)
```

## Frontend (React): архитектура

### Компоненты (frontend/src/components/)

| Компонент      | Файлы                                    | Назначение                                    |
|----------------|------------------------------------------|-----------------------------------------------|
| `ProgressBar`  | ProgressBar.tsx + .module.css + index.ts  | Полоса прогресса, принимает `percent: number`  |
| `Tabs`         | Tabs.tsx + .module.css + index.ts         | Переключатель вкладок, принимает labels/index  |
| `InfoCard`     | InfoCard.tsx + .module.css + index.ts     | Карточка метрики с динамическим цветом фона    |
| `TaskList`     | TaskList.tsx, TaskItem.tsx, AddTask.tsx    | Список задач: toggle, delete, add (макс. 5)   |

### Хуки (frontend/src/hooks/)

| Хук                | Назначение                                                                |
|--------------------|---------------------------------------------------------------------------|
| `useTasks`         | CRUD задач через localStorage. Авто-сброс при смене дня. Лимит: 5 задач. |
| `useTimer`         | Строка "Xч Yм Zс" до конца дня. Обновляется каждую секунду.             |
| `useWeekProgress`  | Расчёт прогресса по неделе из `config/weekConfig.ts`.                    |

### Ключевые решения

- **CSS Modules** — изоляция стилей на уровне компонента, без конфликтов имён
- **CSS-переменные** (`styles/variables.css`) — единая палитра цветов (дизайн-токены), общая для всего проекта
- **Barrel exports** (`index.ts`) — чистый импорт: `import { TaskList } from "./components/TaskList"`
- **crypto.randomUUID()** — генерация ID задач без внешних зависимостей
- **useMemo** — мемоизация вычисляемых значений (`doneCount`)
- **a11y** — чекбоксы доступны с клавиатуры (`role`, `aria-checked`, `tabIndex`, `onKeyDown`)
- **Конфигурация** вынесена в `config/weekConfig.ts` — в будущем заменится на fetch с бекенда

## Widget (standalone): архитектура

Автономная версия без сборщика — открывается напрямую в браузере. Использует ES Modules (`type="module"`).

| Модуль       | Назначение                                           |
|--------------|------------------------------------------------------|
| `config.js`  | Константы: WEEK_CONFIG, MAX_TASKS, STORAGE_KEY       |
| `storage.js` | localStorage: загрузка, сохранение, авто-сброс       |
| `tasks.js`   | Состояние задач + CRUD (add, toggle, delete, reload)  |
| `render.js`  | Вся DOM-отрисовка: задачи, прогресс, таймер          |
| `app.js`     | Точка входа: табы, tick-цикл (1с), инициализация     |

## Команды

```bash
# Frontend — dev-сервер
cd frontend && npm run dev

# Frontend — продакшен-билд
cd frontend && npm run build

# Widget — открыть в браузере (без сборки)
open widget/index.html

# Python — линтер
uv run ruff check .

# TypeScript — линтер
cd frontend && npx eslint src/
```

## TODO

- [ ] Реализовать бекенд в `backend/` — API для расчёта прогресса
- [ ] Наполнить `data/` JSON-файлами с данными задач
- [ ] Подключить фронтенд к бекенду (fetch вместо хардкода WEEK_CONFIG)
