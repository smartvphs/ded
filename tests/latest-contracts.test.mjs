import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const XLSX=require('xlsx');
async function standalone(file,replacements=[]){let source=await readFile(new URL('../src/'+file,import.meta.url),'utf8');for(const[a,b]of replacements)source=source.replace(a,b);return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))}
const {importBatchSize,duplicateSkuRows,importResults}=await standalone('product-import-api.js');
test('imports preserve original sheet row numbers and reject incomplete acknowledgements',()=>{
 const batch=[{sheetRow:103,values:{}},{sheetRow:105,values:{}}];
 assert.deepEqual(importResults({results:[{row:2,status:'created'},{row:3,status:'failed',errors:[{field:'price',message:'bad'}]}]},batch,false).map(r=>r.row),[103,105]);
 assert.throws(()=>importResults({results:[{row:2,status:'created'}]},batch,false));assert.throws(()=>importResults({results:[{row:2,status:'created'},{row:2,status:'created'}]},batch,false));assert.throws(()=>importResults({results:[{row:2,status:'created'},{row:3,status:'valid'}]},batch,false));
 assert.equal(importBatchSize(200),100);assert.equal(importBatchSize(30),30);
});
test('duplicate SKUs across batch boundaries are identified before any import request',()=>{
 const rows=Array.from({length:103},(_,i)=>({sheetRow:i+2,values:{SKU:i===102?' SKU-0 ':'SKU-'+i}}));const duplicates=duplicateSkuRows(rows,[{key:'sku',header:'SKU'}]);assert.deepEqual([...duplicates.keys()],[104]);
});
globalThis.testXLSX=XLSX;const {readWorkbook,sheetRows}=await standalone('spreadsheet.js',[["import {read,utils,writeFileXLSX} from 'xlsx';","const {read,utils,writeFileXLSX}=globalThis.testXLSX;"]]);
test('both XLS and XLSX parsing preserve blank-row positions and reject renamed non-Excel files',async()=>{
 const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([['اسم المنتج','SKU'],['منتج','A'],[],['منتج آخر','B']]),'المنتجات');
 for(const kind of ['xlsx','biff8']){const bytes=XLSX.write(book,{type:'buffer',bookType:kind});const parsed=await readWorkbook({name:kind==='xlsx'?'a.xlsx':'a.xls',size:bytes.length,arrayBuffer:async()=>bytes});const rows=sheetRows(parsed,'المنتجات');assert.deepEqual(rows.map(r=>r.sheetRow),[2,4]);assert.equal(rows[1].values.SKU,'B');assert.equal('__rowNum__' in rows[0].values,false)}
 await assert.rejects(()=>readWorkbook({name:'fake.xlsx',size:2,arrayBuffer:async()=>new Uint8Array([1,2])}),/صالح/);
});
const {addressBody}=await standalone('customer-address.js',[["import {ApiError} from './admin-api';","class ApiError extends Error {}"]]);
test('new addresses require a city and omit empty optional fields',()=>{
 assert.deepEqual(addressBody({city:' الرياض ',district:'النخيل',phone:'',isDefault:true}),{city:'الرياض',district:'النخيل',isDefault:true});assert.throws(()=>addressBody({city:' '}));
});
