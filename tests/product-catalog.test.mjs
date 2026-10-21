import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../src/product-catalog.js',import.meta.url),'utf8');
const {categoryFilters,inventorySummary,mergeProductDetails,compatibilityMakes,mainProductCategories,activeVehicleOptions}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const categories=[{id:'parts',name_ar:'قطع غيار السيارات',sort_order:1,parent_id:null,type:'product'},{id:'ac',name_ar:'تكييف',parent_id:'parts',type:'product',products_count:4},{id:'electric',name_ar:'كهرباء',parent_id:'parts',type:'product'}, {id:'brakes',name_ar:'فرامل',parent_id:null,type:'product',sort_order:0},{id:'accessory',name_ar:'إكسسوارات',sort_order:6,parent_id:null,type:'product'},{id:'inside',name_ar:'إكسسوارات داخلية',parent_id:'accessory',type:'product',products_count:2},{id:'service',name_ar:'خدمات',sort_order:5,parent_id:null,type:'service'},{id:'service-child',name_ar:'صيانة دورية',parent_id:'service',type:'service',products_count:2}];
const inventory=[{id:'one',category_id:'parts',subcategory_id:'ac',stock_quantity:0,status:'published'},{id:'two',category_id:'brakes',stock_quantity:3,status:'published'},{id:'three',category_id:'brakes',stock_quantity:10,status:'unpublished'}];
test('parts categories exclude unrelated accessories/services and use counts from the selected product type',()=>{
 const chips=categoryFilters(categories,inventory,'parts');assert.deepEqual(new Set(chips.map(c=>c.id)),new Set(['ac','electric','brakes']));assert.equal(chips.find(c=>c.id==='ac').key,'subcategoryId');assert.equal(chips.find(c=>c.id==='ac').count,1);assert.equal(chips.find(c=>c.id==='electric').count,0);assert.equal(chips.find(c=>c.id==='brakes').key,'categoryId');assert.equal(chips.find(c=>c.id==='brakes').count,2);
});
test('statistics describe the complete category inventory, including real zero stock, rather than filtered list rows',()=>{
 assert.deepEqual(inventorySummary(inventory,{total:3,statusCounts:{all:3,published:2}},'parts'),{all:3,published:2,outOfStock:1});
 assert.equal(inventorySummary([{stock_quantity:null}],{},'parts').outOfStock,null);assert.equal(inventorySummary(inventory,{},'services').outOfStock,null);assert.equal(inventorySummary([],{},'parts').outOfStock,0);
});
test('detail fields enrich sparse list rows without inventing images, reviews, qualities or compatibility',()=>{
 const merged=mergeProductDetails({id:'p',thumbnail:null,brand_name:null},{id:'p',images:[{image_url:'https://example.com/p.png'}],reviews_count:0,quality_tier:null,compatibility:[{make_id:'bmw',make_name_ar:'بي ام دبليو',make_name_en:'BMW'},{make_id:'bmw',make_name_ar:'بي ام دبليو'}]});
 assert.equal(merged.thumbnail,'https://example.com/p.png');assert.equal(merged.reviews_count,0);assert.equal(merged.quality_tier,null);assert.equal(merged.brand_name,null);assert.equal(compatibilityMakes(merged.compatibility).length,1);assert.deepEqual(compatibilityMakes(null),[]);assert.equal(mergeProductDetails({thumbnail:null},{images:null}).thumbnail,null);
});

test('legacy and current specification keys read the same value, including camelCase values',async()=>{
 const {readSpecification}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 for(const key of ['rim','rim_size','tire_rim','tire_rim_size','مقاس الجنط'])assert.equal(readSpecification([{specName:key,specValue:'17'}],'tire_rim_size').value,'17');
 assert.equal(readSpecification([{spec_name:'viscosity',spec_value:'5W-30'},{specName:'oil_viscosity',specValue:'5W-30'}],'oil_viscosity').value,'5W-30');
 assert.equal(readSpecification([{spec_name:'height',spec_value:'55'}],'tire_aspect_ratio').value,'55');
 assert.equal(readSpecification([{spec_name:'installation_type',spec_value:'داخلي'}],'installation_type').value,'داخلي');
});
test('conflicting specifications are explicit; editing replaces all aliases and preserves unrelated fields',async()=>{
 const {readSpecification,writeSpecification}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const specs=[{specName:'rim',specValue:'17'},{specName:'tire_rim_size',specValue:'16'},{specName:'rim',specValue:'16'},{specName:'custom',specValue:'preserve'}];
 const result=readSpecification(specs,'tire_rim_size');assert.equal(result.conflict,true);assert.equal(result.value,'');assert.deepEqual(result.values,['17','16']);
 const resolved=writeSpecification(specs,'tire_rim_size','18');assert.deepEqual(resolved,[{specName:'custom',specValue:'preserve'},{specName:'rim',specValue:'18'}]);assert.equal(readSpecification(resolved,'tire_rim_size').value,'18');assert.deepEqual(writeSpecification(specs,'tire_rim_size',''),[{specName:'custom',specValue:'preserve'}]);
 assert.equal(readSpecification([{spec_name:'rim',spec_value:17}],'tire_rim_size',['16']).conflict,true);
});

test('new products use official main sections, while editing preserves a saved legacy category',()=>{
 const rows=mainProductCategories(categories);
 assert.ok(!rows.some(row=>row.id==='brakes'));
 assert.ok(!rows.some(row=>row.type==='service'||row.parent_id));
 assert.ok(rows.some(row=>row.id==='parts'));
 assert.ok(mainProductCategories(categories,'brakes').some(row=>row.id==='brakes'));
});

test('inactive vehicle choices are excluded for new compatibility without losing a saved selection',()=>{
 const rows=[{id:'bmw',is_active:true},{id:'bm',is_active:false},{id:'legacy'},{id:'camel',isActive:false}];
 assert.deepEqual(activeVehicleOptions(rows).map(x=>x.id),['bmw','legacy']);
 assert.deepEqual(activeVehicleOptions(rows,'bm').map(x=>x.id),['bmw','bm','legacy']);
 assert.deepEqual(activeVehicleOptions(undefined),[]);
});
