import { useEffect, useState } from "react";
import { catalogRows } from "./category-api";
export default function useCatalogRows(path, revision = 0) {
  const [retry, setRetry] = useState(0),
    [state, setState] = useState({
      data: null,
      loading: !!path,
      error: null,
      path: null,
    });
  useEffect(() => {
    if (!path) {
      setState({ data: null, loading: false, error: null, path });
      return;
    }
    const abort = new AbortController();
    setState({ data: null, loading: true, error: null, path });
    catalogRows(path, abort.signal)
      .then((data) => {
        if (!abort.signal.aborted)
          setState({ data, loading: false, error: null, path });
      })
      .catch((error) => {
        if (!abort.signal.aborted)
          setState({ data: null, loading: false, error, path });
      });
    return () => abort.abort();
  }, [path, revision, retry]);
  return {
    ...(state.path === path
      ? state
      : { data: null, loading: !!path, error: null }),
    reload: () => setRetry((n) => n + 1),
  };
}
