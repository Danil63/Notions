import styles from "./ProgressBar.module.css";

interface Props {
  percent: number;
}

export function ProgressBar({ percent }: Props) {
  return (
    <div className={styles.track}>
      <div className={styles.fill} style={{ width: `${percent}%` }} />
    </div>
  );
}
