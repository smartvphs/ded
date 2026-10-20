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
