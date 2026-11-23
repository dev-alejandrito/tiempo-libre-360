import { useCallback, useEffect, useState } from "react";
import { api, pb } from "./pb";

// Loads data from one of the platform endpoints.
export function useApi(path, query) {
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  const key = path + JSON.stringify(query || {});
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!path) return;
    const c = new AbortController();
    setState((s) => ({ ...s, loading: true, error: "" }));
    api(path, { query, signal: c.signal })
      .then((data) => setState({ data, loading: false, error: "" }))
      .catch((e) => { if (!c.signal.aborted && !e.isAbort) setState({ data: null, loading: false, error: e.message }); });
    return () => c.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}

// Loads records from a stored list.
export function useList(collection, { page = 1, perPage = 50, filter = "", sort = "-created", expand = "" } = {}, deps = []) {
  const [state, setState] = useState({ items: [], total: 0, loading: true, error: "" });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    setState((s) => ({ ...s, loading: true }));
    pb.collection(collection).getList(page, perPage, { filter, sort, expand: expand || undefined, signal: c.signal, requestKey: null })
      .then((r) => setState({ items: r.items, total: r.totalItems, loading: false, error: "" }))
      .catch((e) => { if (!c.signal.aborted && !e?.isAbort) setState({ items: [], total: 0, loading: false, error: e?.message || "Error" }); });
    return () => c.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection, page, perPage, filter, sort, expand, tick, ...deps]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
