import {read,utils,writeFileXLSX} from 'xlsx';
export async function readWorkbook(file){
 if(!/\.(xls|xlsx)$/i.test(file.name))throw new Error('اختر ملف XLS أو XLSX.');
 if(file.size>10*1024*1024)throw new Error('اختر ملفًا أصغر من 10 ميجابايت.');
 const bytes=new Uint8Array(await file.arrayBuffer());
 const zip=bytes[0]===0x50&&bytes[1]===0x4b,ole=bytes[0]===0xd0&&bytes[1]===0xcf,biff=bytes[0]===9&&[0,2,4,8].includes(bytes[1]);
 if(!zip&&!ole&&!biff)throw new Error('محتوى الملف ليس ملف Excel صالحًا.');
 const workbook=read(bytes,{type:'array',sheetRows:10002,cellFormula:false,cellHTML:false});
 if(!workbook.SheetNames.length)throw new Error('الملف لا يحتوي أوراق بيانات.');return workbook;
}
export function sheetRows(workbook,name){
 const sheet=workbook.Sheets[name];if(!sheet)throw new Error('اختر ورقة بيانات.');
 const rows=utils.sheet_to_json(sheet,{raw:false,defval:'',blankrows:false});
 if(rows.length>10000||(sheet['!fullref']&&utils.decode_range(sheet['!fullref']).e.r>10000))throw new Error('الحد الأقصى للملف 10,000 صف؛ قسّمه إلى ملفات أصغر.');
 if(!rows.length)throw new Error('ورقة البيانات فارغة.');
 return rows.map(row=>({sheetRow:row.__rowNum__+1,values:{...row}}));
}
export function downloadTemplate(columns){
 const book=utils.book_new();
 utils.book_append_sheet(book,utils.aoa_to_sheet([columns.map(c=>c.header||c.key)]),'المنتجات');
 utils.book_append_sheet(book,utils.aoa_to_sheet([['العمود','مطلوب','مثال','ملاحظات'],...columns.map(c=>[c.header||c.key,c.required?'نعم':'لا',c.example??'',c.notes??''])]),'شرح الأعمدة');
 writeFileXLSX(book,'product-import-template.xlsx');
}
