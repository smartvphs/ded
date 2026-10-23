// Browser contract test. Run a Vite server first; PLAYWRIGHT_MODULE may point to an existing playwright-core installation.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const assert=require('node:assert/strict');
const base='https://car-parts-backend.vercel.app';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX7kAAAAASUVORK5CYII=','base64');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
 const context=await browser.newContext({viewport:{width:1440,height:1100}});
 await context.addInitScript(()=>{localStorage.setItem('mypart.admin.session.v1',JSON.stringify({verified:true,accessToken:'contract-test',admin:{name:'اختبار'}}));sessionStorage.setItem('mypart.screen','definitions')});
 const page=await context.newPage();let errors=[],calls=[],failNext=null,uploadFail=false,badCounters=false;
 page.on('pageerror',e=>errors.push(e.message));
 const db={counters:['products','orders','visitors','customers'].map((key,i)=>({key,value:i,display:String(i),mode:'live'})),partners:[{id:'partner-1',name:'شريك من السيرفر',logo_url:'https://example.com/partner.png'}],features:[{id:'feature-1',title_ar:'ميزة من السيرفر',description_ar:'تفاصيل الميزة',icon_url:null}],policies:[{id:'policy-1',slug:'privacy-policy',title_ar:'سياسة الخصوصية والاستخدام',content_ar:'نص السياسة من السيرفر',is_published:true}],banners:[{id:'banner-1',platform:'web',placement:'category',category_id:'cat-1',title:'بنر من السيرفر',image_url:'https://example.com/banner.png'}],bars:[{id:'bar-1',message:'رسالة من السيرفر',support_phone:'+966500000000',button_text:'تسوق الآن',button_url:'/offers'}]};
 const reply=(r,data,status=200)=>r.fulfill({status,contentType:'application/json',body:JSON.stringify({success:status<400,data,...(status>=400?{message:'فشل تجريبي'}:{})})});
 await context.route(base+'/**',async r=>{
  const req=r.request(),u=new URL(req.url()),method=req.method(),body=req.postDataJSON();
  calls.push({path:u.pathname,search:u.search,method,body});assert.equal(req.headers().authorization,'Bearer contract-test');
  if(failNext===method+' '+u.pathname){failNext=null;return reply(r,null,422)}
  if(u.pathname==='/api/home-purchases/admin')return reply(r,{manualEnabled:false,items:[]});
  if(u.pathname==='/api/products/admin')return reply(r,[]);
  if(u.pathname==='/api/uploads/signature')return reply(r,{cloudName:'contract-test',apiKey:'test-key',signature:'test-signature',timestamp:123,folder:'content',uploadUrl:'https://api.cloudinary.com/v1_1/contract-test/image/upload',uploadParams:{timestamp:123,folder:'content',allowed_formats:'jpg,jpeg,png,webp'},maxFileSizeBytes:5242880});
  if(u.pathname==='/api/categories/admin')return reply(r,[{id:'cat-1',name_ar:'تسوق قطع الغيار',parent_id:null},{id:'cat-2',name_ar:'الزيوت',parent_id:null},{id:'sub-1',name_ar:'فرعي',parent_id:'cat-1'}]);
  if(u.pathname==='/api/home/counters/admin'&&method==='GET')return reply(r,badCounters?{}:db.counters);
  if(u.pathname.startsWith('/api/home/counters/admin/')&&method==='PATCH'){
   assert.equal(body.mode,'manual');assert.equal(body.suffix,'+');const row=db.counters.find(x=>x.key===u.pathname.split('/').pop());Object.assign(row,{value:body.manualValue,display:body.manualValue+'+'});return reply(r,row);
  }
  const mapping=[['/api/partners','partners'],['/api/platform-features','features'],['/api/policies','policies'],['/api/banners','banners'],['/api/announcement-bars','bars']].find(([prefix])=>u.pathname.startsWith(prefix));
  if(mapping){const [prefix,key]=mapping;const id=u.pathname.slice(prefix.length+1);
   if(method==='GET')return reply(r,key==='banners'?db[key].filter(x=>x.placement===u.searchParams.get('placement')):db[key]);
   if(method==='DELETE'){db[key]=db[key].filter(x=>x.id!==id);return reply(r,null)}
   if(method==='POST'){assert.ok(!JSON.stringify(body).includes('data:image'));const row={id:key+'-'+Date.now(),...body};db[key].push(row);return reply(r,row,201)}
   if(method==='PUT'){const row=db[key].find(x=>x.id===id);assert.ok(row);Object.assign(row,body);return reply(r,row)}
  }
  throw new Error('Unexpected request '+method+' '+u.pathname);
 });
 await context.route('https://api.cloudinary.com/**',r=>{
  const data=r.request().postDataBuffer().toString();for(const x of ['allowed_formats','jpg,jpeg,png,webp','api_key','signature','file'])assert.ok(data.includes(x),x);
  return r.fulfill({status:uploadFail?400:200,contentType:'application/json',body:JSON.stringify(uploadFail?{error:'upload failed'}:{secure_url:'https://res.cloudinary.com/contract-test/image/upload/saved.png'})});
 });
 const nav=async name=>{console.log('NAV',name);await page.locator('.definitions-subnav').getByRole('button',{name,exact:true}).click()};
 const tab=async name=>{console.log('TAB',name);await page.locator('.definition-tabs').getByRole('button',{name,exact:true}).click()};
 const add=()=>page.locator('.definition-form button[type=submit]').click();
 const upload=async()=>{await page.locator('.upload-box input[type=file]').setInputFiles({name:'test.png',mimeType:'image/png',buffer:png});await page.locator('.upload-preview').waitFor()};
 const saved=async()=>{await page.getByRole('status').filter({hasText:'تم الحفظ على الخادم.'}).waitFor()};
 const del=async locator=>{await locator.click();await page.locator('.delete-options').getByRole('button',{name:'حذف',exact:true}).click();await page.locator('.modal-backdrop').waitFor({state:'hidden'})};
 await page.route('**/api/admin/notifications?*', r => r.fulfill({status:200, contentType:'application/json', body:JSON.stringify({success:true,data:{items:[],unreadCount:0},meta:{total:0}})}));
    await page.goto(process.env.TEST_BASE_URL || 'http://127.0.0.1:5182');await page.locator('.platform-number b').first().filter({hasText:'0'}).waitFor();
 await page.getByLabel('عدد القطع المتوفرة',{exact:true}).fill('5000');await page.getByLabel('عدد العملاء',{exact:true}).fill('0');await add();await saved();assert.deepEqual(db.counters.map(r=>r.value),[5000,1,2,0]);await page.reload();await page.locator('.platform-number b').first().filter({hasText:'5000+'}).waitFor();
 await tab('شركاء نجاح');await page.locator('.partner-card').waitFor();await upload();await add();await saved();await page.waitForFunction(()=>document.querySelectorAll('.partner-card').length===2);await del(page.locator('.partner-card .def-delete').last());assert.equal(db.partners.length,1);
 // Failed save preserves the selected image, shows no fake item, and can be retried.
 await upload();failNext='POST /api/partners';await add();await page.getByRole('status').filter({hasText:'فشل تجريبي'}).waitFor();assert.equal(db.partners.length,1);assert.equal(await page.locator('.upload-preview').count(),1);await add();await saved();await page.waitForFunction(()=>document.querySelectorAll('.partner-card').length===2);
 // Failed upload must never create a content row.
 await upload();uploadFail=true;const before=calls.filter(c=>c.method==='POST'&&c.path==='/api/partners').length;await add();await page.getByRole('status').filter({hasText:'تعذر رفع الصورة'}).waitFor();assert.equal(calls.filter(c=>c.method==='POST'&&c.path==='/api/partners').length,before);uploadFail=false;
 await tab('لماذا منصتنا');await page.getByText('ميزة من السيرفر',{exact:true}).waitFor();await upload();await page.getByLabel('عنوان*',{exact:true}).fill('ميزة جديدة');await page.getByLabel('الوصف',{exact:true}).fill('وصف جديد');await add();await saved();assert.equal(db.features.at(-1).titleAr,'ميزة جديدة');await page.getByText('ميزة جديدة',{exact:true}).waitFor();await del(page.locator('.why-card').last().locator('.def-delete'));
 await nav('السياسات');await page.getByRole('textbox',{name:'نص السياسة'}).filter({hasText:'نص السياسة من السيرفر'}).waitFor();await page.getByRole('textbox',{name:'نص السياسة'}).fill('نص محفوظ\nبدون HTML');await page.getByRole('button',{name:'حفظ',exact:true}).click();await saved();assert.equal(db.policies[0].contentAr,'نص محفوظ\nبدون HTML');
 await page.getByRole('button',{name:'إضافة جديد',exact:true}).click();await page.getByLabel('عنوان السياسة').fill('سياسة جديدة للاختبار');await page.locator('.modal').getByLabel('الوصف').fill('نص السياسة الجديدة');await page.getByRole('button',{name:'حفظ ونشر'}).click();await page.getByRole('button',{name:'سياسة جديدة للاختبار',exact:true}).waitFor();assert.equal(db.policies.length,2);
 await nav('بنرات الأقسام');await page.getByText('بنر من السيرفر',{exact:true}).waitFor();assert.equal(await page.locator('.definition-tabs button').count(),2);await upload();await page.getByLabel('عنوان البنر').fill('بنر محدث');await page.getByLabel('الوصف',{exact:true}).fill('وصف البنر');await add();await saved();assert.equal(db.banners[0].title,'بنر محدث');assert.equal(calls.filter(c=>c.method==='PUT'&&c.path==='/api/banners/banner-1').length,1);
 await tab('الزيوت');await upload();await page.getByLabel('عنوان البنر').fill('بنر زيوت');await add();await saved();assert.equal(db.banners.at(-1).categoryId,'cat-2');assert.equal(db.banners.at(-1).placement,'category');await page.getByText('بنر زيوت',{exact:true}).waitFor();await del(page.locator('.banner-result .def-delete'));
 await nav('الإعلانات');await upload();await page.getByLabel('عنوان الإعلان').fill('إعلان جديد');await page.getByLabel('عنوان الرابط').fill('/offers');await page.getByLabel('الوصف',{exact:true}).fill('خصومات جديدة');await add();await saved();assert.equal(db.banners.at(-1).placement,'popup');assert.equal(db.banners.at(-1).linkValue,'/offers');await page.locator('.ad-card').waitFor();await del(page.locator('.ad-card .def-delete'));
 await nav('الشريط الإعلاني');await page.getByText('رسالة من السيرفر',{exact:true}).waitFor();assert.equal(await page.locator('.ticker-preview b').innerText(),'+966500000000');await page.getByLabel('نص الرسالة').fill('شحن مجاني');await page.getByLabel('رقم الدعم').fill('050 123 4567');await page.getByLabel('نص الزر').fill('تسوق الآن');await page.getByLabel('رابط الزر').fill('/offers');await add();await saved();assert.equal(db.bars.at(-1).supportPhone,'0501234567');assert.equal(db.bars.at(-1).message,'شحن مجاني');await page.waitForFunction(()=>document.querySelectorAll('.ticker-preview').length===2);await del(page.locator('.ticker-preview .def-delete').last());
 await nav('السكشن التعريفي');await tab('آخر مشتريات العملاء');await page.waitForFunction(()=>!document.querySelector('.definition-form fieldset').disabled);assert.equal(await page.locator('.purchase-card').count(),0);
 await tab('أرقامنا');await page.locator('.definition-form input').first().waitFor();await page.waitForFunction(()=>!document.querySelector('.definition-form fieldset').disabled);await page.getByLabel('عدد الطلبات',{exact:true}).fill('20');await page.getByLabel('عدد العملاء',{exact:true}).fill('30');failNext='PATCH /api/home/counters/admin/customers';await add();await page.getByRole('status').filter({hasText:'تم حفظ 1 من 2 عدادات'}).waitFor();assert.equal(db.counters[1].value,20);assert.equal(db.counters[3].value,0);
 // Malformed/unauthorized reads must not become empty editable success states.
 badCounters=true;await tab('شركاء نجاح');await tab('أرقامنا');await page.getByRole('alert').filter({hasText:'قائمة بيانات صالحة'}).waitFor();assert.equal(await page.locator('.definition-form button[type=submit]').isDisabled(),true);badCounters=false;
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
 console.log('PASS: counters including zero/partial failures/reload, signed uploads and upload failures, partners/features create/delete, policies read/save/create, category banners update/create/delete, popup ads and announcements create/delete, malformed responses, purchase loading, mobile and zero JS errors.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
