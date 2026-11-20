import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "./api";

export function useApi(path) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const data = await api.get(path);
      if (id === requestId.current) {
        setState({ data, loading: false, error: null });
      }
      return data;
    } catch (error) {
      if (id === requestId.current) {
        setState({ data: null, loading: false, error });
      }
      return null;
    }
  }, [path]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
