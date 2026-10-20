import {useEffect,useState} from 'react';
import {adminRequest,queryString,ApiError} from './admin-api';
export async function loadInventory(partType,signal){
 const items=[],ids=new Set();let offset=0,meta;
 while(true){
  const response=await adminRequest('/api/products/admin?'+queryString({partType,limit:100,offset}),{signal});
  if(!Array.isArray(response.data))throw new ApiError('تعذر قراءة بيانات مخزون المنتجات.',0);
  if(!meta)meta=response.meta||{};
  for(const item of response.data){if(!item?.id||ids.has(item.id))throw new ApiError('تعذر قراءة صفحات المخزون بشكل صحيح. أعد المحاولة.',0);ids.add(item.id);items.push(item)}
  offset+=response.data.length;const total=response.meta?.total;
  if(total!=null?offset>=Number(total):response.data.length<100)break;
  if(!response.data.length)throw new ApiError('لم يُرجع الخادم باقي بيانات المخزون.',0);
 }
 return {data:items,meta};
}
export default function useProductInventory(partType,revision){
 const[state,setState]=useState({data:null,loading:true,error:null,type:null}),[retry,setRetry]=useState(0);
 useEffect(()=>{const controller=new AbortController();setState({data:null,loading:true,error:null,type:partType});
  loadInventory(partType,controller.signal).then(data=>{if(!controller.signal.aborted)setState({data,loading:false,error:null,type:partType})}).catch(error=>{if(!controller.signal.aborted)setState({data:null,loading:false,error,type:partType})});return()=>controller.abort();
 },[partType,revision,retry]);
 return {...(state.type===partType?state:{data:null,loading:true,error:null}),reload:()=>setRetry(n=>n+1)};
}
