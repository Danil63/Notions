import type { SkillBlock as SkillBlockData } from "../../hooks/useSkillBlocks";
import { SkillBlock } from "./SkillBlock";
import styles from "./SkillBlocks.module.css";

interface Props {
  skills: SkillBlockData[];
}

export function SkillBlocks({ skills }: Props) {
  if (skills.length === 0) return null;

  return (
    <div className={styles.container}>
      {skills.map((skill) => (
        <SkillBlock key={`${skill.tag}::${skill.tagColor}`} skill={skill} />
      ))}
    </div>
  );
}
