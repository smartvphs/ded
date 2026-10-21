import {useEffect, useState} from 'react';
import {supplierOptions} from './order-list-api';
export default function useOrderSuppliers(enabled, approvalStatus) {
  const [state, setState] = useState({data: null, error: null, loading: true});
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setState({data: null, error: null, loading: true});
    supplierOptions(controller.signal, {approvalStatus}).then(data => {if (!controller.signal.aborted) setState({data, error: null, loading: false});})
      .catch(error => {if (!controller.signal.aborted) setState({data: null, error, loading: false});});
    return () => controller.abort();
  }, [enabled, approvalStatus, revision]);
  return {...state, reload: () => setRevision(n => n + 1)};
}
