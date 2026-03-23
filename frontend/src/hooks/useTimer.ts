import { useState, useEffect } from "react";

export function useTimer() {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    function tick() {
      const now = new Date();
      const secsLeft =
        Math.max(0, 23 * 3600 + 59 * 60 + 59 - (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()));
      const h = Math.floor(secsLeft / 3600);
      const m = Math.floor((secsLeft % 3600) / 60);
      const s = secsLeft % 60;
      setTimeLeft(`${h}ч ${m}м ${s}с`);
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return timeLeft;
}
