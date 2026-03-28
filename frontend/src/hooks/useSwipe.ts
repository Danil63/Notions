import { useRef, useCallback } from "react";
import type { TouchEvent } from "react";

const SWIPE_THRESHOLD = 50;

export function useSwipe(
  onSwipeLeft: () => void,
  onSwipeRight: () => void
) {
  const startXRef = useRef<number>(0);
  const startYRef = useRef<number>(0);

  const onTouchStart = useCallback((e: TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-resize-handle]")) return;
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
  }, []);

  const onTouchMove = useCallback(() => {
    // отслеживаем движение для предотвращения ложных свайпов
  }, []);

  const onTouchEnd = useCallback((e: TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-resize-handle]")) return;

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = endX - startXRef.current;
    const deltaY = endY - startYRef.current;

    if (Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        onSwipeLeft();
      } else {
        onSwipeRight();
      }
    }
  }, [onSwipeLeft, onSwipeRight]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}
