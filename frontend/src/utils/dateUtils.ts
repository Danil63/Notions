const RU_MONTHS: readonly string[] = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

/** Месяцы в именительном падеже */
export const RU_MONTHS_NOM: readonly string[] = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

const RU_WEEKDAYS: readonly string[] = [
  "Воскресенье", "Понедельник", "Вторник", "Среда",
  "Четверг", "Пятница", "Суббота",
];

/** Буква дня недели (Пн → "П", Вт → "В", Ср → "С", Чт → "Ч", Пт → "П", Сб → "С", Вс → "В") */
const RU_DAY_LETTERS: readonly string[] = ["В", "П", "В", "С", "Ч", "П", "С"];

/** Короткое название дня недели: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"] */
export const RU_WEEKDAYS_SHORT: readonly string[] = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

/** "2026-03-28" формат */
export function getTodayKey(): string {
  const d = new Date();
  return formatDateKey(d);
}

/** "2026-03-28" -> Date (полночь по локальному времени) */
export function parseDate(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Date -> "2026-03-28" */
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "2026-03-28" -> "Суббота — 28 марта 2026 г." */
export function formatFullDate(dateKey: string): string {
  const date = parseDate(dateKey);
  const weekday = RU_WEEKDAYS[date.getDay()];
  const day = date.getDate();
  const month = RU_MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${weekday} — ${day} ${month} ${year} г.`;
}

/** Возвращает 7 dateKey для недели содержащей дату (Пн-Вс) */
export function getWeekDays(dateKey: string): string[] {
  const date = parseDate(dateKey);
  const dow = date.getDay(); // 0=Вс, 1=Пн ... 6=Сб
  // Смещение до понедельника: Пн=0, Вт=1, ..., Вс=6
  const offsetToMonday = (dow + 6) % 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() - offsetToMonday);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return formatDateKey(d);
  });
}

/** Добавить/вычесть дни */
export function addDays(dateKey: string, days: number): string {
  const date = parseDate(dateKey);
  date.setDate(date.getDate() + days);
  return formatDateKey(date);
}

/** "2026-03-28" -> "С" (буква дня недели) */
export function getDayLetter(dateKey: string): string {
  const date = parseDate(dateKey);
  return RU_DAY_LETTERS[date.getDay()];
}

/** "2026-03-28" -> 28 */
export function getDayNumber(dateKey: string): number {
  return parseDate(dateKey).getDate();
}

/** "2026-03-28" -> "Пн" (короткое название дня недели) */
export function getWeekdayShort(dateKey: string): string {
  const date = parseDate(dateKey);
  return RU_WEEKDAYS_SHORT[date.getDay()];
}

/** Заголовок месяца для заданного набора дней недели.
 * Все дни в одном месяце: "Март 2026 г."
 * В двух месяцах одного года: "Март – Апрель 2026 г."
 * В разных годах: "Декабрь 2025 – Январь 2026 г."
 */
export function formatWeekHeader(weekDays: string[]): string {
  if (weekDays.length === 0) return "";
  const first = parseDate(weekDays[0]);
  const last = parseDate(weekDays[weekDays.length - 1]);
  const firstMonth = first.getMonth();
  const lastMonth = last.getMonth();
  const firstYear = first.getFullYear();
  const lastYear = last.getFullYear();

  if (firstYear === lastYear && firstMonth === lastMonth) {
    return `${RU_MONTHS_NOM[firstMonth]} ${firstYear} г.`;
  }
  if (firstYear === lastYear) {
    return `${RU_MONTHS_NOM[firstMonth]} – ${RU_MONTHS_NOM[lastMonth]} ${lastYear} г.`;
  }
  return `${RU_MONTHS_NOM[firstMonth]} ${firstYear} – ${RU_MONTHS_NOM[lastMonth]} ${lastYear} г.`;
}
