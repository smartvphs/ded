import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../src/product-catalog.js',import.meta.url),'utf8');
const {categoryFilters,inventorySummary,mergeProductDetails,compatibilityMakes}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
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
