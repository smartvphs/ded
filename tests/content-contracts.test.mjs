import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=(await readFile(new URL('../src/definitions-api.js',import.meta.url),'utf8')).replace("import {adminRequest, ApiError} from './admin-api';",'const adminRequest=()=>{throw new Error("Unexpected network")}; class ApiError extends Error {}');
const {reviewItem,testimonialBody}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
test('manual testimonials and product reviews retain their distinct names, avatars and visibility',()=>{
 const manual=reviewItem({id:'manual',customer_name:'يدوي',avatar_url:'https://example.com/avatar.png',comment:'نص',rating:5,is_active:false},true);
 assert.equal(manual.name,'يدوي');assert.equal(manual.active,false);assert.equal(manual.manual,true);assert.equal(manual.image,'https://example.com/avatar.png');
 const real=reviewItem({id:'review',reviewer_name:'حقيقي',comment:'تعليق',rating:4,status:'hidden'},false);
 assert.equal(real.name,'حقيقي');assert.equal(real.manual,false);assert.equal(real.active,false);assert.equal(real.image,null);
});
test('testimonial mutations validate limits and never send a review product ID or local data URL',()=>{
 assert.deepEqual(testimonialBody({title:' اسم ',description:' تعليق ',rating:5}),{customerName:'اسم',comment:'تعليق',rating:5});
 for(const values of [{title:'',description:'نص',rating:5},{title:'اسم',description:'x'.repeat(1001),rating:5},{title:'اسم',description:'نص',rating:0},{title:'اسم',description:'نص',rating:3.5}])assert.throws(()=>testimonialBody(values));
});
