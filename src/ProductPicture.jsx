import React, {useState} from 'react';
export const DEFAULT_PRODUCT_IMAGE = '/images/products/default-product.jpeg';
export default function ProductPicture({src,...props}) {
  const [failedSource,setFailedSource]=useState(null);
  const current=src && failedSource!==src ? src : DEFAULT_PRODUCT_IMAGE;
  return <img {...props} src={current} onError={()=>{if(current!==DEFAULT_PRODUCT_IMAGE)setFailedSource(src)}} />;
}
