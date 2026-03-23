import styles from "./InfoCard.module.css";

interface Props {
  value: string;
  label: string;
  bgColor?: string;
}

export function InfoCard({ value, label, bgColor }: Props) {
  return (
    <div className={styles.card} style={bgColor ? { background: bgColor } : undefined}>
      <div className={styles.value}>{value}</div>
      <div className={styles.label}>{label}</div>
    </div>
  );
}
