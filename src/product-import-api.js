export function importBatchSize(maxRows){return Math.max(1,Math.min(100,Number.isInteger(Number(maxRows))?Number(maxRows):100));}
export function duplicateSkuRows(rows,columns){
 const sku=columns.find(c=>String(c.key).toLowerCase()==='sku'),aliases=new Set(['sku',String(sku?.header||'').trim().toLowerCase()]);
 const seen=new Set(),duplicates=new Map();
 for(const entry of rows){const key=Object.keys(entry.values).find(k=>aliases.has(k.trim().toLowerCase()));const value=key?String(entry.values[key]??'').trim():'';if(!value)continue;if(seen.has(value))duplicates.set(entry.sheetRow,{row:entry.sheetRow,status:'failed',name:entry.values.name||entry.values['اسم المنتج']||'',errors:[{field:key,message:'SKU مكرر داخل الملف.'}]});else seen.add(value)}
 return duplicates;
}
export function importResults(data,batch,dryRun){
 if(!Array.isArray(data?.results))throw new Error('رد الاستيراد غير مكتمل.');
 const allowed=dryRun?['valid','failed','skipped']:['created','failed','skipped'];const mapped=new Map();
 for(const result of data.results){const index=Number(result.row)-2;
  if(!Number.isInteger(index)||index<0||index>=batch.length||!allowed.includes(result.status)||mapped.has(index))throw new Error('رد الاستيراد يحتوي نتائج غير متوقعة.');
  mapped.set(index,{...result,row:batch[index].sheetRow});
 }
 if(mapped.size!==batch.length)throw new Error('لم يُرجع الخادم نتيجة لكل صف.');
 return [...mapped.values()];
}
