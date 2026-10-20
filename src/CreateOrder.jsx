import React,{useEffect,useRef,useState} from 'react';
import {ArrowRight,Plus,Save,Trash2,UserRound,MapPin,Package,FileText} from 'lucide-react';
import useAdminResource from './use-admin-resource';
import {adminRequest,queryString} from './admin-api';
import {createOrderBody} from './order-list-api';
import {Panel,Field,Select,ResourceState,ProductPhoto,Money} from './orders-ui';
function useSearch(value){const[debounced,setDebounced]=useState(value);useEffect(()=>{const timer=setTimeout(()=>setDebounced(value),300);return()=>clearTimeout(timer)},[value]);return debounced;}
export default function CreateOrder({onBack,onCreated,onSessionExpired}){
 const[customerSearch,setCustomerSearch]=useState(''),[productSearch,setProductSearch]=useState(''),[userId,setUserId]=useState(''),[addressId,setAddressId]=useState(''),[productId,setProductId]=useState(''),[variantId,setVariantId]=useState(''),[quantity,setQuantity]=useState('1'),[items,setItems]=useState([]),[couponCode,setCouponCode]=useState(''),[adminNotes,setAdminNotes]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const lock=useRef(false);
 const customerQuery=useSearch(customerSearch),productQuery=useSearch(productSearch);
 const customers=useAdminResource('/api/admin/customers?'+queryString({search:customerQuery||undefined,status:'active',limit:20,offset:0}));
 const customer=useAdminResource(userId?'/api/admin/customers/'+encodeURIComponent(userId):null);
 const products=useAdminResource('/api/products/admin?'+queryString({search:productQuery||undefined,status:'published',limit:20,offset:0}));
 const product=useAdminResource(productId?'/api/products/admin/'+encodeURIComponent(productId):null);
 const customerRows=Array.isArray(customers.data?.data)?customers.data.data:[],productRows=Array.isArray(products.data?.data)?products.data.data:[];
 // The collection does not document an address-list route. Never guess a customer's address or accept an arbitrary ID.
 const addresses=Array.isArray(customer.data?.data?.addresses)?customer.data.data.addresses:[];
 const variants=(product.data?.data?.variants||[]).filter(v=>v.is_active!==false&&v.isActive!==false);
 const selected=product.data?.data;
 const add=()=>{
  if(!selected||product.loading||product.error)return;
  if(variants.length&&!variantId)return setNotice('اختر نوع المنتج أولًا.');
  const count=Number(quantity);if(!Number.isSafeInteger(count)||count<1)return setNotice('أدخل كمية صحيحة أكبر من صفر.');
  const v=variants.find(v=>v.id===variantId);const existing=items.find(i=>i.productId===productId&&(i.variantId||'')===variantId);
  setItems(existing?items.map(i=>i===existing?{...i,quantity:i.quantity+count}:i):[...items,{key:crypto.randomUUID(),productId,...(variantId?{variantId}:{}),quantity:count,name:selected.name,variantName:v?.name||v?.label||'',price:v?.price??selected.discount_price??selected.price,thumbnail:selected.images?.[0]?.image_url}]);
  setNotice('');setProductId('');setVariantId('');setQuantity('1');
 };
 async function save(e){
  e.preventDefault();if(lock.current)return;setNotice('');
  if(!addresses.some(a=>a.id===addressId))return setNotice('اختر عنوان توصيل من بيانات العميل. لا يمكن إنشاء الطلب دون عنوان موثوق.');
  let body;try{body=createOrderBody({userId,addressId,items,paymentMethod:'cash',couponCode,adminNotes})}catch(error){setNotice(error.message);return}
  lock.current=true;setBusy(true);
  try{const result=await adminRequest('/api/orders/admin',{method:'POST',body});onCreated(result.data?.id||result.data?.order?.id||null)}
  catch(error){setNotice(error.message);lock.current=false;setBusy(false)}
 }
 return <div className="op-content"><div className="op-heading"><h1>إضافة طلب جديد</h1><button className="op-text" disabled={busy} onClick={onBack}><ArrowRight size={16}/>الطلبات</button></div>{notice&&<p className="op-notice" role="alert">{notice}</p>}
 <form onSubmit={save}><fieldset disabled={busy} style={{border:0,padding:0,margin:0,minWidth:0}}>
 <Panel title="بيانات العميل"><div className="op-form-grid"><Field label="البحث عن العميل" icon={UserRound}><input value={customerSearch} onChange={e=>setCustomerSearch(e.target.value)} placeholder="اسم العميل أو رقم الهاتف"/></Field><Select label="العميل" value={userId} onChange={e=>{setUserId(e.target.value);setAddressId('')}} disabled={customers.loading||Boolean(customers.error)}><option value="">اختر العميل</option>{customerRows.map(c=><option key={c.id} value={c.id}>{c.name||c.phone||c.email} {c.name&&c.phone?'· '+c.phone:''}</option>)}</Select><Select label="عنوان التوصيل" icon={MapPin} value={addressId} onChange={e=>setAddressId(e.target.value)} disabled={!addresses.length||customer.loading}><option value="">اختر عنوان التوصيل</option>{addresses.map(a=><option key={a.id} value={a.id}>{[a.label,a.city,a.district,a.street,a.short_address].filter(Boolean).join(' · ')}</option>)}</Select><Select label="وسيلة الدفع" value="cash" onChange={()=>{}}><option value="cash">كاش</option></Select></div><ResourceState resource={customers} onLogin={onSessionExpired}/><ResourceState resource={customer} onLogin={onSessionExpired}/>{userId&&customer.data&&!addresses.length&&<p className="op-notice" role="status">تعذر تحميل عناوين العميل. لا يمكن إتمام الطلب قبل توفر عنوان توصيل.</p>}</Panel>
 <Panel title="منتجات الطلب"><div className="op-form-grid"><Field label="البحث عن المنتج" icon={Package}><input value={productSearch} onChange={e=>setProductSearch(e.target.value)} placeholder="اسم المنتج أو رقم القطعة"/></Field><Select label="المنتج" value={productId} onChange={e=>{setProductId(e.target.value);setVariantId('')}} disabled={products.loading||Boolean(products.error)}><option value="">اختر منتجًا</option>{productRows.map(p=><option key={p.id} value={p.id}>{p.name} {p.part_number?'· '+p.part_number:''}</option>)}</Select>{variants.length>0&&<Select label="نوع المنتج" value={variantId} onChange={e=>setVariantId(e.target.value)}><option value="">اختر النوع</option>{variants.map(v=><option key={v.id} value={v.id}>{v.name||v.label||v.sku}</option>)}</Select>}<Field label="الكمية"><input type="number" min="1" step="1" value={quantity} onChange={e=>setQuantity(e.target.value)}/></Field></div><ResourceState resource={products} onLogin={onSessionExpired}/><ResourceState resource={product} onLogin={onSessionExpired}/><button type="button" className="op-primary" disabled={!selected||product.loading||Boolean(product.error)} onClick={add}><Plus size={18}/>إضافة منتج للطلب</button>
 <div className="op-table-scroll"><table className="op-table op-items-table"><thead><tr><th>المنتج</th><th>سعر الكتالوج</th><th>الكمية</th><th>الإجراءات</th></tr></thead><tbody>{items.map(i=><tr key={i.key}><td><div className="op-product-cell"><ProductPhoto src={i.thumbnail} name={i.name}/><span>{i.name}<small>{i.variantName}</small></span></div></td><td><Money value={i.price}/></td><td><input aria-label={'كمية '+i.name} type="number" min="1" step="1" value={i.quantity} onChange={e=>setItems(items.map(row=>row.key===i.key?{...row,quantity:e.target.value}:row))}/></td><td><button type="button" className="op-delete" aria-label={'إزالة '+i.name} onClick={()=>setItems(items.filter(row=>row.key!==i.key))}><Trash2 size={18}/></button></td></tr>)}</tbody></table></div></Panel>
 <Panel title="ملاحظات الطلب"><div className="op-form-grid"><Field label="كود الخصم" icon={FileText}><input value={couponCode} onChange={e=>setCouponCode(e.target.value)}/></Field><Field label="ملاحظات الإدارة"><textarea value={adminNotes} onChange={e=>setAdminNotes(e.target.value)}/></Field></div><p className="op-caption">يحسب السيرفر الإجمالي والخصم والشحن والضريبة عند إنشاء الطلب.</p></Panel>
 <div className="op-bottom-actions"><button className="op-primary" disabled={busy||!items.length||!userId||!addressId} type="submit"><Save size={18}/>{busy?'جارٍ إنشاء الطلب…':'حفظ الطلب'}</button><button className="op-outline" type="button" disabled={busy} onClick={onBack}>إلغاء</button></div>
 </fieldset></form></div>;
}
