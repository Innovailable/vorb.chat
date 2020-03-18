import { useRef, useEffect } from 'react';

export function useAnimationFrameLoop(cb: (time: number) => void) {
  const animation = useRef<number>();

  useEffect(() => {
    const requestAnimation = () => {
      animation.current = requestAnimationFrame(doAnimation);
    }

    const doAnimation = (time: number) => {
      try {
        cb(time);
      } finally {
        requestAnimation();
      }
    };

    requestAnimation();

    return () => {
      cancelAnimationFrame(animation.current!);
    };
  }, []);
}
