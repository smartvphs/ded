import React from 'react';
import {number} from './dashboard-data';
export function Money({value}) { return <span className="currency-amount"><img className="riyal-icon" src="/images/brand/riyal.png" alt="ريال سعودي"/>{number(value)}</span>; }
export function Empty({children = 'لا توجد بيانات خلال الفترة المحددة.'}) { return <p className="dashboard-empty">{children}</p>; }
export function ResourceState({resource, onLogin}) {
  if (resource.loading) return <p className="dashboard-state" role="status">جارٍ تحميل البيانات…</p>;
  if (!resource.error) return null;
  return <div className="dashboard-state dashboard-error" role="alert"><p>{resource.error.message}</p><button type="button" onClick={resource.error.status === 401 ? onLogin : resource.reload}>{resource.error.status === 401 ? 'تسجيل الدخول من جديد' : 'إعادة المحاولة'}</button></div>;
}
