import { useState, useEffect } from "react";

export function usePromiseResult<T>(promise: Promise<T> | undefined): T | undefined {
  const [result, setResult] = useState<T>();

  useEffect(() => {
    setResult(undefined);

    if(promise == null) {
      return;
    }

    let cancelled = false;

    promise.then((data) => {
      if(cancelled) {
        return;
      }

      setResult(data);
    });

    return () => {
      cancelled = true;
    };
  }, [promise]);

  return result;
};
