import {API_BASE_URL, getAuthSession, setAuthSession, clearAuthSession, readStoredSession} from './auth-api';

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

async function send(path, {method = 'GET', body, signal, token} = {}) {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), 20000);
  try {
    const response = await fetch(API_BASE_URL + path, {
      method, credentials: 'omit',
      headers: {Accept: 'application/json', ...(body ? {'Content-Type': 'application/json'} : {}), ...(token ? {Authorization: `Bearer ${token}`} : {})},
      ...(body ? {body: JSON.stringify(body)} : {}),
      signal: signal ? AbortSignal.any([signal, timeout.signal]) : timeout.signal,
    });
    let payload;
    try { payload = await response.json(); } catch { throw new ApiError('رد الخادم غير متوقع. حاول مرة أخرى.', response.status); }
    if (!payload || typeof payload !== 'object') throw new ApiError('رد الخادم غير متوقع. حاول مرة أخرى.', response.status);
    if (!response.ok || payload.success === false) {
      const message = response.status === 401 ? 'انتهت جلسة الدخول. سجّل الدخول من جديد.'
        : response.status === 403 ? 'ليس لديك صلاحية لعرض هذه البيانات أو تنفيذ الإجراء.'
        : (typeof payload.message === 'string' ? payload.message : 'تعذر تحميل البيانات. حاول مرة أخرى.');
      throw new ApiError(message, response.status);
    }
    return payload;
  } catch (error) {
    if (signal?.aborted) throw error;
    if (timeout.signal.aborted) throw new ApiError('انتهت مهلة الاتصال بالخادم. حاول مرة أخرى.', 0);
    if (error instanceof TypeError) throw new ApiError('تعذر الاتصال بالخادم. تحقق من الشبكة وإعدادات CORS.', 0);
    throw error;
  } finally { clearTimeout(timer); }
}

const sameSession = (left, right) => Boolean(left && right && left.accessToken === right.accessToken && left.refreshToken === right.refreshToken);
let refreshing = null;
async function refresh(session) {
  if (!refreshing) {
    const rotate = async () => {
      if (!sameSession(getAuthSession(), session)) return;
      const stored = readStoredSession();
      // Another tab may have rotated this token while this tab waited for the lock.
      if (stored?.refreshToken && stored.refreshToken !== session.refreshToken) {
        setAuthSession(stored);
        return;
      }
      const {data} = await send('/api/admin/refresh', {method: 'POST', body: {refreshToken: session.refreshToken}});
      if (!data?.accessToken || !data?.refreshToken) throw new ApiError('تعذر تجديد الجلسة. سجّل الدخول من جديد.', 401);
      if (sameSession(getAuthSession(), session)) setAuthSession({...session, accessToken: data.accessToken, refreshToken: data.refreshToken, admin: data.user || session.admin});
    };
    refreshing = (globalThis.navigator?.locks ? navigator.locks.request('mypart.admin.refresh', rotate) : rotate())
      .catch(error => {
        if ([401, 403].includes(error.status) && sameSession(getAuthSession(), session)) clearAuthSession();
        throw error;
      }).finally(() => { refreshing = null; });
  }
  return refreshing;
}

export async function adminRequest(path, options = {}) {
  const session = getAuthSession();
  if (!session?.accessToken) throw new ApiError('سجّل الدخول من جديد للوصول إلى بيانات لوحة التحكم.', 401);
  try { return await send(path, {...options, token: session.accessToken}); }
  catch (error) {
    if (error.status !== 401 || !session.refreshToken || options.signal?.aborted) throw error;
    if (sameSession(getAuthSession(), session)) await refresh(session);
    if (!getAuthSession()?.accessToken) throw error;
    return send(path, {...options, token: getAuthSession().accessToken});
  }
}

export function queryString(values) {
  return new URLSearchParams(Object.entries(values).filter(([, value]) => value !== undefined && value !== null && value !== '')).toString();
}
