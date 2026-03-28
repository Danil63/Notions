export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getTopicsCardColor(done: number): string {
  if (done <= 1) return "var(--color-danger-bg)";
  if (done === 2) return "var(--color-warning-bg)";
  return "var(--color-success-muted-bg)";
}

export function getHoursCardColor(allDone: boolean): string {
  if (allDone) return "var(--color-success-muted-bg)";
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  if (h >= 9 && (h < 14 || (h === 14 && m === 0))) return "var(--color-success-bg)";
  if (h >= 14 && (h < 19 || (h === 19 && m === 0))) return "var(--color-warning-bg)";
  if (h >= 19) return "var(--color-danger-bg)";
  return "var(--color-bg)";
}
