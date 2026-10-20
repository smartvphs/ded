// Convert the read model to the documented admin write model. Keep nullable values
// and unknown specifications/compatibility attributes when editing older products.
export const partTypes={parts:'part',oil:'oil',tires:'tire',accessories:'accessory',services:'service'};
export function productDraft(row={}) {
 return {name:row.name||'',nameEn:row.name_en||'',description:row.description||'',descriptionEn:row.description_en||'',supplierId:row.supplier_id||'',supplierName:row.supplier_name||'',categoryId:row.category_id||'',subcategoryId:row.subcategory_id||'',brandId:row.brand_id||'',brandName:row.brand_name||'',sku:row.sku||'',partNumber:row.part_number||'',aliases:Array.isArray(row.aliases)?row.aliases:[],price:String(row.oldPrice??row.price??''),discountPrice:String(row.discount_price??''),stockQuantity:String(row.stock_quantity??0),condition:row.condition||'new',qualityTier:row.quality_tier||'',countryOfOrigin:row.country_of_origin||'',manufactureYear:String(row.manufacture_year??''),isUniversal:row.is_universal??false,isBulky:row.is_bulky??false,isActive:row.is_active??false,offerEndsAt:row.offer_ends_at||null,
 images:(row.images||[]).map(x=>typeof x==='string'?x:x.image_url).filter(Boolean),specifications:(row.specifications||[]).map(x=>({specName:x.spec_name??x.specName??'',specValue:x.spec_value??x.specValue??''})),
 compatibility:(row.compatibility||[]).map(x=>({makeId:x.make_id??x.makeId,modelId:x.model_id??x.modelId,yearFrom:x.year_from??x.yearFrom??'',yearTo:x.year_to??x.yearTo??'',trim:x.trim??'',engine:x.engine??'',transmission:x.transmission??''}))};
}
function optionalNumber(value,label,integer=false){if(value==='')return null;const n=Number(value);if(!Number.isFinite(n)||n<0||(integer&&!Number.isSafeInteger(n)))throw new Error('أدخل '+label+' صحيحًا.');return n;}
export function compatibilityBody(rows){return rows.map((x,i)=>{if(!x.makeId||!x.modelId)throw new Error('اختر الشركة والموديل للتوافق رقم '+(i+1));const from=optionalNumber(x.yearFrom,'سنة البداية',true),to=optionalNumber(x.yearTo,'سنة النهاية',true);if(from!==null&&to!==null&&to<from)throw new Error('سنة النهاية لا يمكن أن تسبق البداية.');return {makeId:x.makeId,modelId:x.modelId,...(from!==null?{yearFrom:from}:{}),...(to!==null?{yearTo:to}:{}),...Object.fromEntries(['trim','engine','transmission'].filter(k=>x[k]).map(k=>[k,x[k]]))};});}
export function productBody(draft,group,{create=false,baseline=null}={}){
 if(!draft.name.trim()||!draft.categoryId)throw new Error('أدخل اسم المنتج واختر التصنيف الرئيسي.');
 const price=optionalNumber(draft.price,'السعر'),discountPrice=optionalNumber(draft.discountPrice,'سعر الخصم'),stockQuantity=optionalNumber(draft.stockQuantity,'كمية المخزون',true);
 if(price===null||stockQuantity===null)throw new Error('أدخل السعر وكمية المخزون.');if(discountPrice!==null&&discountPrice>price)throw new Error('سعر الخصم لا يمكن أن يزيد عن سعر البيع.');
 if(create&&!draft.supplierId)throw new Error('اختر موردًا معتمدًا لإضافة المنتج.');
 if(draft.images.some(url=>!/^https:\/\//.test(url)))throw new Error('انتظر اكتمال رفع صور المنتج.');
 const specs=draft.specifications.filter(x=>x.specName.trim()||String(x.specValue).trim()).map(x=>({specName:x.specName.trim(),specValue:String(x.specValue).trim()}));if(specs.some(x=>!x.specName||!x.specValue))throw new Error('أكمل اسم وقيمة كل مواصفة أو احذفها.');
 const body={name:draft.name.trim(),nameEn:draft.nameEn.trim()||null,description:draft.description.trim()||null,descriptionEn:draft.descriptionEn.trim()||null,categoryId:draft.categoryId,subcategoryId:draft.subcategoryId||null,brandId:draft.brandId||null,sku:draft.sku.trim()||null,partNumber:draft.partNumber.trim()||null,aliases:draft.aliases,partType:partTypes[group],price,discountPrice,stockQuantity,condition:draft.condition,qualityTier:draft.qualityTier||null,countryOfOrigin:draft.countryOfOrigin.trim()||null,manufactureYear:optionalNumber(draft.manufactureYear,'سنة الإنتاج',true),isUniversal:draft.isUniversal,isBulky:draft.isBulky};
 if(create){for(const key of Object.keys(body))if(body[key]===null)delete body[key];body.images=draft.images;body.specifications=specs;body.compatibility=compatibilityBody(draft.compatibility);}else{
 if(JSON.stringify(draft.images)!==JSON.stringify(baseline?.images)){body.replaceImages=true;body.images=draft.images;}
 if(JSON.stringify(specs)!==JSON.stringify(baseline?.specifications)){body.replaceSpecifications=true;body.specifications=specs;}}
 return body;
}
