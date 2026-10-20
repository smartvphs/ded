import {useEffect,useState} from 'react';
import {adminRequest,ApiError} from './admin-api';
export default function useProductDetails(ids,revision){
 const key=JSON.stringify(ids),[state,setState]=useState({key:null,data:{},errors:[],loading:true}),[retry,setRetry]=useState(0);
 useEffect(()=>{const controller=new AbortController();setState({key,data:{},errors:[],loading:ids.length>0});
  Promise.allSettled(ids.map(async id=>{const result=await adminRequest('/api/products/admin/'+encodeURIComponent(id),{signal:controller.signal});if(!result.data||typeof result.data!=='object'||Array.isArray(result.data)||result.data.id!==id)throw new ApiError('تعذر قراءة تفاصيل أحد المنتجات.',0);return [id,result.data]})).then(results=>{
   if(controller.signal.aborted)return;
   setState({key,data:Object.fromEntries(results.filter(r=>r.status==='fulfilled').map(r=>r.value)),errors:results.filter(r=>r.status==='rejected').map(r=>r.reason),loading:false});
  });return()=>controller.abort();
 },[key,revision,retry]);
 const current=state.key===key?state:{key,data:{},errors:[],loading:true};
 return {...current,error:current.errors[0]||null,reload:()=>setRetry(n=>n+1)};
}
