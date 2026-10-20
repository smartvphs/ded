import {compatibilityMakes} from './product-catalog';
export const productTypes={parts:'part',oil:'oil',tires:'tire',services:'service',accessories:'accessory'};
export function productRow(row){const specs=Array.isArray(row.specifications)?row.specifications:[];return {...row,name:row.name||row.name_en||'—',subtitle:row.subcategory_name_ar||row.category_name_ar||'',
 published:row.status==='published',deleted:row.status==='deleted'||row.is_deleted===true,price:row.discount_price??row.price,
 quality:row.quality_name||({original:'قطعة أصلية',oem:'قطعة بديلة',aftermarket:'قطعة بديلة',used:'مستعمل'}[row.quality_tier])||'—',
 lowQuality:null,carMakes:compatibilityMakes(row.compatibility),rating:row.reviews_count??null,averageRating:row.rating??null,company:row.brand_name||'—',viscosity:row.viscosity||specs.find(s=>['oil_viscosity','viscosity','اللزوجة','لزوجة الزيت'].includes(s.spec_name??s.specName))?.spec_value||'—',size:row.rim_size||specs.find(s=>['rim_size','tire_rim','مقاس الجنط'].includes(s.spec_name??s.specName))?.spec_value||'—',installation:row.installation||'—',
 customer:row.customer_name||row.name||'—',phone:row.customer_phone||'',brand:null,brands:[],image:null};}
