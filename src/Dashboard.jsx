import React, {useState} from 'react';
import {Package, Coins, Users, UserRound, Building2, Clock, RefreshCw} from 'lucide-react';
import {getAuthSession} from './auth-api';
import {queryString} from './admin-api';
import useAdminResource from './use-admin-resource';
import {number, asNumber, periodQuery, chartRows, monthlyPricing, orderStatuses} from './dashboard-data';
import DashboardOrders from './DashboardOrders';
import {Money, Empty, ResourceState} from './dashboard-ui';
import './dashboard.css';

function Period({value, onChange, label}) { return <select aria-label={label} value={value} onChange={e => onChange(e.target.value)}><option value="month">شهري</option><option value="week">أسبوعي</option><option value="year">سنوي</option></select>; }
function Head({children, period, setPeriod, label}) { return <div className="section-head"><h2>{children}</h2>{setPeriod && <Period value={period} onChange={setPeriod} label={label}/>}</div>; }
function Legend({items}) { return <div className="legend">{items.map(([label, color]) => <span key={label}><i style={{background: color}}/>{label}</span>)}</div>; }
function tickLabel(period, groupBy) {
  const date = new Date(`${period}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? period : date.toLocaleDateString('ar-SA', {calendar: 'gregory', timeZone: 'UTC', month: 'short', ...(groupBy === 'month' ? {year: '2-digit'} : {day: 'numeric'})});
}
const lineSeries = [['netRevenue', 'الإيرادات (ر.س)', '#195bea'], ['ordersCount', 'الطلبات', '#ff9b39'], ['newRequests', 'طلبات تسعير جديدة', '#8139ef'], ['quotedRequests', 'طلبات تم تسعيرها', '#ffa4a4'], ['confirmedRequests', 'تسعيرات مؤكدة', '#25c946']];
function TrendChart({data}) {
  const rows = chartRows(data);
  if (!rows.length) return <Empty/>;
  const moneyMax = Math.max(1, ...rows.map(r => asNumber(r.netRevenue)));
  const countMax = Math.max(1, ...rows.flatMap(r => lineSeries.slice(1).map(([key]) => asNumber(r[key]))));
  const x = i => rows.length === 1 ? 355 : 60 + i * 580 / (rows.length - 1);
  const y = (value, max) => 275 - asNumber(value) * 220 / max;
  return <><svg className="line-chart dashboard-chart" viewBox="0 0 710 335" role="img" aria-label="الإيرادات على المحور الأيسر وأعداد الطلبات والتسعيرات على المحور الأيمن">
    <text x="55" y="18" fontSize="11" fill="#8292af">ر.س</text><text x="640" y="18" fontSize="11" fill="#8292af">عدد</text>
    {[0, 1, 2, 3, 4].map(i => <g key={i}><line x1="60" x2="640" y1={55 + i * 55} y2={55 + i * 55} stroke="#eef2f8"/><text x="50" y={59 + i * 55} textAnchor="end" fontSize="10" fill="#8292af">{number(moneyMax * (4 - i) / 4)}</text><text x="652" y={59 + i * 55} fontSize="10" fill="#8292af">{number(countMax * (4 - i) / 4)}</text></g>)}
    {lineSeries.map(([key, label, color], index) => <g key={key}><polyline points={rows.map((row, i) => `${x(i)},${y(row[key], index ? countMax : moneyMax)}`).join(' ')} fill="none" stroke={color} strokeWidth="2"/>{rows.map((row, i) => <circle key={row.period} cx={x(i)} cy={y(row[key], index ? countMax : moneyMax)} r="3" fill={color}><title>{row.period} · {label}: {number(row[key])}</title></circle>)}</g>)}
    {rows.filter((_, i) => i % Math.max(1, Math.ceil(rows.length / 6)) === 0 || i === rows.length - 1).map(row => <text key={row.period} x={x(rows.indexOf(row))} y="310" textAnchor="middle" fontSize="10" fill="#8292af">{tickLabel(row.period, data.salesTrend?.groupBy)}</text>)}
  </svg><Legend items={lineSeries.map(([, label, color]) => [label, color])}/></>;
}
const statusColors = ['#195be8', '#4d97fa', '#8abaff', '#25a845', '#ff9b39'];
function Distribution({data}) {
  const rows = Object.entries(orderStatuses).map(([key, label], index) => ({key, label, color: statusColors[index], count: asNumber(data.ordersByStatus?.[key])}));
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  if (!total) return <Empty>لا توجد طلبات خلال الفترة المحددة.</Empty>;
  let offset = 0;
  return <><div className="donut"><svg viewBox="0 0 240 240" role="img" aria-label={`توزيع ${number(total)} طلب حسب الحالة`}><g transform="rotate(-90 120 120)">{rows.map(row => {
    const length = row.count / total * 100; const start = offset; offset += length;
    return <circle key={row.key} cx="120" cy="120" r="82" fill="none" stroke={row.color} strokeWidth="36" pathLength="100" strokeDasharray={`${length} ${100 - length}`} strokeDashoffset={-start}><title>{row.label}: {number(row.count)}</title></circle>;
  })}</g></svg><div><b>{number(total)}</b><span>طلب</span></div></div><div className="donut-legend"><Legend items={rows.map(r => [`${r.label}: ${number(r.count)} (${number(r.count / total * 100)}%)`, r.color])}/></div></>;
}
function PricingBars({data}) {
  const rows = monthlyPricing(data.pricingTrend?.series);
  if (!rows.length) return <Empty/>;
  const series = [['newRequests', 'طلبات جديدة', '#195bea'], ['quotedRequests', 'تم تسعيرها', '#8139ef'], ['confirmedRequests', 'مؤكدة', '#24a23c']];
  const max = Math.max(1, ...rows.flatMap(r => series.map(([key]) => asNumber(r[key]))));
  const width = 530 / rows.length; const bar = Math.min(15, width / 5);
  return <><svg className="bar-chart dashboard-chart" viewBox="0 0 600 390" role="img" aria-label="أعداد طلبات التسعير الشهرية">
    {[0, 1, 2, 3, 4].map(i => <g key={i}><line x1="45" x2="585" y1={30 + i * 75} y2={30 + i * 75} stroke="#eef2f8"/><text x="35" y={34 + i * 75} textAnchor="end" fontSize="11" fill="#8292af">{number(max * (4 - i) / 4)}</text></g>)}
    {rows.map((row, i) => <g key={row.period}>{series.map(([key, label, color], j) => <rect key={key} x={50 + width * i + width / 2 + (j - 1.5) * bar} y={330 - asNumber(row[key]) / max * 300} width={bar - 1} height={asNumber(row[key]) / max * 300} rx="2" fill={color}><title>{row.period} · {label}: {number(row[key])}</title></rect>)}<text x={50 + width * (i + .5)} y="365" textAnchor="middle" fontSize="10" fill="#8292af">{tickLabel(row.period, 'month')}</text></g>)}
  </svg><Legend items={series.map(([, label, color]) => [label, color])}/></>;
}
function Photo({src, name, className}) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? <img className={className} src={src} alt={name || ''} onError={() => setFailed(true)}/> : <span className={className}>{name?.[0] || '—'}</span>;
}
function relativeTime(value, serverTime) {
  const at = Date.parse(value); const now = Date.parse(serverTime);
  if (!Number.isFinite(at)) return '—';
  const seconds = Math.max(0, ((Number.isFinite(now) ? now : Date.now()) - at) / 1000);
  const unit = seconds >= 86400 ? 'day' : seconds >= 3600 ? 'hour' : 'minute';
  return new Intl.RelativeTimeFormat('ar', {numeric: 'auto'}).format(-Math.floor(seconds / ({day: 86400, hour: 3600, minute: 60}[unit])), unit);
}
export default function Dashboard({onSessionExpired}) {
  const [period, setPeriod] = useState('month');
  const [partType, setPartType] = useState('');
  const [revision, setRevision] = useState(0);
  const query = periodQuery(period);
  const resource = useAdminResource('/api/admin/dashboard?' + queryString(query), revision);
  const data = resource.data?.data;
  const banner = data?.banner;
  const admin = getAuthSession()?.admin;
  const stats = data ? [
    [data.sales?.grossSales, 'إجمالي المبيعات', 'sales', 'blue', true],
    [Object.values(data.ordersByStatus || {}).reduce((sum, n) => sum + asNumber(n), 0), 'عدد الطلبات', 'orders', 'purple'],
    [data.pricing?.quoted, 'طلبات تم تسعيرها', 'priced', 'pink'],
    [data.pricing?.awaitingQuote, 'طلبات تحتاج تسعير', 'pending', 'yellow'],
    [data.pricing?.confirmed, 'تسعيرات مؤكدة', 'confirmed', 'green'],
    ...(data.visitors?.isActive === true ? [[data.visitors.value, 'عدد الزوار', 'visitors', 'blue', false, data.visitors.source === 'manual' ? 'عداد يدوي' : '']] : []),
  ] : [];
  const activityIcons = {pricing_request: Coins, cart_item_added: Package, customer_registered: UserRound, supplier_registration: Building2};
  return <main className="dashboard-main">
    <section className="welcome"><div><h1>اهلا بك{admin?.name ? `، ${admin.name}` : ''}، لوحة تحكم المنصة</h1>{banner ? <p>عندك {number(banner.newOrders)} طلبات جديدة، و{number(banner.pricingAwaitingDispatch)} طلبات تسعير تنتظر تحويلها للموردين،<br/> و{number(banner.lowStockProducts)} منتجات مخزونها منخفض.</p> : <p>{resource.loading ? 'جارٍ تحميل ملخص المنصة…' : 'تعذر تحميل ملخص المنصة.'}</p>}</div><div className="welcome-stats">{[[banner?.profit?.amount, 'الأرباح', 'profit'], [banner?.ordersThisMonth, 'طلب هذا الشهر', 'month-orders'], [banner?.activeSuppliers, 'مورد نشط', 'active-supplier']].map(([value, label, icon]) => <div key={label} title={icon === 'profit' ? `صافي الربح المعروف لهذا الشهر${banner?.profit?.isPartial ? '؛ لا يشمل مبيعات بلا تكلفة مسجلة' : ''}${banner?.profit?.paymentFeesEstimated ? '؛ بعض رسوم الدفع تقديرية' : ''}` : undefined}><b>{number(value)}<img className="welcome-icon" src={`/images/welcome/${icon}.png`} alt=""/></b><span>{label}{icon === 'profit' && banner?.profit?.isPartial ? ' *' : ''}</span></div>)}</div></section>
    <div className="dashboard-toolbar"><p>إحصائيات المنصة لجميع الأقسام{banner?.profit?.isPartial ? ' · الربح جزئي لوجود مبيعات دون تكلفة مسجلة' : ''}</p><button className="dashboard-refresh" onClick={() => setRevision(n => n + 1)} disabled={resource.loading}><RefreshCw size={15}/>تحديث البيانات</button></div>
    <div className="category-select"><label htmlFor="dashboard-part-type">قسم جدول الطلبات</label><select id="dashboard-part-type" value={partType} onChange={e => setPartType(e.target.value)}><option value="">جميع الأقسام</option><option value="part">قطع الغيار</option><option value="tire">كفرات</option><option value="oil">زيوت</option><option value="used_part">قطع غيار مستعمل</option><option value="service">خدمات</option><option value="accessory">إكسسوارات</option></select></div>
    <ResourceState resource={resource} onLogin={onSessionExpired}/>
    {data && <>
      <section className="card stats"><Head period={period} setPeriod={setPeriod} label="فترة الإحصائيات">آخر الإحصائيات</Head><p className="dashboard-caption">{data.period?.from} — {data.period?.to} · توقيت السعودية</p><div className="stats-grid" data-count={stats.length}>{stats.map(([value, label, asset, color, money, hint]) => <div className={`stat ${color}`} key={label}><img className="stats-asset" src={`/images/stats/${asset}.svg`} alt=""/><b>{money ? <Money value={value}/> : number(value)}</b><span>{label}</span>{hint && <small>{hint}</small>}</div>)}</div></section>
      <div className="charts-row"><section className="card revenue"><Head period={period} setPeriod={setPeriod} label="فترة منحنى الإيرادات">منحنى الإيرادات والطلبات وطلبات التسعير</Head><TrendChart data={data}/></section><section className="card distribution"><Head period={period} setPeriod={setPeriod} label="فترة توزيع الطلبات">توزيع حالات الطلبات</Head><Distribution data={data}/></section></div>
    </>}

    <DashboardOrders partType={partType} revision={revision} onChanged={() => setRevision(n => n + 1)} onSessionExpired={onSessionExpired}/>
    {data && <><div className="middle-row"><section className="card products"><Head>{data.topProducts?.label || 'أكثر المنتجات مبيعاً'}</Head>{data.topProducts?.items?.length ? data.topProducts.items.map(product => <div className="product-item" key={product.id}><Photo key={product.imageUrl} src={product.imageUrl} name={product.name} className="product-image dashboard-photo"/><div><h3>{product.name || product.nameEn || '—'}</h3><p>{product.subtitle || product.brandName || ''}</p><p>المبيعات: <Money value={product.revenue}/></p></div><b>{number(product.ordersCount)}<br/>طلب</b></div>) : <Empty/>}</section><section className="card monthly"><Head>إحصائيات التسعير الشهرية</Head><p className="muted chart-subtitle">طلبات التسعير خلال الفترة المحددة</p><PricingBars data={data}/></section></div>
      <div className="bottom-row"><section className="card suppliers"><Head>{data.topPricingSuppliers?.label || 'أكثر الموردين تسعيراً'}</Head>{data.topPricingSuppliers?.items?.length ? data.topPricingSuppliers.items.map(supplier => <div className="supplier-item" key={supplier.id}><Photo key={supplier.logoUrl} src={supplier.logoUrl} name={supplier.name} className="supplier-logo violet dashboard-photo"/><div><h3>{supplier.name}</h3><p>{number(supplier.completedRequests)} طلب مكتمل {supplier.rating != null && <span className="rating">★ {number(supplier.rating)}</span>}</p></div><b><Money value={supplier.quotedTotal}/></b></div>) : <Empty/>}</section>
      <section className="card activities"><Head>{data.recentActivity?.label || 'آخر النشاطات'}</Head>{data.recentActivity?.items?.length ? data.recentActivity.items.map(item => {const I = activityIcons[item.type] || Clock;const color = ['blue', 'purple', 'green', 'red', 'orange', 'yellow'].includes(item.colorKey) ? item.colorKey : 'blue';return <div className="activity-item" key={item.id}><span className={`stat-icon ${color}`}><I size={19}/></span><div><h3>{item.title}</h3><p>{item.subtitle}</p><span className="time"><Clock size={12}/><time dateTime={item.createdAt}>{relativeTime(item.createdAt, data.recentActivity.serverTime)}</time></span></div><i className="activity-dot"/></div>;}) : <Empty>لا توجد نشاطات حديثة.</Empty>}</section></div></>}
    <footer>جميع الحقوق محفوظة 2026 © UR AUTO PART</footer>
  </main>;
}
