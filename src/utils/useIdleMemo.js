import { useEffect, useState } from "react";

export function useIdleMemo(factory, deps) {
  const [value, setValue] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const run = () => {
      if (!cancelled) {
        setValue(factory());
      }
    };

    if ("requestIdleCallback" in window) {
      const id = requestIdleCallback(run);
      return () => {
        cancelled = true;
        cancelIdleCallback(id);
      };
    } else {
      const id = setTimeout(run, 0);
      return () => {
        cancelled = true;
        clearTimeout(id);
      };
    }
  }, deps);

  return value;
}
