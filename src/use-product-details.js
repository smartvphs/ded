import {useEffect,useState} from 'react';
import {adminRequest,ApiError} from './admin-api';
export default function useProductDetails(ids,revision){
 const key=JSON.stringify(ids),[state,setState]=useState({key:null,data:{},errors:[],settled:{},loading:true}),[retry,setRetry]=useState(0);
 useEffect(()=>{const controller=new AbortController();setState({key,data:{},errors:[],settled:{},loading:ids.length>0});
  // Reveal each product as soon as it arrives. One slow request must not hide
  // the specifications and reviews already received for all other products.
  ids.forEach(async id=>{try{const result=await adminRequest('/api/products/admin/'+encodeURIComponent(id),{signal:controller.signal});if(!result.data||typeof result.data!=='object'||Array.isArray(result.data)||result.data.id!==id)throw new ApiError('تعذر قراءة تفاصيل أحد المنتجات.',0);
   if(!controller.signal.aborted)setState(s=>{const settled={...s.settled,[id]:true};return {...s,data:{...s.data,[id]:result.data},settled,loading:Object.keys(settled).length<ids.length}});
  }catch(error){if(!controller.signal.aborted)setState(s=>{const settled={...s.settled,[id]:true};return {...s,errors:[...s.errors,error],settled,loading:Object.keys(settled).length<ids.length}})}});
  return()=>controller.abort();
 },[key,revision,retry]);
 const current=state.key===key?state:{key,data:{},errors:[],settled:{},loading:true};
 return {...current,error:current.errors[0]||null,reload:()=>setRetry(n=>n+1)};
}
