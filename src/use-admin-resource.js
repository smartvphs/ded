import {useEffect, useState} from 'react';
import {adminRequest, ApiError} from './admin-api';
export default function useAdminResource(path, revision = 0) {
  const [state, setState] = useState({data: null, loading: true, error: null, path: null});
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!path) {setState({data: null, loading: false, error: null, path}); return;}
    const controller = new AbortController();
    setState({data: null, loading: true, error: null, path});
    adminRequest(path, {signal: controller.signal}).then(payload => {
      if (!payload.data || typeof payload.data !== 'object') throw new ApiError('لم يُرجع الخادم بيانات صالحة. حاول مرة أخرى.', 0);
      if (!controller.signal.aborted) setState({data: payload, loading: false, error: null, path});
    }).catch(error => {
      if (!controller.signal.aborted) setState({data: null, loading: false, error, path});
    });
    return () => controller.abort();
  }, [path, revision, retry]);
  return {...(!path ? {data: null, loading: false, error: null} : state.path === path ? state : {data: null, loading: true, error: null}), reload: () => setRetry(n => n + 1)};
}
