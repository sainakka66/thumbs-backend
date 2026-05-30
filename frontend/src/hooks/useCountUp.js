import { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Animate a number from 0 to `target` over `duration` ms (ease-out).
 * Respects prefers-reduced-motion (jumps straight to the value).
 */
export function useCountUp(target = 0, duration = 800) {
  const [value, setValue] = useState(0);
  const frame = useRef(0);
  const startTs = useRef(0);

  useEffect(() => {
    const end = Number(target) || 0;
    if (prefersReducedMotion()) {
      setValue(end);
      return undefined;
    }
    cancelAnimationFrame(frame.current);
    startTs.current = 0;

    const tick = (ts) => {
      if (!startTs.current) startTs.current = ts;
      const progress = Math.min((ts - startTs.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setValue(end * eased);
      if (progress < 1) frame.current = requestAnimationFrame(tick);
      else setValue(end);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target, duration]);

  return value;
}
