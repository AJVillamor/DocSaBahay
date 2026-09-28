'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * Returns a stable function that invokes `callback` `delayMs` after the last
 * call, cancelling any pending call each time it's called again (and on
 * unmount). Used for the note editor's autosave.
 *
 * Refs are only read/written inside effects and the returned callback
 * itself (never during render) — React Compiler forbids the latter.
 */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number,
): (...args: Args) => void {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  return useCallback(
    (...args: Args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => callbackRef.current(...args), delayMs);
    },
    [delayMs],
  );
}
