import {adminRequest, ApiError} from './admin-api';

export const counterKeys = {parts: 'products', orders: 'orders', visitors: 'visitors', customers: 'customers'};
export function contentItem(row) {
  return {...row, title: row.titleAr ?? row.title_ar ?? row.title ?? row.name ?? '',
    description: row.descriptionAr ?? row.description_ar ?? row.description ?? '',
    image: row.imageUrl ?? row.image_url ?? row.logoUrl ?? row.logo_url ?? row.iconUrl ?? row.icon_url ?? null,
    url: row.linkValue ?? row.link_value ?? '',
    text: row.message ?? '', phone: row.supportPhone ?? row.support_phone ?? '',
    button: row.buttonText ?? row.button_text ?? '', link: row.buttonUrl ?? row.button_url ?? '',
    categoryId: row.categoryId ?? row.category_id ?? null};
}
export function counterBody(value) {
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value))) throw new ApiError('أدخل عددًا صحيحًا موجبًا أو صفرًا.', 0);
  return {mode: 'manual', manualValue: Number(value), suffix: '+'};
}
export function announcementBody({title, phone, description, url}) {
  if (!title.trim() || !phone.trim() || !description.trim() || !url.trim()) throw new ApiError('أدخل نص الرسالة ورقم الدعم ونص الزر ورابطه.', 0);
  return {message: title.trim(), supportPhone: phone.replace(/[\s()-]/g, ''), buttonText: description.trim(), buttonUrl: url.trim(), isActive: true};
}
export async function uploadContentImage(dataUrl, type) {
  if (!dataUrl?.startsWith('data:image/')) throw new ApiError('اختر صورة أولًا.', 0);
  const blob = await (await fetch(dataUrl)).blob();
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(blob.type) || blob.size > 3 * 1024 * 1024) throw new ApiError('اختر صورة JPG أو PNG أو WebP أصغر من 3 ميجابايت.', 0);
  const {data} = await adminRequest(`/api/uploads/signature?type=${encodeURIComponent(type)}&strictFormats=true`);
  if (!data?.signature || !data.apiKey || !data.cloudName) throw new ApiError('تعذر الحصول على توقيع رفع الصورة.', 0);
  const expected = `https://api.cloudinary.com/v1_1/${encodeURIComponent(data.cloudName)}/image/upload`;
  if (data.uploadUrl && data.uploadUrl !== expected) throw new ApiError('عنوان رفع الصور غير متوقع.', 0);
  if (data.maxFileSizeBytes && blob.size > data.maxFileSizeBytes) throw new ApiError('الصورة أكبر من الحجم المسموح من الخادم.', 0);
  const form = new FormData();
  for (const [key, value] of Object.entries(data.uploadParams || {folder: data.folder, timestamp: data.timestamp})) if (value !== undefined && value !== null) form.set(key, String(value));
  form.set('api_key', data.apiKey); form.set('signature', data.signature); form.set('file', blob, 'content-image.' + (blob.type === 'image/jpeg' ? 'jpg' : blob.type.split('/')[1]));
  const response = await fetch(expected, {method: 'POST', body: form, credentials: 'omit', signal: AbortSignal.timeout(60000)});
  const uploaded = await response.json();
  if (!response.ok || typeof uploaded.secure_url !== 'string' || !uploaded.secure_url.startsWith('https://')) throw new ApiError('تعذر رفع الصورة. حاول مرة أخرى.', response.status);
  return uploaded.secure_url;
}

export function reviewItem(row, manual) {
  return {...row, id: row.id, name: manual ? row.customerName ?? row.customer_name ?? '' : row.reviewer_name ?? '',
    description: row.comment ?? '', rating: Number(row.rating) || 0,
    image: manual ? row.avatarUrl ?? row.avatar_url ?? null : null,
    active: manual ? (row.isActive ?? row.is_active ?? true) : row.status !== 'hidden', manual};
}
export function testimonialBody({title, description, rating, avatarUrl}) {
  const name = title.trim(), comment = description.trim();
  if (!name || name.length > 100 || !comment || comment.length > 1000 || !Number.isInteger(rating) || rating < 1 || rating > 5) throw new ApiError('أدخل اسم العميل (حتى 100 حرف) والتعليق (حتى 1000 حرف) وتقييمًا من 1 إلى 5.', 0);
  return {customerName: name, comment, rating, ...(avatarUrl ? {avatarUrl} : {})};
}
export function purchaseBody({productId,city,district,addressText}){
 if(!productId||!city.trim())throw new ApiError('اختر المنتج وأدخل المدينة أولًا.',0);
 return {productId,city:city.trim(),district:district.trim()||null,addressText:addressText.trim()||null};
}
export function purchaseItem(row){
 return {...row,id:row.id,title:row.productName??row.product_name??'',image:row.thumbnail??null,
  productId:row.productId??row.product_id,city:row.city||'',district:row.district||'',addressText:row.addressText??row.address_text??'',
  description:[row.city,row.district].filter(Boolean).join(' - '),active:row.isActive??row.is_active??true,available:row.productAvailable??row.product_available??true};
}
