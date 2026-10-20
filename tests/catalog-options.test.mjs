import { test } from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source = await readFile(new URL('../src/catalog-options.js', import.meta.url), 'utf8');
const {catalogOptions} = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
test('catalog choices persist values, isolate categories, hide inactive options and preserve saved values', () => {
 const fields = [{key:'oil_type',categoryId:'oil',options:[{value:'synthetic',labelAr:'تخليقي',isActive:true},{value:'old',labelAr:'قديم',isActive:false}]},{key:'oil_type',categoryId:'other',options:[{value:'wrong'}]}];
 assert.deepEqual(catalogOptions(fields,'oil_type','oil'),[{id:'synthetic',name:'تخليقي'}]);
 assert.deepEqual(catalogOptions(fields,'oil_type','oil','old'),[{id:'old',name:'قديم'},{id:'synthetic',name:'تخليقي'}]);
 assert.equal(catalogOptions(fields,'oil_type','tires'),null);
 assert.equal(catalogOptions([{key:'engine',isActive:false}], 'engine'),null);
 assert.deepEqual(catalogOptions([{key:'tire_width',options:[{value:215},{value:'215'}]}],'tire_width',null,205),[{id:'205',name:'205'},{id:'215',name:'215'}]);
});
