import React, {useEffect, useState} from 'react';
import {Eye, Trash2, Check, X} from 'lucide-react';
import {adminRequest, queryString} from './admin-api';
import {getAuthSession} from './auth-api';
import {ordersQuery, number, orderStatuses, pricingStatuses} from './dashboard-data';
import {Money, Empty, ResourceState} from './dashboard-ui';
import useAdminResource from './use-admin-resource';

const views = {missing: 'طلبات تسعير تحتاج إضافة إلى قاعدة البيانات', suppliers: 'طلبات تسعير محولة للموردين', confirmed: 'طلبات تسعير تم تأكيدها من العملاء', latest: 'آخر الطلبات'};
const pricingTypes = {free: 'تسعير مجاني', normal: 'تسعير عادي', express: 'تسعير سريع', fast: 'تسعير سريع'};
const car = row => [row.make_name_ar || row.make_name_en, row.model_name_ar || row.model_name_en, row.year].filter(Boolean).join(' ') || '—';
const date = value => value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleDateString('ar-SA', {calendar: 'gregory', timeZone: 'Asia/Riyadh', year: 'numeric', month: 'short', day: 'numeric'}) : '—';
function Status({row, latest}) {return <span className={`order-status ${row.status === 'cancelled' || row.status === 'expired' ? 'needs-addition' : row.status === 'delivered' || row.status === 'closed' ? 'completed' : 'pricing'}`}><i/>{row.status_label || (latest ? orderStatuses[row.status] : pricingStatuses[row.status]) || row.status || '—'}</span>;}
function Timer({due, now}) {
  const time = Date.parse(due);
  if (!Number.isFinite(time)) return '—';
  const seconds = Math.max(0, Math.floor((time - now) / 1000));
  return <span className="remaining-time" dir="ltr">{seconds === 0 ? 'انتهت المدة' : `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor(seconds % 3600 / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`}</span>;
}
function Modal({title, onClose, busy, children}) {
  useEffect(() => {const handler = e => {if (e.key === 'Escape' && !busy) onClose();};document.addEventListener('keydown', handler);return () => document.removeEventListener('keydown', handler);}, [onClose, busy]);
  return <div className="modal-backdrop" onClick={() => !busy && onClose()}><div className="modal dashboard-modal" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}><button className="close" disabled={busy} aria-label="إغلاق" onClick={onClose}><X/></button><h2>{title}</h2>{children}</div></div>;
}
function Details({selected, onClose, onSessionExpired}) {
  const resource = useAdminResource((selected.latest ? '/api/orders/admin/' : '/api/pricing-requests/admin/') + encodeURIComponent(selected.row.id));
  const data = resource.data?.data;
  const items = (selected.latest ? data?.items : data?.parts) || [];
  return <Modal title={`تفاصيل ${selected.row.order_number || selected.row.request_number || 'الطلب'}`} onClose={onClose}><ResourceState resource={resource} onLogin={onSessionExpired}/>{data && <><dl className="dashboard-detail-grid"><div><dt>رقم الطلب</dt><dd>{data.order_number || data.request_number || '—'}</dd></div><div><dt>اسم العميل</dt><dd>{data.customer?.name || data.customer_name || '—'}</dd></div><div><dt>تاريخ الطلب</dt><dd>{date(data.created_at)}</dd></div><div><dt>الحالة</dt><dd><Status row={data} latest={selected.latest}/></dd></div>{selected.latest ? <><div><dt>قيمة الطلب</dt><dd><Money value={data.total}/></dd></div><div><dt>طريقة الدفع</dt><dd>{data.payment_method || '—'}</dd></div></> : <><div><dt>السيارة</dt><dd>{car(data)}</dd></div><div><dt>نوع التسعير</dt><dd>{pricingTypes[data.pricing_type] || data.pricing_type || '—'}</dd></div></>}</dl><h3>القطع والخدمات</h3>{items.length ? <ul className="dashboard-detail-items">{items.map(item => <li key={item.id}><b>{item.product_name || item.part_name || item.matched_product_name || '—'}</b><span>الكمية: {number(item.quantity)}</span>{selected.latest && <Money value={item.line_total}/>}</li>)}</ul> : <Empty>لا توجد قطع مسجلة.</Empty>}</>}</Modal>;
}
export default function DashboardOrders({partType, revision, onChanged, onSessionExpired}) {
  const [view, setView] = useState('missing');
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState(null);
  const [action, setAction] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(Date.now());
  const latest = view === 'latest';
  const retailOnly = ['used_part', 'accessory'].includes(partType);
  const request = ordersQuery(view, partType, offset);
  const resource = useAdminResource(retailOnly && !latest ? null : request.path + '?' + queryString(request.params), revision);
  const rows = Array.isArray(resource.data?.data) ? resource.data.data : [];
  const total = resource.data?.meta?.total;
  const permissions = getAuthSession()?.admin?.permissions;
  const canManage = getAuthSession()?.admin?.isSuperAdmin || !Array.isArray(permissions) || permissions.includes(latest ? 'orders.manage' : 'pricing.review');
  useEffect(() => {setOffset(0);setSelected(null);setAction(null);setNotice('');if (['used_part', 'accessory'].includes(partType)) setView('latest');}, [partType]);
  useEffect(() => {if (view !== 'suppliers') return;const timer = setInterval(() => setNow(Date.now()), 1000);return () => clearInterval(timer);}, [view]);
  const setMode = value => {setView(value);setOffset(0);setSelected(null);setAction(null);setNotice('');};
  const startAction = (row, type) => {setAction({row, type, latest});setActionError(null);setNotice('');};
  async function submitAction() {
    if (busy) return;
    setBusy(true);setActionError(null);
    try {
      const id = encodeURIComponent(action.row.id);
      const payload = await adminRequest(action.latest ? `/api/orders/${id}/status` : `/api/pricing-requests/admin/${id}/cancel`, {
        method: action.latest ? 'PATCH' : 'POST',
        body: action.latest ? {status: action.type === 'confirm' ? 'confirmed' : 'cancelled'} : {},
      });
      setNotice(action.type === 'confirm' ? 'تم تأكيد الطلب.' : `تم إلغاء الطلب.${payload.data?.refundRequired ? ' يلزم تنفيذ استرداد الرسوم بشكل منفصل.' : ''}`);
      setAction(null);setOffset(0);resource.reload();onChanged();
    } catch (error) {setActionError(error);} finally {setBusy(false);}
  }
  const columns = ['رقم الطلب', 'اسم العميل', 'تاريخ الطلب', ...(latest ? [] : ['السيارة']), 'عدد القطع', ...(latest || view === 'confirmed' ? ['قيمة الطلب', 'المورد'] : ['نوع التسعير']), ...(view === 'suppliers' ? ['المدة المتبقية'] : []), ...(partType === 'oil' && !latest ? ['نوع الزيت', 'اللزوجة'] : []), 'الحالة', 'الإجراءات'];
  return <section className="card orders">
    <div className="section-head"><h2>الطلبات</h2><select aria-label="حالة حاوية الطلبات" value={view} onChange={e => setMode(e.target.value)} disabled={busy}>{Object.entries(views).map(([key, label]) => <option key={key} value={key} disabled={retailOnly && key !== 'latest'}>{label}</option>)}</select></div>
    <ResourceState resource={resource} onLogin={onSessionExpired}/>
    {retailOnly && <p className="dashboard-caption">يعرض هذا القسم آخر طلبات الشراء.</p>}
    {notice && <p className="dashboard-notice" role="status">{notice}</p>}
    {!resource.loading && !resource.error && <><div className="table-scroll"><table className={`orders-table view-${view}`}><thead><tr>{columns.map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.id}>
      <td className="order-id">{row.order_number || row.request_number || '—'}</td><td>{row.customer_name || '—'}</td><td className="muted">{date(row.created_at)}</td>{!latest && <td>{car(row)}</td>}<td>{number(latest ? row.items_count : row.parts_count)}</td>
      {latest || view === 'confirmed' ? <><td><Money value={latest ? row.total : row.accepted_total}/></td><td>{latest ? row.suppliers?.map(s => s.name).filter(Boolean).join('، ') || '—' : row.accepted_supplier_name || row.accepted_supplier_names?.join('، ') || '—'}</td></> : <td><span className={`badge ${row.pricing_type === 'free' ? 'green' : 'red'}`}>{pricingTypes[row.pricing_type] || row.pricing_type || '—'}</span></td>}
      {view === 'suppliers' && <td><Timer due={row.sla_due_at} now={now}/></td>}{partType === 'oil' && !latest && <><td>{row.oil?.oil_type || '—'}</td><td>{row.oil?.viscosity || '—'}</td></>}
      <td><Status row={row} latest={latest}/></td><td><div className="actions"><button aria-label={`عرض الطلب ${row.order_number || row.request_number}`} onClick={() => setSelected({row, latest})}><Eye size={16}/></button>{canManage && latest && row.status === 'pending' && <button aria-label={`تأكيد الطلب ${row.order_number}`} onClick={() => startAction(row, 'confirm')}><Check size={16}/></button>}{canManage && (latest ? ['pending', 'confirmed', 'shipped'].includes(row.status) : !['closed', 'cancelled'].includes(row.status)) && <button aria-label={`إلغاء الطلب ${row.order_number || row.request_number}`} onClick={() => startAction(row, 'cancel')}><Trash2 size={16}/></button>}</div></td>
    </tr>)}</tbody></table></div>{!rows.length && <Empty>لا توجد طلبات مطابقة لهذا القسم والحالة.</Empty>}<div className="dashboard-pagination"><span>{total !== undefined ? `${number(total)} طلب` : ''}</span><button onClick={() => setOffset(n => Math.max(0, n - 5))} disabled={offset === 0}>السابق</button><span>صفحة {number(offset / 5 + 1)}</span><button onClick={() => setOffset(n => n + 5)} disabled={total !== undefined ? offset + rows.length >= total : rows.length < 5}>التالي</button></div></>}
    {selected && <Details key={`${selected.latest}:${selected.row.id}`} selected={selected} onClose={() => setSelected(null)} onSessionExpired={onSessionExpired}/>}
    {action && <Modal title={`${action.type === 'confirm' ? 'تأكيد' : 'إلغاء'} الطلب ${action.row.order_number || action.row.request_number}`} busy={busy} onClose={() => setAction(null)}><p>{action.type === 'confirm' ? 'سيتم تأكيد الطلب فعليًا على الخادم.' : 'سيتم إلغاء الطلب فعليًا وإشعار العميل. استرداد الرسوم أو المدفوعات، إن لزم، إجراء منفصل.'}</p>{actionError && <div className="dashboard-error" role="alert">{actionError.message}{actionError.status === 401 && <button onClick={onSessionExpired}>تسجيل الدخول من جديد</button>}</div>}<div className="delete-options"><button className={`primary ${action.type === 'cancel' ? 'danger' : ''}`} onClick={submitAction} disabled={busy}>{busy ? 'جارٍ الحفظ…' : action.type === 'confirm' ? 'تأكيد الطلب' : 'إلغاء الطلب'}</button><button onClick={() => setAction(null)} disabled={busy}>رجوع</button></div></Modal>}
  </section>;
}
