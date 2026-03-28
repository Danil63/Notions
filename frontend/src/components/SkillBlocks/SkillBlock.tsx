import type { SkillBlock as SkillBlockData } from "../../hooks/useSkillBlocks";
import { hexToRgba } from "../../utils/colors";
import styles from "./SkillBlocks.module.css";

interface Props {
  skill: SkillBlockData;
}

export function SkillBlock({ skill }: Props) {
  const { tag, tagColor, total, done } = skill;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className={styles.block} style={{ borderColor: hexToRgba(tagColor, 0.25) }}>
      <div
        className={styles.fill}
        style={{ width: `${percent}%`, background: hexToRgba(tagColor, 0.5) }}
      />
      <div className={styles.content}>
        <span className={styles.blockTag}>
          {tag}
        </span>
        <span className={styles.blockPercent}>
          {percent}%
        </span>
      </div>
      <div className={styles.blockMeta}>
        {done} / {total} задач
      </div>
    </div>
  );
}
