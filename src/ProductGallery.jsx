import React from 'react';
import {ChevronLeft, ChevronRight, Package} from 'lucide-react';
export default function ProductGallery({images=[],selected,onSelect}) {
  const index=Math.max(0,images.indexOf(selected));
  const move=(step)=>onSelect(images[(index+step+images.length)%images.length]);
  return <div className="pp-preview-image pp-product-gallery" role="region" aria-label="صور المنتج"
    tabIndex={images.length>1?0:undefined} onKeyDown={event=>{if(images.length>1&&['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();move(event.key==='ArrowLeft'?1:-1)}}}>
    {images.length ? <img src={images[index]} alt={`معاينة المنتج — صورة ${index+1} من ${images.length}`} /> : <Package size={72} />}
    {images.length>1&&<>
      <button type="button" className="pp-gallery-arrow pp-gallery-prev" aria-label="الصورة السابقة" onClick={()=>move(-1)}><ChevronRight size={20}/></button>
      <button type="button" className="pp-gallery-arrow pp-gallery-next" aria-label="الصورة التالية" onClick={()=>move(1)}><ChevronLeft size={20}/></button>
      <div className="pp-gallery-dots" aria-label="اختيار صورة المنتج">{images.map((src,i)=><button type="button" key={src+i} aria-label={`عرض صورة المنتج ${i+1}`} aria-pressed={i===index} className={i===index?'active':''} onClick={()=>onSelect(src)}/>)}</div>
    </>}
  </div>
}
