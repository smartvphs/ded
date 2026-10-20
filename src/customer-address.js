import {ApiError} from './admin-api';
export function addressBody(form){
 const city=form.city.trim();if(!city)throw new ApiError('أدخل المدينة أولًا.',0);
 return {city,...Object.fromEntries(['district','street','buildingNo','shortAddress','phone','label'].filter(k=>form[k]?.trim()).map(k=>[k,form[k].trim()])),isDefault:Boolean(form.isDefault)};
}
