// Run with a Vite server and PLAYWRIGHT_MODULE pointing to playwright-core if it is not locally installed.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
 const context=await browser.newContext({viewport:{width:1440,height:1100}});
 await context.addInitScript(()=>{localStorage.setItem('mypart.admin.session.v1',JSON.stringify({verified:true,accessToken:'orders-contract-test',admin:{name:'اختبار'}}));sessionStorage.setItem('mypart.screen','orders')});
 const page=await context.newPage(),errors=[],calls=[];let missingAddresses=true,failCreate=false,createCount=0;
 page.on('pageerror',e=>errors.push(e.message));
 const reply=(r,data,meta,status=200)=>r.fulfill({status,contentType:'application/json',body:JSON.stringify({success:status<400,data,meta,...(status>=400?{message:'رفض إنشاء الطلب للتجربة'}:{})})});
 await context.route('https://car-parts-backend.vercel.app/**',async r=>{
 const req=r.request(),u=new URL(req.url()),p=u.pathname,q=u.searchParams,method=req.method();calls.push({p,q:Object.fromEntries(q),method});assert.equal(req.headers().authorization,'Bearer orders-contract-test');
 if(p==='/api/suppliers/admin'){const offset=Number(q.get('offset'));return reply(r,{items:offset?[{id:'supplier-101',name:'مورد خارج الصفحة'}]:Array.from({length:100},(_,i)=>({id:'supplier-'+i,name:'المورد '+i})),total:101})}
 if(p==='/api/cars/admin/makes')return reply(r,[{id:'make-1',name_ar:'تويوتا',name_en:'Toyota'}]);
 if(p==='/api/orders/all'){
  const filtered=q.has('supplierId')||q.has('makeId')||q.has('paymentMethod')||q.has('source');
  const row={id:'order-1',order_number:filtered?'ORDER-FILTERED':'ORDER-ALL',customer_name:'عميل حقيقي',suppliers:[{id:'supplier-101',name:'مورد خارج الصفحة'}],payment_method:'mada',status:'confirmed',total:'125',items_count:1,created_at:'2026-10-20T10:00:00Z'};
  return reply(r,[row],{total:filtered?1:21,statusCounts:{all:21,pending:7,confirmed:14,shipped:0,delivered:0,cancelled:0}});
 }
 if(p==='/api/admin/customers')return reply(r,[{id:'customer-1',name:'عميل أول',phone:'+966500000001'}],{total:1});
 if(p==='/api/admin/customers/customer-1')return reply(r,{id:'customer-1',name:'عميل أول',addresses_count:1,...(!missingAddresses?{addresses:[{id:'address-1',city:'الرياض',district:'النخيل'}]}:{})});
 if(p==='/api/products/admin')return reply(r,[{id:'product-1',name:'فلتر أصلي',price:'125',part_number:'PN1'}],{total:1});
 if(p==='/api/products/admin/product-1')return reply(r,{id:'product-1',name:'فلتر أصلي',price:'125',images:[],variants:[]});
 if(p==='/api/orders/admin'&&method==='POST'){
  createCount++;const body=req.postDataJSON();assert.deepEqual(body,{userId:'customer-1',addressId:'address-1',items:[{productId:'product-1',quantity:2}],paymentMethod:'cash',adminNotes:'ملاحظة الاختبار'});
  if(failCreate)return reply(r,null,null,422);return reply(r,{id:'new-order'},null,201);
 }
 if(p==='/api/orders/admin/new-order')return reply(r,{id:'new-order',order_number:'NEW-SERVER-ORDER',customer:{name:'عميل أول'},status:'pending',items:[],total:'250'});
 throw new Error('Unexpected '+method+' '+p);
 });
 await page.goto(process.env.TEST_BASE_URL||'http://127.0.0.1:5182/#orders');await page.getByRole('button',{name:'ORDER-ALL',exact:true}).waitFor();
 await page.getByLabel('إسم المورد',{exact:true}).selectOption('supplier-101');await page.getByLabel('الشركات',{exact:true}).fill('تويوتا');await page.getByLabel('وسيلة الدفع',{exact:true}).selectOption('mada');await page.getByLabel('إظهار الطلبات',{exact:true}).selectOption('catalog');await page.getByLabel('تاريخ الطلب',{exact:true}).fill('2026-10-20');
 await page.getByRole('button',{name:'البحث و التصنيف',exact:true}).click();await page.getByRole('button',{name:'ORDER-FILTERED',exact:true}).waitFor();
 let last=calls.filter(c=>c.p==='/api/orders/all').at(-1).q;for(const [k,v]of Object.entries({supplierId:'supplier-101',makeId:'make-1',paymentMethod:'mada',source:'catalog',from:'2026-10-20',to:'2026-10-20',offset:'0'}))assert.equal(last[k],v);
 assert.equal(await page.getByText('فلاتر المورد والشركة والدفع والمصدر تطبّق على نتائج الصفحة الحالية.').count(),0);
 await page.getByRole('button',{name:'مسح الفلاتر',exact:true}).click();await page.getByRole('button',{name:'ORDER-ALL',exact:true}).waitFor();await page.getByRole('button',{name:'التالي',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.op-pager .active')?.textContent==='2');
 await page.getByLabel('البحث في الطلبات').fill('اسم عميل');await page.waitForResponse(r=>r.url().includes('/api/orders/all?')&&new URL(r.url()).searchParams.get('search')==='اسم عميل');last=calls.filter(c=>c.p==='/api/orders/all').at(-1).q;assert.equal(last.offset,'0');
 await page.getByRole('button',{name:'إضافة جديد',exact:true}).click();await page.getByLabel('العميل',{exact:true}).selectOption('customer-1');await page.getByText('تعذر تحميل عناوين العميل.',{exact:false}).waitFor();assert.equal(await page.getByRole('button',{name:'حفظ الطلب',exact:true}).isDisabled(),true);assert.equal(createCount,0);
 // Positive creation is conditional on an address actually supplied by the API, not an invented/default address.
 missingAddresses=false;await page.getByLabel('العميل',{exact:true}).selectOption('');await page.getByLabel('العميل',{exact:true}).selectOption('customer-1');await page.getByLabel('عنوان التوصيل',{exact:true}).selectOption('address-1');await page.getByLabel('المنتج',{exact:true}).selectOption('product-1');await page.getByLabel('الكمية',{exact:true}).fill('2');await page.getByRole('button',{name:'إضافة منتج للطلب',exact:true}).click();await page.getByLabel('ملاحظات الإدارة',{exact:true}).fill('ملاحظة الاختبار');
 failCreate=true;await page.getByRole('button',{name:'حفظ الطلب',exact:true}).click();await page.getByRole('alert').filter({hasText:'رفض إنشاء الطلب'}).waitFor();assert.equal(await page.locator('.op-items-table tbody tr').count(),1);assert.equal(await page.getByLabel('العميل',{exact:true}).inputValue(),'customer-1');
 failCreate=false;await page.getByRole('button',{name:'حفظ الطلب',exact:true}).click();await page.getByText('NEW-SERVER-ORDER',{exact:true}).waitFor();assert.equal(createCount,2);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
 console.log('PASS: all supplier pages, server-side filters/search/pagination/reset, creation blocked without an address, conditional creation payload/failure/retry, server order navigation, mobile and no JS errors.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
