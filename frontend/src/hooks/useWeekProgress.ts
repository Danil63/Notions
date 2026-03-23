import { WEEK_CONFIG } from "../config/weekConfig";

export function useWeekProgress() {
  const now = new Date();
  const deadline = new Date(WEEK_CONFIG.deadline);
  const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / 86_400_000));
  const weeksLeft = Math.max(1, Math.ceil(daysLeft / 7));
  const topicsLeft = WEEK_CONFIG.topicsTotal - WEEK_CONFIG.topicsDone;
  const weeklyRate = Math.ceil(topicsLeft / weeksLeft);
  const percent = weeklyRate > 0
    ? Math.min(100, Math.round((WEEK_CONFIG.weeklyTopicsDone / weeklyRate) * 100))
    : 0;

  return { percent, done: WEEK_CONFIG.weeklyTopicsDone, goal: weeklyRate, weeksLeft, rate: weeklyRate };
}
