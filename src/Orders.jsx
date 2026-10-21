import RiyalIcon from './RiyalIcon';
import React, {useState} from 'react';
import {Eye, Trash2, Check, ArrowDownUp} from 'lucide-react';

export const orderViews = {
  missing: {label: 'طلبات تسعير تحتاج إضافة إلى قاعدة البيانات', columns: ['رقم الطلب','اسم العميل','تاريخ الطلب','الشركة','الشركة','عدد القطع','نوع التسعير','الحالة','الإجراءات']},
  suppliers: {label: 'طلبات تسعير محولة تلقائياً للموردين', columns: ['رقم الطلب','اسم العميل','تاريخ الطلب','الشركة','عدد القطع','نوع التسعير','المدة المتبقية','الحالة','الإجراءات']},
  confirmed: {label: 'طلبات تسعير تم تأكيدها من العملاء', columns: ['رقم الطلب','اسم العميل','تاريخ الطلب','الشركة','عدد القطع','قيمة الطلب','اسم المورد','الحالة','الإجراءات']},
  latest: {label: 'آخر الطلبات', columns: ['رقم الطلب','اسم العميل','تاريخ الطلب','الشركة','عدد القطع','قيمة الطلب','الحالة','آخر الطلبات']},
};
const quantities = [2,4,5,10,2];
const dates = ['02','03','08','10','15'];
function Status({kind, children}) {return <span className={'order-status '+kind}><i/>{children}</span>}
function Company(){return <span className="company"><span className="bmw">BMW</span>بي ام دبليو 2025</span>}
function Price(){return <span className="order-price currency-amount" dir="ltr"><RiyalIcon />300.323</span>}
function Supplier({index}) {let nile=index%2===0;return <span className="order-supplier"><span className={'mini-logo '+(nile?'violet':'teal')}>{nile?'N':'kh'}</span>{nile?'شركة النيل':'شركة الخليج'}</span>}
export default function Orders({onView,category='parts'}) {
 const [view,setView]=useState('missing');
 const [removed,setRemoved]=useState({});
 const [pendingDelete,setPendingDelete]=useState(null);
 const [accepted,setAccepted]=useState(false);
 const config=orderViews[view];
 const isTires=category==='tires';
 const isOil=category==='oil';
 const isUsed=category==='used';
 const isServices=category==='services';
 const serviceNames=['فحص السيارة','تغيير زيت المحرك','صيانة دورية','فحص كهرباء','فحص السيارة'];
 const serviceColumns=['رقم الطلب','اسم العميل','تاريخ الطلب','اسم الخدمة','عدد القطع',...(view==='confirmed'?['قيمة الطلب','اسم المورد']:view==='latest'?['قيمة الطلب']:[]),'الحالة',view==='latest'?'آخر الطلبات':'الإجراءات'];
 const requestedParts=['دينامو','صدام أمامي','فانوس أمامي','وش سلندر','صدام أمامي'];
 const usedColumns=['رقم الطلب','اسم العميل','تاريخ الطلب','الشركة','القطعة المطلوبة','عدد القطع',...(view==='suppliers'?['المدة المتبقية']:view==='confirmed'?['قيمة الطلب','اسم المورد']:view==='latest'?['قيمة الطلب']:[]),'الحالة',view==='latest'?'آخر الطلبات':'الإجراءات'];
 const oilColumns=['رقم الطلب','اسم العميل','تاريخ الطلب','الشركة','نوع الزيت','درجة اللزوجة','عدد القطع',...(view==='confirmed'?['قيمة الطلب','اسم المورد']:view==='latest'?['قيمة الطلب']:[]),'الحالة',view==='latest'?'آخر الطلبات':'الإجراءات'];
 const columns=isServices?serviceColumns:isUsed?usedColumns:isOil?oilColumns:config.columns.filter((_,i)=>!(isTires&&view==='missing'&&i===4));
 const quantityLabel=isServices?'عدد الخدمات':isOil?'الكمية':isTires?'عدد الكفرات':'عدد القطع';
 return <section className="card orders">
  <div className="section-head"><h2>الطلبات</h2><select aria-label="حالة حاوية الطلبات" value={view} onChange={e=>{setView(e.target.value);setPendingDelete(null)}}>{Object.entries(orderViews).map(([key,option])=><option key={key} value={key}>{option.label}</option>)}</select></div>
  <div className="table-scroll"><table className={'orders-table view-'+view}>
   <thead><tr>{columns.map((label,index)=><th key={index}>{label==='عدد القطع'?<span className="quantity-heading">{quantityLabel} <ArrowDownUp size={12}/></span>:label}</th>)}</tr></thead>
   <tbody>{quantities.map((quantity,index)=>{
    const id=index+1;
    if((removed[view]||[]).includes(id))return null;
    const detail={id,view,category,label:config.label,quantity,requestedPart:isUsed?requestedParts[index]:null,serviceName:isServices?serviceNames[index]:null};
    return <tr key={id}>
     <td className="order-id">PRQ-00{id}</td><td>سارة ايمن</td><td className="muted">{dates[index]} مايو 25</td><td>{isServices?serviceNames[index]:isOil?(index%2===0?'شل هيليكس':'موبيل'):isTires?(index%2===0?'بريدجستون':'ميشلان'):<Company/>}</td>
     {view==='missing'&&!isTires&&!isOil&&!isUsed&&!isServices&&<td>{index%2===0?'بريدجستون':'ميشلان'}</td>}
     <>{isUsed&&<td>{requestedParts[index]}</td>}{isOil&&<><td>تخليقي بالكامل</td><td><span dir="ltr">5W-30</span></td></>}<td>{quantity}</td></>
     {!isServices&&!isUsed&&!isOil&&(view==='missing'||view==='suppliers')&&<td><span className={'badge '+(id<4?'red':'green')}>{id<4?'تسعير سريع':'تسعير مجاني'}</span></td>}
     {view==='suppliers'&&!isOil&&!isServices&&<td>{id===1||id===5?<span className="no-duration">—</span>:<div className={'remaining-time '+(id===3?'warning':'urgent')}><span>30:29</span><div className="timer-track"><i style={{width:id===2?'7%':id===3?'70%':'5%'}}/></div></div>}</td>}
     {(view==='confirmed'||view==='latest')&&<td><Price/></td>}
     {view==='confirmed'&&<td><Supplier index={index}/></td>}
     <td>{view==='missing'?<Status kind="needs-addition">تحتاج إضافة</Status>:view==='suppliers'?<Status kind={id===1?'new':id===5?'priced':'pricing'}>{id===1?'جديد':id===5?'تم التسعير':'في التسعير'}</Status>:view==='confirmed'?<Status kind="confirmed">مؤكد</Status>:<Status kind={id===1&&!accepted?'new':(id===2&&!isOil&&!isServices)||id===1?'confirmed':'completed'}>{id===1&&!accepted?'جديد':(id===2&&!isOil&&!isServices)||id===1?'مؤكد':'مكتمل'}</Status>}</td>
     <td><div className="actions"><button aria-label={'عرض الطلب PRQ-00'+id} onClick={()=>onView(detail)}><Eye size={16}/></button>{view==='latest'&&id===1&&!accepted&&<button className="accept-order" aria-label="تأكيد الطلب PRQ-001" onClick={()=>setAccepted(true)}><Check size={16}/></button>}<button aria-label={'حذف الطلب PRQ-00'+id} onClick={()=>setPendingDelete(id)}><Trash2 size={16}/></button></div></td>
    </tr>
   })}</tbody>
  </table></div>
  {pendingDelete&&<div className="modal-backdrop" onClick={()=>setPendingDelete(null)}><div className="modal" onClick={e=>e.stopPropagation()}><h2>حذف الطلب PRQ-00{pendingDelete}؟</h2><p>هل تريد إزالة الطلب من الجدول؟</p><div className="delete-options"><button className="primary danger" onClick={()=>{setRemoved({...removed,[view]:[...(removed[view]||[]),pendingDelete]});setPendingDelete(null)}}>حذف الطلب</button><button onClick={()=>setPendingDelete(null)}>إلغاء</button></div></div></div>}
 </section>
}
