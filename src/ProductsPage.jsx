import React,{useEffect,useRef,useState} from 'react';
import {FileSpreadsheet,FileText,Plus,Search,Layers,MoreVertical,Eye,Pencil,Trash2,CheckCircle2,TriangleAlert,Shuffle,Package,Star,ChevronDown} from 'lucide-react';
import ProductEditor from './ProductEditor';
import {sections,filters} from './products-data';
import {adminRequest,queryString} from './admin-api';
import useAdminResource from './use-admin-resource';
import {ResourceState,Empty} from './dashboard-ui';
import {number} from './dashboard-data';
import {productTypes,productRow} from './products-api';
import {Modal,Pager} from './orders-ui';
import {Sprite,Money,Quality,HiddenFile} from './products-ui';

import './products.css';
export default function ProductsPage({onSessionExpired}){
 const[group,setGroup]=useState('parts'),[filter,setFilter]=useState(''),[search,setSearch]=useState(''),[status,setStatus]=useState(''),[page,setPage]=useState(1),[checked,setChecked]=useState([]),[menu,setMenu]=useState(null),[editor,setEditor]=useState(null),[revision,setRevision]=useState(0),[notice,setNotice]=useState(''),[deleting,setDeleting]=useState(null),[busy,setBusy]=useState(false),[debounced,setDebounced]=useState('');const root=useRef(null),deleteLock=useRef(false);
 useEffect(()=>{const reset=()=>{setEditor(null);setMenu(null)};window.addEventListener('mypart:products-home',reset);return()=>window.removeEventListener('mypart:products-home',reset)},[]);
 useEffect(()=>{if(!menu)return;const close=e=>{if(!e.target.closest('.pp-menu')&&!e.target.closest('.pp-menu-trigger'))setMenu(null)};const scroll=()=>setMenu(null);document.addEventListener('pointerdown',close);window.addEventListener('scroll',scroll,true);return()=>{document.removeEventListener('pointerdown',close);window.removeEventListener('scroll',scroll,true)}},[menu]);
 useEffect(()=>{const timer=setTimeout(()=>{setDebounced(search);setPage(1)},300);return()=>clearTimeout(timer)},[search]);
 const query={partType:productTypes[group],limit:7,offset:(page-1)*7,search:debounced||undefined,status:({'منشور':'published','غير منشور':'unpublished','محذوف':'deleted'}[status])||undefined,...(filter?(group==='parts'?{categoryId:filter}:{brandId:filter}):{})};
 const resource=useAdminResource('/api/products/admin?'+queryString(query),revision);
 const lookup=useAdminResource(group==='parts'?'/api/categories/admin':['oil','tires'].includes(group)?`/api/brands?category=${group==='oil'?'oils':'tires'}&active=true`:null);
 const invalid=resource.data&&!Array.isArray(resource.data.data);
 const state=invalid?{...resource,error:new Error('رد الخادم لا يحتوي قائمة منتجات صالحة.')}:resource;
 const rows=Array.isArray(resource.data?.data)?resource.data.data.map(productRow):[];
 const counts=resource.data?.meta?.statusCounts||{},total=resource.data?.meta?.total;
 const lookupRows=Array.isArray(lookup.data?.data)?lookup.data.data:[];
 const filterRows=group==='parts'?lookupRows.filter(r=>r.parent_id):lookupRows;
 const lowStock=useAdminResource('/api/products/admin?'+queryString({...query,limit:1,offset:0,lowStock:true}),revision);
 const partCount=useAdminResource('/api/products/admin?partType=part&limit=1&offset=0',revision);
 const oilCount=useAdminResource('/api/products/admin?partType=oil&limit=1&offset=0',revision);
 const tireCount=useAdminResource('/api/products/admin?partType=tire&limit=1&offset=0',revision);
 const serviceCount=useAdminResource('/api/products/admin?partType=service&limit=1&offset=0',revision);
 const accessoryCount=useAdminResource('/api/products/admin?partType=accessory&limit=1&offset=0',revision);
 const groupTotals={parts:partCount.data?.meta?.total,oil:oilCount.data?.meta?.total,tires:tireCount.data?.meta?.total,services:serviceCount.data?.meta?.total,accessories:accessoryCount.data?.meta?.total};
 const detail=useAdminResource(editor?.mode==='preview'?'/api/products/admin/'+encodeURIComponent(editor.row.id):null);
 useEffect(()=>{setChecked([]);setMenu(null)},[group,page,debounced,status,filter]);
 function open(row,mode='preview'){
  setMenu(null);
  setEditor({row,mode,group});setNotice('');
 }
 async function deleteProduct(){if(!deleting||deleteLock.current)return;deleteLock.current=true;setBusy(true);setNotice('');try{
  await adminRequest('/api/products/admin/'+encodeURIComponent(deleting.id),{method:'DELETE'});
  setDeleting(null);setChecked([]);setNotice('تم حذف المنتج من العرض العام.');setRevision(n=>n+1);if(rows.length===1&&page>1)setPage(n=>n-1);
 }catch(error){setNotice(error.message)}finally{deleteLock.current=false;setBusy(false)}}
 if(editor&&editor.mode!=='preview')return <><p className="op-notice" role="status">{notice||'تعديلات هذه الشاشة معاينة محلية فقط؛ لم يتم ربط حفظ بيانات المنتج بالخادم بعد.'}</p><ProductEditor key={editor.group+editor.row.id} group={editor.group} product={editor.row} mode={editor.mode} onSave={next=>{setEditor(prev=>({...prev,row:next}));setNotice('تم حفظ مسودة محلية فقط. لم يتم تعديل بيانات المنتج على الخادم.')}}/></>;
 const isParts=group==='parts',isService=group==='services',isAccessory=group==='accessories';
 const columns=isParts?['المنتج','الشركة','أعلى جودة','أقل جودة','التقييم','الحالة','الإجراءات']:group==='oil'?['المنتج','شركة الزيت','نوع اللزوجة','التقييم','الحالة','الإجراءات']:group==='tires'?['المنتج','شركة الإطار','مقاس الجنط','التقييم','الحالة','الإجراءات']:isService?['العميل','الشركة','الخدمة المطلوبة','السعر','مركز الصيانة','الحالة','الإجراءات']:['المنتج','الشركة','نوع التركيب','السعر','التقييم','الحالة','الإجراءات'];
 return <div className="pp-page" ref={root}><div className="pp-page-heading"><h1>{isService?'خدمات urparts':'إدارة المنتجات'}</h1><div className="pp-import-export"><HiddenFile accept=".xls,.xlsx" onFile={()=>setNotice('استيراد المنتجات مؤجل لحين توفر مساره.')}>{pick=><button className="pp-import" onClick={pick}><FileSpreadsheet size={18}/>استيراد XLS</button>}</HiddenFile><button className="pp-export" onClick={()=>window.print()}><FileText size={18}/>تصدير PDF</button></div></div>
 <section className="pp-stat-panel">{[[counts.all??total,'إجمالي الطلبات','blue',FileText],[counts.published,'منشور ونشط','green',CheckCircle2],[lowStock.data?.meta?.total,'مخزون منخفض','amber',TriangleAlert],[null,'نفذ من المخزون','red',Shuffle]].map(([n,label,color,Icon])=><div className={'pp-stat '+color} key={label}><span className="pp-stat-icon"><Icon size={21}/></span><b>{number(n)}</b><span>{label}</span></div>)}</section>
 <section className="pp-categories" aria-label="أقسام المنتجات">{sections.map(section=><button key={section.id} className={'pp-category '+(group===section.id?'selected':'')} style={{background:section.color}} onClick={()=>{setGroup(section.id);setFilter('');setSearch('');setDebounced('');setStatus('');setPage(1);setChecked([]);setMenu(null)}}><div><span>{section.name}</span><b>{number(groupTotals[section.id])} {section.id==='services'?'خدمة':'منتج'}</b></div><Sprite asset={section.id==='services'&&group!=='parts'?'servicesBrown':section.asset}/></button>)}</section>
 {filters[group]&&<div className="pp-filters" aria-label="تصنيفات المنتجات"><button className={!filter?'active':''} onClick={()=>{setFilter('');setPage(1)}}><Layers size={18}/><span>الكل</span><small>{number(counts.all??total)}</small></button>{filterRows.map(row=><button key={row.id} className={filter===row.id?'active':''} onClick={()=>{setFilter(row.id);setPage(1);setChecked([])}}><span>{row.name_ar||row.name}</span>{row.products_count!=null&&<small>{number(row.products_count)}</small>}</button>)}</div>}
 <ResourceState resource={state} onLogin={onSessionExpired}/><ResourceState resource={lookup} onLogin={onSessionExpired}/>{notice&&<p className="op-notice" role="status">{notice}</p>}
 <section className="pp-list-panel"><div className="pp-list-tools"><div className="pp-search-status"><label className="pp-search"><input aria-label="البحث في المنتجات" placeholder={isService?'إبحث بإسم الخدمة أو العميل ...':isParts||isAccessory?'إبحث بإسم المنتج أو رقم القطعة...':'إبحث بإسم المنتج أو الشركة...'} value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}/><Search size={19}/></label><label className="pp-status"><select aria-label="حالة المنتجات" value={status} onChange={e=>{setStatus(e.target.value);setPage(1)}}><option value="">الحالة</option><option>منشور</option><option>غير منشور</option><option>محذوف</option></select><ChevronDown size={15}/></label></div><button className="pp-button" onClick={()=>open({id:crypto.randomUUID(),name:'',published:true},'add')}><Plus size={19}/>{isService?'إضافة خدمة':'إضافة منتج'}</button></div>
 <div className="pp-table-scroll"><table className={'pp-table '+(isParts?'pp-parts-table':'')}><thead><tr><th><input type="checkbox" aria-label="تحديد كل المنتجات" checked={rows.length>0&&rows.every(p=>checked.includes(p.id))} onChange={e=>setChecked(e.target.checked?rows.map(p=>p.id):[])}/></th>{columns.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.id}><td><input type="checkbox" aria-label={'تحديد '+row.name} checked={checked.includes(row.id)} onChange={e=>setChecked(e.target.checked?[...checked,row.id]:checked.filter(id=>id!==row.id))}/></td><td><button className="pp-product-name" onClick={()=>open(row,'edit')}>{row.thumbnail?<img src={row.thumbnail} alt="" style={{width:39,height:39,objectFit:'contain'}}/>:<Package size={30}/>}<span>{isService?row.customer:row.name}{isParts&&<small>{row.subtitle}</small>}{isService&&<small className="pp-phone">{row.phone}</small>}</span></button></td>
 {isParts?<><td><div className="pp-brands">{row.brand_name||'—'}</div></td><td><Quality normal={row.quality==='قطعة عادية'}>{row.quality}</Quality><p className="pp-price-cell"><Money>{number(row.price)}</Money></p></td><td>{row.lowQuality?<><Quality normal={row.lowQuality==='قطعة عادية'}>{row.lowQuality}</Quality><p className="pp-price-cell"><Money>{number(row.price)}</Money></p></>:'---'}</td></>:group==='oil'?<><td>{row.company}</td><td dir="ltr">{row.viscosity}</td></>:group==='tires'?<><td>{row.company}</td><td>{row.size}</td></>:isService?<><td>{row.brand_name||'—'}</td><td>{row.name}</td><td><Money>{number(row.price)}</Money></td><td>{row.supplier_name||'—'}</td></>:<><td>{row.brand_name||'—'}</td><td>{row.installation}</td><td><Money>{number(row.price)}</Money></td></>}
 {!isService&&<td><span className="pp-rating"><Star size={14} fill="#ffd600" color="#ffd600"/>{number(row.rating)} تقييم</span></td>}<td><span className={'pp-published '+(!row.published?'inactive':'')}><i/>{row.deleted?'محذوف':row.published?'منشور':row.status==='pending'?'قيد المراجعة':row.status==='rejected'?'مرفوض':'غير منشور'}</span></td><td><button className="pp-menu-trigger" aria-label={'إجراءات '+row.name} onClick={e=>{const r=e.currentTarget.getBoundingClientRect();setMenu(menu?.id===row.id?null:{id:row.id,row,top:r.bottom-10,left:Math.max(10,r.left-62)})}}><MoreVertical size={24}/></button></td></tr>)}</tbody></table></div>
 {!resource.loading&&!state.error&&!rows.length&&<Empty>لا توجد منتجات مطابقة للبحث.</Empty>}<Pager page={page} total={total||0} pageSize={7} onChange={setPage}/>
 </section>
 {menu&&<div className="pp-menu" style={{top:menu.top,left:menu.left}}><button onClick={()=>open(menu.row,'preview')}><Eye size={16}/>معاينة المنتج</button><button onClick={()=>open(menu.row,'edit')}><Pencil size={16}/>تعديل البيانات</button><button className="pp-delete-action" disabled={isService||menu.row.deleted} onClick={()=>{setDeleting(menu.row);setMenu(null);setNotice('')}}><Trash2 size={16}/>حذف المنتج</button></div>}
 {editor?.mode==='preview'&&<Modal title="معاينة المنتج" onClose={()=>setEditor(null)}><ResourceState resource={detail} onLogin={onSessionExpired}/>{detail.data&&<><h3>{detail.data.data.name}</h3>{detail.data.data.images?.[0]?.image_url&&<img src={detail.data.data.images[0].image_url} alt="" style={{maxWidth:'100%',maxHeight:260,objectFit:'contain'}}/>}<p>{detail.data.data.description||''}</p><p>{detail.data.data.part_number||''}</p><Money>{number(detail.data.data.discount_price??detail.data.data.price)}</Money></>}</Modal>}
 {deleting&&<Modal title="حذف المنتج" onClose={()=>{if(!busy)setDeleting(null)}}><p>حذف «{deleting.name}» من الموقع؟ سيظل مرتبطًا بالطلبات السابقة، ولن يمكن إعادة نشره.</p><div className="delete-options"><button className="primary danger" disabled={busy} onClick={deleteProduct}>{busy?'جارٍ الحذف…':'تأكيد الحذف'}</button><button disabled={busy} onClick={()=>setDeleting(null)}>إلغاء</button></div></Modal>}
 </div>;
}
