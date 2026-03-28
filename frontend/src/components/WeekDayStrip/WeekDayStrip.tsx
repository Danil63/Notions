import { useMemo } from "react";
import {
  getWeekDays,
  getDayLetter,
  getDayNumber,
  formatFullDate,
} from "../../utils/dateUtils";
import styles from "./WeekDayStrip.module.css";

interface Props {
  selectedDate: string;
  today: string;
  onSelectDate: (date: string) => void;
  minDate: string;
  maxDate: string;
}

export function WeekDayStrip({
  selectedDate,
  today,
  onSelectDate,
  minDate,
  maxDate,
}: Props) {
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const fullDateLabel = useMemo(() => formatFullDate(selectedDate), [selectedDate]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.strip}>
        {weekDays.map((dateKey) => {
          const isToday = dateKey === today;
          const isSelected = dateKey === selectedDate;
          const isDisabled = dateKey < minDate || dateKey > maxDate;
          const letter = getDayLetter(dateKey);
          const number = getDayNumber(dateKey);

          const numberClasses = [
            styles.number,
            isToday ? styles.today : "",
            isSelected && !isToday ? styles.selected : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              key={dateKey}
              className={`${styles.day} ${isDisabled ? styles.disabled : ""}`}
              onClick={() => !isDisabled && onSelectDate(dateKey)}
              disabled={isDisabled}
              aria-label={formatFullDate(dateKey)}
              aria-pressed={isSelected}
            >
              <span className={styles.letter}>{letter}</span>
              <span className={numberClasses}>{number}</span>
            </button>
          );
        })}
      </div>
      <div className={styles.fullDate}>{fullDateLabel}</div>
    </div>
  );
}
