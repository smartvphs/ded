export const productRootPositions={parts:1,oil:2,tires:3,services:5,accessories:6};
const parentId=row=>row.parent_id??row.parentId??null;
const categoryName=row=>row.name_ar??row.nameAr??row.name??'';
export function inventorySummary(rows,meta={},group){
 const counts=meta.statusCounts||{};
 const measurable=group!=='services'&&rows.every(r=>r.stock_quantity!==null&&r.stock_quantity!==undefined&&Number.isFinite(Number(r.stock_quantity)));
 return {all:counts.all??meta.total??rows.length,published:counts.published??rows.filter(r=>r.status==='published').length,
  outOfStock:measurable?rows.filter(r=>Number(r.stock_quantity)<=0).length:null};
}
export function categoryFilters(categories,inventory,group){
 const byId=new Map(categories.map(c=>[c.id,c]));
 const root=categories.find(c=>!parentId(c)&&Number(c.sort_order??c.sortOrder)===productRootPositions[group]&&(group==='services'?c.type==='service':c.type!=='service'));
 const allowed=c=>c&&(group==='services'?c.type==='service':c.type!=='service');
 const under=(id,target)=>{const visited=new Set();while(id&&!visited.has(id)){if(id===target)return true;visited.add(id);id=parentId(byId.get(id)||{})}return false};
 const assigned=new Set(inventory.flatMap(p=>[p.category_id,p.subcategory_id]).filter(Boolean));
 const selected=categories.filter(c=>allowed(c)&&c.id!==root?.id&&(
  (root&&parentId(c)===root.id)||assigned.has(c.id)&&(!root||!under(root.id,c.id))
 ));
 return selected.map(c=>{
  // Use the dedicated subcategory filter for child IDs; parent category IDs remain categoryId.
  const categoryOnly=inventory.some(p=>p.category_id===c.id)&&!inventory.some(p=>p.subcategory_id===c.id);
  const key=parentId(c)&&!categoryOnly?'subcategoryId':'categoryId';
  const count=inventory.filter(p=>key==='subcategoryId'?p.subcategory_id===c.id:p.category_id===c.id||under(p.category_id,c.id)).length;
  return {id:c.id,name:categoryName(c),key,count};
 }).sort((a,b)=>Number(byId.get(a.id)?.sort_order??0)-Number(byId.get(b.id)?.sort_order??0)||a.name.localeCompare(b.name,'ar'));
}
export function brandFilters(brands,inventory){return brands.map(b=>({id:b.id,name:b.name??b.name_ar??'',key:'brandId',count:inventory.filter(p=>p.brand_id===b.id).length}));}
export function mergeProductDetails(row,detail){return detail?{...row,...detail,thumbnail:row.thumbnail||(Array.isArray(detail.images)?detail.images.find(i=>i?.image_url)?.image_url:null)||null}:row;}
export function compatibilityMakes(compatibility=[]){
 const seen=new Set();return (Array.isArray(compatibility)?compatibility:[]).filter(Boolean).flatMap(c=>{const id=c.make_id??c.makeId,name=c.make_name_ar??c.makeNameAr??c.make_name_en??c.makeNameEn;const key=id||name;if(!key||seen.has(key))return [];seen.add(key);return [{id:key,name:name||'—',nameEn:c.make_name_en??c.makeNameEn??'',logo:c.make_logo_url??c.makeLogoUrl??null}]});
}
export function makeSprite(make){
 const name=(make.nameEn||make.name||'').trim().toLowerCase();
 return ({bmw:'bmw','بي ام دبليو':'bmw',fiat:'fiat',فيات:'fiat',lamborghini:'lamborghini',لامبورغيني:'lamborghini',mercedes:'mercedes','mercedes-benz':'mercedes',مرسيدس:'mercedes',toyota:'toyota',تويوتا:'toyota'})[name]||null;
}
