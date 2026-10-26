import { useState, useEffect, useCallback, useRef } from "react";
import { subscribe } from "../data/store.js";

// Runs an async loader, stores the result, and re-runs it on:
//  - mount / when `deps` change
//  - any Supabase realtime change (via store.subscribe)
// Returns { data, loading, error, refresh }.
export function useAsyncData(loader, deps = [], initial = null) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const result = await loaderRef.current();
      if (mounted.current) {
        setData(result);
        setError(null);
      }
    } catch (e) {
      if (mounted.current) setError(e);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    refresh();
    const unsub = subscribe(() => refresh());
    return () => {
      mounted.current = false;
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refresh };
}
