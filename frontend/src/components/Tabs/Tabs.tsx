import styles from "./Tabs.module.css";

interface Props {
  tabs: string[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

export function Tabs({ tabs, activeIndex, onSelect }: Props) {
  return (
    <div className={styles.header}>
      <div className={styles.tabs}>
        {tabs.map((label, i) => (
          <button
            key={label}
            className={`${styles.tab} ${i === activeIndex ? styles.active : ""}`}
            onClick={() => onSelect(i)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
