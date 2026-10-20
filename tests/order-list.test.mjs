import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=(await readFile(new URL('../src/order-list-api.js',import.meta.url),'utf8')).replace("import {adminRequest, queryString, ApiError} from './admin-api';",`const adminRequest=(...args)=>globalThis.orderTestRequest(...args); const queryString=o=>new URLSearchParams(o).toString(); class ApiError extends Error {}`);
const {orderListParams,supplierOptions,createOrderBody}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
test('order filters are sent to the backend before paging',()=>{
 const q=orderListParams({filters:{supplier:'supplier-1',makeId:'make-1',payment:'mada',source:'catalog',date:'2026-10-20',status:'full'},page:3,search:'ORD-9'});
 assert.equal(q.supplierId,'supplier-1');assert.equal(q.makeId,'make-1');assert.equal(q.paymentMethod,'mada');assert.equal(q.source,'catalog');assert.equal(q.returnStatus,'full');assert.equal(q.status,undefined);assert.equal(q.offset,14);assert.equal(q.from,'2026-10-20');assert.equal(q.to,q.from);assert.equal(q.timezone,'Asia/Riyadh');assert.equal(q.search,'ORD-9');
 assert.equal(orderListParams({filters:{status:'confirmed'},tab:'new'}).status,'pending');
 const r=orderListParams({returns:true,filters:{supplier:'ignored'},page:2});assert.equal(r.offset,8);assert.equal(r.supplierId,undefined);
});
test('supplier choices include suppliers beyond both current orders and the first lookup page',async()=>{
 const called=[];globalThis.orderTestRequest=async(path)=>{const q=new URL(path,'https://test.local').searchParams;const offset=Number(q.get('offset'));called.push(offset);return {data:{items:Array.from({length:offset?3:100},(_,i)=>({id:'s'+(i+offset)})),total:103}}};
 const result=await supplierOptions();assert.equal(result.data.length,103);assert.equal(result.data[102].id,'s102');assert.deepEqual(called,[0,100]);
});
test('lookup pagination fails instead of looping when the server ignores offset',async()=>{
 globalThis.orderTestRequest=async()=>({data:{items:Array.from({length:100},(_,i)=>({id:'s'+i})),total:300}});
 await assert.rejects(supplierOptions(),/باقي الموردين/);
});
test('creation sends only catalog IDs and quantities, never local prices, and supports the server default address',()=>{
 const form={userId:'customer-1',addressId:'address-1',paymentMethod:'cash',couponCode:' SAVE ',adminNotes:' ملاحظة ',items:[{productId:'p1',variantId:'v1',quantity:'2',price:1,name:'local preview'}]};
 assert.deepEqual(createOrderBody(form),{userId:'customer-1',addressId:'address-1',paymentMethod:'cash',couponCode:'SAVE',adminNotes:'ملاحظة',items:[{productId:'p1',variantId:'v1',quantity:2}]});
 assert.equal('addressId' in createOrderBody({...form,addressId:''}),false);assert.throws(()=>createOrderBody({...form,items:[{productId:'p1',quantity:1.5}]}),/كمية/);
});
