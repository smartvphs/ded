import React,{useEffect,useRef,useState} from 'react';
import {adminRequest} from './admin-api';
import useAdminResource from './use-admin-resource';
import {ResourceState, Empty} from './dashboard-ui';
import {contentItem, counterKeys, counterBody, announcementBody, uploadContentImage, reviewItem, testimonialBody} from './definitions-api';
import DefinitionIcon from './DefinitionIcon';
import {Upload,Plus,Trash2,Eye,Star,ShieldCheck,Truck,Tags,Coins,Users,Headphones,Building2,Grid2X2,Image,Link,Phone,Type,Bold,Italic,Underline,List,AlignRight,AlignCenter,AlignLeft,Check,X} from 'lucide-react';
export const definitionPages=[['intro','السكشن التعريفي'],['policies','السياسات'],['banners','بنرات الأقسام'],['ads','الإعلانات'],['ticker','الشريط الإعلاني']];
const introTabs=[['numbers','أرقامنا',Type],['partners','شركاء نجاح',Building2],['purchases','آخر مشتريات العملاء',Grid2X2],['reviews','تعليقات العملاء',Users],['why','لماذا منصتنا',Headphones]];
const fieldIcons={'نص الرسالة':'megaphone','رقم الدعم':'phone','نص الزر':'megaphone','رابط الزر':'link','اسم العميل':'person','عنوان الرابط':'link'};
function Field({label,value,onChange,placeholder,type='text',required=false,icon}){const glyph=icon||fieldIcons[label];return <label className="definition-field"><span>{label}{required?'*':''}</span><span className="definition-input-wrap">{glyph&&<DefinitionIcon name={glyph} size={18} className="definition-input-icon"/>}<input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder||label} required={required} style={glyph?{paddingRight:36}:undefined}/></span></label>}
function Description({value,onChange}){return <label className="definition-field full"><span>الوصف</span><textarea aria-label="الوصف" value={value} onChange={e=>onChange(e.target.value)} placeholder="اكتب الوصف هنا"/></label>}
function UploadBox({value,onChange}){const ref=useRef();const[error,setError]=useState('');const read=file=>{if(!file)return;if(!['image/png','image/jpeg','image/webp'].includes(file.type)){setError('اختر صورة بصيغة JPG أو PNG أو WebP');return}if(file.size>3*1024*1024){setError('اختر صورة أصغر من 3 ميجابايت');return}setError('');const r=new FileReader();r.onload=()=>onChange(r.result);r.readAsDataURL(file)};return <div className="upload-container"><div className="upload-box" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();read(e.dataTransfer.files[0])}}>{value?<img src={value} className="upload-preview" alt="معاينة الصورة المختارة"/>:<DefinitionIcon name="upload" size={34}/>}<p>اسحب الصورة هنا</p><span>سحب وإسقاط صورة هنا، أو انقر لتحديد واحد</span><button type="button" className="small-blue" onClick={()=>ref.current.click()}><DefinitionIcon name="image" size={13}/>اختر الصورة</button><input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{read(e.target.files[0]);e.target.value=''}} hidden/></div>{error&&<p className="form-error" role="alert">{error}</p>}</div>}
const tabIcons={numbers:'numbers',partners:'partners',purchases:'purchases',reviews:'reviews',why:'why',privacy:'privacy',terms:'terms',returns:'returns',shipping:'shipping','تسوق قطع الغيار':'parts','الزيوت':'oil','إطارات':'tires','العناية بالسيارة':'care','الإكسسوارات':'accessories'};
function Tabs({items,value,onChange}){return <div className="definition-tabs">{items.map(([id,title,I])=><button key={id} className={value===id?'selected':''} onClick={()=>onChange(id)}>{(I||tabIcons[id]||tabIcons[title])&&<DefinitionIcon name={tabIcons[id]||tabIcons[title]||'parts'} size={16}/>} {title}</button>)}</div>}
function AddButton({label='إضافة'}){return <button type="submit" className="def-primary"><DefinitionIcon name="plus" size={15}/>{label}</button>}
function Toggle({checked,onChange,label,disabled}){return <label className="definition-toggle"><input type="checkbox" checked={checked} disabled={disabled} onChange={e=>onChange(e.target.checked)}/><span className="toggle-track"><i/></span>{label}</label>}
function Delete({onClick,label}){return <button type="button" className="def-delete" aria-label={label||'حذف'} onClick={onClick}><DefinitionIcon name="trash" size={15}/></button>}
function Stars({value,onChange}){return <div className="review-stars" role={onChange?'group':undefined} aria-label="التقييم">{[1,2,3,4,5].map(n=>onChange?<button key={n} type="button" aria-label={n+' نجوم'} onClick={()=>onChange(n)}><DefinitionIcon name={n<=value?'starFilled':'star'} size={21}/></button>:<DefinitionIcon key={n} name={n<=value?'starFilled':'star'} size={15}/>)}</div>}
export default function Definitions({page,onSessionExpired}){
 const[tab,setTab]=useState('numbers'),[policy,setPolicy]=useState('privacy'),[section,setSection]=useState(''),[device,setDevice]=useState('web');
 const[numberDraft,setNumberDraft]=useState({parts:'',orders:'',visitors:'',customers:''});
 const[image,setImage]=useState(null),[title,setTitle]=useState(''),[description,setDescription]=useState(''),[url,setUrl]=useState(''),[phone,setPhone]=useState(''),[product,setProduct]=useState(''),[rating,setRating]=useState(0),[fake,setFake]=useState(true),[showReviewForm,setShowReviewForm]=useState(true),[toast,setToast]=useState(''),[preview,setPreview]=useState(null),[confirmDelete,setConfirmDelete]=useState(null),[busy,setBusy]=useState(false),[newPolicy,setNewPolicy]=useState(null),[editReview,setEditReview]=useState(null),[reviewPage,setReviewPage]=useState(0);
 const editor=useRef(),lock=useRef(false),toastTimer=useRef(null);
 const scope=page+':'+tab+':'+section+':'+device+':'+showReviewForm;const scopeRef=useRef(scope);scopeRef.current=scope;
 const path=page==='intro'?{numbers:'/api/home/counters/admin',partners:'/api/partners/all',why:'/api/platform-features/all',reviews:showReviewForm?'/api/testimonials/admin':`/api/reviews/admin?hasComment=true&limit=20&offset=${reviewPage*20}`}[tab]:{policies:'/api/policies/admin/all',banners:section?`/api/banners/all?placement=category&categoryId=${encodeURIComponent(section)}&platform=${device}`:null,ads:'/api/banners/all?placement=popup',ticker:'/api/announcement-bars/admin'}[page];
 const resource=useAdminResource(path||null);
 const manualResource=useAdminResource(page==='intro'&&tab==='reviews'&&!showReviewForm?'/api/testimonials/admin':null);
 const manualData=showReviewForm?resource.data?.data:manualResource.data?.data;
 const manualEnabled=manualData?.manualEnabled??manualData?.manual_enabled??false;
 const isManual=page==='intro'&&tab==='reviews'&&showReviewForm;
 const categoryResource=useAdminResource(page==='banners'?'/api/categories/admin':null);
 const categoryState=categoryResource.data&&!Array.isArray(categoryResource.data.data)?{...categoryResource,error:new Error('رد الخادم لا يحتوي قائمة أقسام صالحة.')}:categoryResource;
 const badList=resource.data&&(isManual?(!Array.isArray(resource.data.data?.items)||typeof resource.data.data?.manualEnabled!=='boolean'):!Array.isArray(resource.data.data));
 const state=badList?{...resource,error:new Error('رد الخادم لا يحتوي قائمة بيانات صالحة.')}:resource;
 const rows=isManual?(Array.isArray(resource.data?.data?.items)?resource.data.data.items:[]):Array.isArray(resource.data?.data)?resource.data.data:[];
 const categories=Array.isArray(categoryResource.data?.data)?categoryResource.data.data.filter(c=>!(c.parentId??c.parent_id)):[];
 const sections=categories.map(c=>[c.id,c.nameAr??c.name_ar??c.name]);
 const partners=page==='intro'&&tab==='partners'?rows.map(contentItem):[];
 const why=page==='intro'&&tab==='why'?rows.map(contentItem):[];
 const ads=page==='ads'?rows.map(contentItem):[];
 const tickers=page==='ticker'?rows.map(contentItem):[];
 const categoryBanners=page==='banners'?rows.map(contentItem).filter(b=>b.categoryId===section&&(!b.platform||b.platform==='all'||b.platform===device)):[];
 const purchases=[],reviews=page==='intro'&&tab==='reviews'?rows.map(r=>reviewItem(r,showReviewForm)).sort((a,b)=>Date.parse(b.createdAt||b.created_at||0)-Date.parse(a.createdAt||a.created_at||0)):[];
 const counters=Object.fromEntries(rows.filter(r=>r.key).map(r=>[r.key,r]));
 const numbers=Object.fromEntries(Object.entries(counterKeys).map(([key,apiKey])=>[key,counters[apiKey]?.display??counters[apiKey]?.value??'—']));
 const policies=page==='policies'?rows:[];
 const policyAliases={privacy:['privacy-policy'],terms:['terms-and-conditions','terms'],returns:['return-policy','returns-policy','refund-policy','return-refund-policy'],shipping:['shipping-policy','shipping-and-payment','shipping-payment-policy']};
 const policyId=row=>Object.keys(policyAliases).find(k=>policyAliases[k].includes(row.slug))||row.id;
 const currentPolicy=policies.find(r=>policyId(r)===policy);
 const policyText=currentPolicy?.contentAr??currentPolicy?.content_ar??'';
 const ready=Boolean(path)&&!state.loading&&!state.error&&Boolean(resource.data)&&(page!=='banners'||Boolean(section)&&!categoryState.loading&&!categoryState.error);
 const notify=message=>{clearTimeout(toastTimer.current);setToast(message);toastTimer.current=setTimeout(()=>setToast(''),6000)};
 const reset=()=>{setImage(null);setTitle('');setDescription('');setUrl('');setPhone('');setProduct('');setRating(0);setEditReview(null)};
 useEffect(()=>{reset();setNumberDraft({parts:'',orders:'',visitors:'',customers:''});setConfirmDelete(null);setPreview(null)},[scope]);
 useEffect(()=>()=>clearTimeout(toastTimer.current),[]);
 useEffect(()=>{if(page==='banners'&&categories.length&&!categories.some(c=>c.id===section))setSection(categories[0].id)},[page,categoryResource.data,section]);
 useEffect(()=>{if(editor.current)editor.current.textContent=policyText},[policy,policyText,page]);
 useEffect(()=>{if(page==='policies'&&policies.length&&!currentPolicy)setPolicy(policyId(policies[0]))},[page,resource.data]);
 const changeTab=id=>{setTab(id);reset()};
 async function run(work,success='تم الحفظ على الخادم.',clearForm=true){
  if(lock.current)return;lock.current=true;setBusy(true);clearTimeout(toastTimer.current);setToast('');const active=scopeRef.current;
  try{await work();if(scopeRef.current===active){if(clearForm)reset();notify(success)}resource.reload()}
  catch(error){notify(error.message||'تعذر الحفظ. حاول مرة أخرى.')}
  finally{lock.current=false;setBusy(false)}
 }
 const deletePaths={partners:'/api/partners',why:'/api/platform-features',ads:'/api/banners',banners:'/api/banners',ticker:'/api/announcement-bars',manualReview:'/api/testimonials/admin',realReview:'/api/reviews/admin'};
 const remove=(kind,id)=>setConfirmDelete({kind,id,shared:kind==='banners'&&categoryBanners.some(b=>b.id===id&&(!b.platform||b.platform==='all'))});
 const submit=e=>{e.preventDefault();if(!ready||busy)return;
  if(page==='intro'&&tab==='numbers'){
   const changes=Object.entries(numberDraft).filter(([,value])=>value!=='');
   if(!changes.length)return notify('أدخل قيمة واحدة على الأقل.');
   let values;try{values=changes.map(([key,value])=>[counterKeys[key],counterBody(value)])}catch(error){return notify(error.message)}
   return run(async()=>{const results=await Promise.allSettled(values.map(([key,body])=>adminRequest('/api/home/counters/admin/'+key,{method:'PATCH',body})));resource.reload();const failed=results.filter(r=>r.status==='rejected');if(failed.length)throw new Error(`تم حفظ ${results.length-failed.length} من ${results.length} عدادات. ${failed[0].reason.message}`);setNumberDraft({parts:'',orders:'',visitors:'',customers:''})});
  }
  if(page==='ticker'){
   let body;try{body=announcementBody({title,phone,description,url})}catch(error){return notify(error.message)}
   return run(()=>adminRequest('/api/announcement-bars',{method:'POST',body}));
  }
  if(page==='intro'&&tab==='reviews'){
   if(!showReviewForm)return;
   let body;try{body=testimonialBody({title,description,rating})}catch(error){return notify(error.message)}
   return run(async()=>{if(image?.startsWith('data:'))body.avatarUrl=await uploadContentImage(image,'testimonials');else if(image)body.avatarUrl=image;
    await adminRequest('/api/testimonials/admin'+(editReview?'/'+encodeURIComponent(editReview.id):''),{method:editReview?'PATCH':'POST',body});
   });
  }
  if(!image)return notify('اختر الصورة أولًا.');
  if(!(page==='intro'&&tab==='partners')&&!title.trim())return notify('أدخل العنوان أولًا.');
  if(page==='ads'&&!/^(https:\/\/|\/(?!\/))/.test(url))return notify('أدخل رابط الإعلان بصيغة https:// أو مسار يبدأ بـ /.');
  return run(async()=>{
   const imageUrl=await uploadContentImage(image,page==='intro'?(tab==='partners'?'partners':'features'):'banners');
   let endpoint,body,method='POST';
   if(page==='intro'&&tab==='partners'){endpoint='/api/partners';body={name:'شريك نجاح',logoUrl:imageUrl,isActive:true}}
   if(page==='intro'&&tab==='why'){endpoint='/api/platform-features';body={titleAr:title.trim(),descriptionAr:description,iconUrl:imageUrl,isActive:true}}
   if(page==='ads'){endpoint='/api/banners';body={placement:'popup',title:title.trim(),description,imageUrl,linkValue:url.trim(),buttonText:'تسوق الآن',isActive:true}}
   if(page==='banners'){
    const existing=categoryBanners.find(b=>b.platform===device);endpoint='/api/banners'+(existing?'/'+encodeURIComponent(existing.id):'');method=existing?'PUT':'POST';
    body={...(existing?{}:{placement:'category'}),categoryId:section,platform:device,title:title.trim(),description,imageUrl,isActive:true};
   }
   if(!endpoint)throw new Error('لا يوجد مسار لحفظ هذا القسم في ملف الـAPI المتاح.');
   await adminRequest(endpoint,{method,body});
  });
 };
 const savePolicy=()=>{if(!ready||!currentPolicy||busy)return;const contentAr=editor.current?.innerText??policyText;run(()=>adminRequest('/api/policies/'+encodeURIComponent(currentPolicy.id),{method:'PUT',body:{contentAr}}))};
 const createPolicy=e=>{e.preventDefault();if(!newPolicy?.title.trim()||!newPolicy?.content.trim())return notify('أدخل عنوان السياسة ونصها.');run(async()=>{const result=await adminRequest('/api/policies',{method:'POST',body:{slug:'policy-'+Date.now(),titleAr:newPolicy.title.trim(),contentAr:newPolicy.content.trim(),audience:'all',isPublished:true}});setNewPolicy(null);if(result.data?.id)setPolicy(result.data.id)})};
 const titlePage=page==='intro'?'السكشن التعريفي':page==='policies'?'إدارة سياسات الموقع':definitionPages.find(([id])=>id===page)?.[1];
 const policyTabs=policies.map(row=>[policyId(row),row.titleAr??row.title_ar??row.slug]);
 const editManual=item=>{setEditReview(item);setTitle(item.name);setDescription(item.description);setRating(item.rating);setImage(item.image);window.scrollTo({top:0,behavior:'smooth'})};
 const toggleReview=item=>run(()=>adminRequest(item.manual?'/api/testimonials/admin/'+encodeURIComponent(item.id):'/api/reviews/admin/'+encodeURIComponent(item.id)+'/status',{method:'PATCH',body:item.manual?{isActive:!item.active}:{status:item.active?'hidden':'published',...(item.active?{reason:'إخفاء من لوحة التحكم'}:{})}}),item.active?'تم إخفاء التعليق.':'تم إظهار التعليق.',false);
 const toggleManual=value=>{if(busy||!manualData)return;run(async()=>{await adminRequest('/api/testimonials/admin/settings',{method:'PATCH',body:{manualEnabled:value}});if(!showReviewForm)manualResource.reload()},'تم حفظ إعداد التعليقات.',false)};
 const actions=(item,kind)=><div className="item-actions"><Delete label={'حذف '+(item.title||item.name)} onClick={()=>remove(kind,item.id)}/><button className="def-eye" aria-label={'عرض '+(item.title||item.name)} onClick={()=>setPreview(item)}><DefinitionIcon name="eye" size={15}/></button></div>;
 return <div className="definitions-content"><h1 className="definition-page-title">{titlePage}</h1>
 {page==='intro'&&<Tabs items={introTabs} value={tab} onChange={changeTab}/>}
 {page==='policies'&&<div className="policy-tabs"><Tabs items={policyTabs} value={policy} onChange={setPolicy}/><button disabled={!ready||busy} onClick={()=>setNewPolicy({title:'',content:''})}>إضافة جديد</button></div>}
 {page==='banners'&&<Tabs items={sections} value={section} onChange={setSection}/>}
 <ResourceState resource={state} onLogin={onSessionExpired}/>{page==='intro'&&tab==='reviews'&&!showReviewForm&&<ResourceState resource={manualResource} onLogin={onSessionExpired}/>}
 {page==='banners'&&<ResourceState resource={categoryState} onLogin={onSessionExpired}/>}
 {page==='intro'&&tab==='purchases'&&<p className="definition-notice">لا تتوفر في ملف الـAPI الحالي مسارات لإدارة {tab==='purchases'?'المشتريات الوهمية':'التعليقات الوهمية'}. الحفظ غير متاح لهذا القسم.</p>}
 <section className={'definition-panel '+(page==='intro'&&tab==='numbers'?'numbers-panel':'')}>
 {page==='policies'?<><div className="definition-row"><h2>{policyTabs.find(([id])=>id===policy)?.[1]}</h2><button className="def-primary" disabled={!ready||busy||!currentPolicy} onClick={savePolicy}>حفظ</button></div><div className="policy-editor"><div className="editor-toolbar"><select aria-label="حجم الخط" onChange={e=>document.execCommand('fontSize',false,e.target.value)}><option value="3">14</option><option value="4">18</option><option value="5">24</option></select>{[[Bold,'bold','عريض'],[Italic,'italic','مائل'],[Underline,'underline','تحته خط'],[AlignRight,'justifyRight','محاذاة يمين'],[AlignCenter,'justifyCenter','توسيط'],[AlignLeft,'justifyLeft','محاذاة يسار'],[List,'insertUnorderedList','قائمة']].map(([I,cmd,label])=><button key={cmd} aria-label={label} onMouseDown={e=>{e.preventDefault();document.execCommand(cmd)}}><DefinitionIcon name={{bold:'bold',italic:'italic',underline:'underline',justifyRight:'alignRight',justifyCenter:'alignCenter',justifyLeft:'alignLeft',insertUnorderedList:'list'}[cmd]} size={15}/></button>)}</div><div key={policy} ref={editor} className="editable-policy" contentEditable={ready&&!busy} suppressContentEditableWarning role="textbox" aria-label="نص السياسة" tabIndex={0}>{policyText}</div></div></>:
 <>
 <div className="definition-row"><h2>{page==='intro'?{numbers:'إضافة أرقامنا',partners:'إضافة شركاء نجاح',purchases:'إضافة جديد مشتريات العملاء',reviews:'إضافة تعليقات العملاء',why:'إضافة لماذا منصتنا'}[tab]:page==='ticker'?'إضافة شريط إعلاني':page==='ads'?'':null}</h2>{page==='intro'&&['purchases','reviews'].includes(tab)&&<div className="review-controls">{tab==='reviews'&&<button className="small-blue" disabled={busy} onClick={()=>{setShowReviewForm(!showReviewForm);setReviewPage(0)}}>{showReviewForm?'تعليقات العملاء الحقيقيين':'التعليقات المضافة يدويًا'}</button>}<Toggle checked={tab==='reviews'?manualEnabled:fake} disabled={busy||!ready||(tab==='reviews'&&!manualData)} onChange={v=>tab==='reviews'?toggleManual(v):notify('لا يتوفر مسار لحفظ هذا الإعداد في ملف الـAPI الحالي.')} label={tab==='reviews'?'التعليقات الوهمية':'تفعيل المشتريات الوهمية'}/>{tab==='reviews'&&<button onClick={()=>notify('لا يتوفر رابط لإضافة تعليق في ملف الـAPI الحالي.')}>نسخ رابط التعليق <DefinitionIcon name="copyLink" size={13}/></button>}</div>}</div>
 {page==='banners'&&<div className="device-tabs"><button className={device==='web'?'selected':''} onClick={()=>setDevice('web')}>موقع إلكتروني</button><button className={device==='mobile'?'selected':''} onClick={()=>setDevice('mobile')}>جوال</button></div>}
 {['banners','ads'].includes(page)&&<p className="definition-notice">يمكنك رفع صور {page==='ads'?'الإعلانات':'بنرات الأقسام'} في القسم المحدد. الأبعاد المثالية للبنر: 1920×300 بكسل، الصيغ المدعومة JPG, PNG, WebP</p>}
 {(page!=='intro'||tab!=='reviews'||showReviewForm)&&<form onSubmit={submit} className="definition-form" aria-busy={busy}><fieldset disabled={!ready||busy} style={{display:'contents'}}>
 {page==='intro'&&tab==='numbers'?<div className="definition-fields">{[['parts','عدد القطع المتوفرة'],['orders','عدد الطلبات'],['visitors','عدد الزوار'],['customers','عدد العملاء']].map(([key,label])=><Field key={key} icon={{parts:"fieldParts",orders:"fieldOrders",visitors:"fieldVisitors",customers:"fieldCustomers"}[key]} type="number" label={label} value={numberDraft[key]} onChange={v=>setNumberDraft({...numberDraft,[key]:v})}/>)}</div>:
 page==='intro'&&tab==='purchases'?<div className="definition-fields"><label className="definition-field"><span>اختر منتج</span><select value={product} onChange={e=>setProduct(e.target.value)}><option value="">ابحث واختر المنتج</option>{[].map(p=><option key={p}>{p}</option>)}</select></label><Field icon="location" label="عنوان يظهر مع المنتج أو يمكن تعديل الاسم بما يناسبه" value={title} onChange={setTitle} placeholder="جنط مقاس 18 تويوتا كامري"/></div>:
 page==='intro'&&tab==='reviews'?<><Stars value={rating} onChange={setRating}/><div className="definition-fields"><Field label="اسم العميل" value={title} onChange={setTitle} required/><label className="definition-field"><span>إرفاق صورة</span><span className="definition-input-wrap"><DefinitionIcon name="attach" size={18} className="definition-input-icon"/><input style={{paddingRight:36}} type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{const f=e.target.files[0];if(f){if(!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>3*1024*1024){notify('اختر صورة JPG أو PNG أو WebP أصغر من 3 ميجابايت.');e.target.value='';return}const r=new FileReader();r.onload=()=>setImage(r.result);r.readAsDataURL(f)}}}/></span></label><Description value={description} onChange={setDescription}/></div></>:
 page==='ticker'?<div className="definition-fields"><Field label="نص الرسالة" value={title} onChange={setTitle} placeholder="الرسالة" required/><Field label="رقم الدعم" value={phone} onChange={setPhone} placeholder="50 000 0000" type="tel"/><Field label="نص الزر" value={description} onChange={setDescription} placeholder="النص هنا"/><Field label="رابط الزر" value={url} onChange={setUrl} placeholder="الرابط هنا"/></div>:
 <><UploadBox value={image} onChange={setImage}/>{!(page==='intro'&&tab==='partners')&&<div className="definition-fields"><Field icon={page==='ads'?'megaphone':page==='banners'?'banner':'person'} label={page==='ads'?'عنوان الإعلان':page==='banners'?'عنوان البنر':'عنوان'} value={title} onChange={setTitle} required/>{page==='ads'&&<Field label="عنوان الرابط" value={url} onChange={setUrl}/>}<Description value={description} onChange={setDescription}/></div>}</>}
 <AddButton label={editReview?'حفظ التعديل':page==='banners'?'حفظ':'إضافة'}/>{editReview&&<button type="button" onClick={reset}>إلغاء التعديل</button>}</fieldset></form>}
 {page==='intro'&&tab==='numbers'&&<><h2 className="collection-title">الأرقام على المنصة</h2><div className="platform-numbers">{[['parts','قطعة متوفرة','orange',Tags],['orders','عدد الطلبات','blue',Truck],['visitors','عدد الزوار','purple',Users],['customers','عدد العملاء','green',Users]].map(([key,label,color,I])=><div className={'platform-number '+color} key={key}><DefinitionIcon name={{parts:"watermarkParts",orders:"watermarkOrders",visitors:"watermarkVisitors",customers:"watermarkCustomers"}[key]} size={80} className="number-watermark" style={{transform:"none"}}/><b>{numbers[key]}</b><span>{label}</span></div>)}</div></>}
 {page==='intro'&&tab==='partners'&&<><h2 className="collection-title">شركاء نجاح</h2><div className="partner-grid">{partners.map(item=><div className="partner-card" key={item.id}><Delete onClick={()=>remove('partners',item.id)}/>{item.image?<img src={item.image} alt="شريك نجاح"/>:<span>شريك نجاح</span>}</div>)}</div></>}
 {page==='intro'&&tab==='purchases'&&<><h2 className="collection-title">آخر مشتريات العملاء</h2><div className={'purchase-grid '+(!fake?'disabled-preview':'')}>{purchases.map(item=><div className="purchase-card" key={item.id}><div className="purchase-photo">🛞</div><div><h3>{item.title}</h3><p>{item.description}</p><span className="purchase-tag">قطع غيار · إطارات <DefinitionIcon name="location" size={10}/></span></div>{actions(item,'purchases')}</div>)}</div></>}
 {page==='intro'&&tab==='reviews'&&<><h2 className="collection-title">آخر تعليقات العملاء</h2><div className="reviews-grid">{reviews.map(item=><article className="review-card" key={item.id} style={{opacity:item.active?1:.55}}><div className="review-header">{item.image?<img src={item.image} alt={item.name}/>:<span className="review-avatar">أ</span>}<div><h3>{item.manual?<button type="button" style={{font:'inherit',color:'inherit',padding:0}} disabled={busy} aria-label={'تعديل تعليق '+item.name} onClick={()=>editManual(item)}>{item.name}</button>:item.name}</h3><Stars value={item.rating}/></div></div><p>{item.description}</p><div className="item-actions"><Delete label={'حذف تعليق '+item.name} onClick={()=>remove(item.manual?'manualReview':'realReview',item.id)}/><button className="def-eye" disabled={busy} aria-label={(item.active?'إخفاء':'إظهار')+' تعليق '+item.name} onClick={()=>toggleReview(item)}><DefinitionIcon name="eye" size={15}/></button></div></article>)}</div>{!showReviewForm&&<div className="delete-options"><button disabled={resource.loading||reviewPage===0} onClick={()=>setReviewPage(n=>n-1)}>السابق</button><span>{reviewPage+1}</span><button disabled={resource.loading||(resource.data?.meta?.total!=null?(reviewPage+1)*20>=resource.data.meta.total:rows.length<20)} onClick={()=>setReviewPage(n=>n+1)}>التالي</button></div>}</>}
 {page==='intro'&&tab==='why'&&<><h2 className="collection-title">لماذا منصتنا</h2><div className="why-grid">{why.map(item=><div className="why-card" key={item.id}><Delete onClick={()=>remove('why',item.id)}/>{item.image?<img src={item.image} alt=""/>:<DefinitionIcon name="trust" size={55} className={'stat-icon '+item.color}/>}<h3>{item.title}</h3><p>{item.description}</p></div>)}</div></>}
 {page==='banners'&&categoryBanners.map(item=><div className="banner-result" key={item.id}><h2>{item.title}</h2><img src={item.image} alt={item.title}/><p>{item.description}</p><Delete onClick={()=>remove('banners',item.id)}/></div>)}
 {page==='ads'&&<div className="ad-grid">{ads.map(item=><article className="ad-card" key={item.id}><img src={item.image} alt={item.title}/><h3>{item.title}</h3><p>{item.description}</p>{item.url&&<a href={/^(https:\/\/|\/(?!\/))/.test(item.url)?item.url:'#'} target="_blank" rel="noreferrer">تسوق العرض الآن</a>}<Delete onClick={()=>remove('ads',item.id)}/></article>)}</div>}
 {page==='ticker'&&<><h2 className="collection-title">الشريط الإعلاني</h2><div className="ticker-list">{tickers.map(item=><div className="ticker-preview" key={item.id}><span className="ticker-language">English <GlobeIcon/></span><span>{item.text}</span><button className="ticker-button" onClick={()=>setPreview({title:item.button,description:item.link||item.text})}>{item.button}</button><span><DefinitionIcon name="support" size={16}/> تحتاج مساعدة؟ اتصل بنا: <b dir="ltr">{item.phone}</b></span><Delete onClick={()=>remove('ticker',item.id)}/></div>)}</div></>}
 </>}
 </section>
 {path&&ready&&rows.length===0&&<Empty>لا توجد بيانات محفوظة لهذا القسم.</Empty>}
 {newPolicy&&<div className="modal-backdrop"><div className="modal"><button className="close" aria-label="إغلاق" disabled={busy} onClick={()=>setNewPolicy(null)}><X/></button><h2>إضافة سياسة</h2><form onSubmit={createPolicy}><fieldset disabled={busy} style={{border:0,padding:0}}><Field label="عنوان السياسة" value={newPolicy.title} onChange={v=>setNewPolicy({...newPolicy,title:v})} required/><Description value={newPolicy.content} onChange={v=>setNewPolicy({...newPolicy,content:v})}/><AddButton label="حفظ ونشر"/></fieldset></form></div></div>}
 {toast&&<div className="definition-toast" role="status"><Check size={17}/>{toast}</div>}
 {preview&&<div className="modal-backdrop" onClick={()=>setPreview(null)}><div className="modal" onClick={e=>e.stopPropagation()}><button className="close" aria-label="إغلاق" onClick={()=>setPreview(null)}><X/></button>{preview.image&&<img className="modal-preview-image" src={preview.image} alt=""/>}<h2>{preview.title||preview.name}</h2><p>{preview.description}</p></div></div>}
 {confirmDelete&&<div className="modal-backdrop" onClick={()=>setConfirmDelete(null)}><div className="modal" onClick={e=>e.stopPropagation()}><h2>حذف هذا العنصر؟</h2>{confirmDelete.shared&&<p>ده بنر مشترك؛ حذفه هيشيله من الويب والجوال.</p>}<div className="delete-options"><button className="primary danger" disabled={busy} onClick={()=>{const target=confirmDelete;run(async()=>{await adminRequest(deletePaths[target.kind]+'/'+encodeURIComponent(target.id),{method:'DELETE'});setConfirmDelete(null)},'تم حذف العنصر من الخادم.')}}>حذف</button><button disabled={busy} onClick={()=>setConfirmDelete(null)}>إلغاء</button></div></div></div>}
 </div>
}
function GlobeIcon(){return <DefinitionIcon name="language" size={12}/>}
