import { adminRequest } from "./admin-api";
export async function priceSheet(file) {
  if (!/\.(xlsx|xls|csv)$/i.test(file.name) || file.size > 10 * 1024 * 1024)
    throw new Error("اختر Excel أو CSV بحجم لا يتجاوز 10 ميجابايت.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (
    !/\.csv$/i.test(file.name) &&
    !(
      (bytes[0] === 0x50 && bytes[1] === 0x4b) ||
      (bytes[0] === 0xd0 && bytes[1] === 0xcf) ||
      (bytes[0] === 9 && [0, 2, 4, 8].includes(bytes[1]))
    )
  )
    throw new Error("محتوى الملف غير صالح.");
  const { read, utils } = await import("xlsx");
  let source = bytes;
  const csv = /\.csv$/i.test(file.name);
  if (csv) {
    try {
      source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      source = new TextDecoder("windows-1256").decode(bytes);
    }
  }
  const book = read(source, {
    type: csv ? "string" : "array",
    ...(csv ? { raw: true } : {}),
    sheetRows: 20001,
    cellFormula: false,
    cellHTML: false,
  });
  const sheet = book.Sheets[book.SheetNames[0]];
  if (!sheet) throw new Error("لا توجد ورقة بيانات.");
  const rows = utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: "",
    blankrows: false,
  });
  if (
    rows.length < 2 ||
    rows.length > 20000 ||
    (sheet["!fullref"] && utils.decode_range(sheet["!fullref"]).e.r >= 20000)
  )
    throw new Error("الملف فارغ أو يتجاوز 20,000 صف.");
  return rows;
}
export async function uploadPriceFile(file) {
  const { data } = await adminRequest(
    "/api/uploads/signature?type=price-lists&resource=raw",
  );
  if (!data?.signature || !data.apiKey || !data.cloudName)
    throw new Error("توقيع رفع الملف غير مكتمل.");
  const expected =
    "https://api.cloudinary.com/v1_1/" +
    encodeURIComponent(data.cloudName) +
    "/raw/upload";
  if (data.uploadUrl && data.uploadUrl !== expected)
    throw new Error("عنوان الرفع غير متوقع.");
  if (data.maxFileSizeBytes && file.size > data.maxFileSizeBytes)
    throw new Error("الملف أكبر من المسموح.");
  const form = new FormData();
  for (const [k, v] of Object.entries(
    data.uploadParams || { folder: data.folder, timestamp: data.timestamp },
  ))
    if (v != null) form.set(k, String(v));
  form.set("api_key", data.apiKey);
  form.set("signature", data.signature);
  form.set("file", file);
  const response = await fetch(expected, {
      method: "POST",
      body: form,
      credentials: "omit",
      signal: AbortSignal.timeout(60000),
    }),
    reply = await response.json();
  if (!response.ok || !reply.secure_url?.startsWith("https://"))
    throw new Error("تعذر رفع الملف.");
  return reply.secure_url;
}
