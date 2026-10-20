import { adminRequest, queryString } from "./admin-api";
export async function exportProductPdf(filters) {
  const popup = window.open("about:blank", "_blank");
  if (!popup) throw new Error("اسمح بفتح نافذة التصدير من المتصفح.");
  try {
    const { limit, offset, ...query } = filters;
    const result = await adminRequest(
      "/api/products/admin/export?" + queryString({ ...query, format: "json" }),
    );
    if (!Array.isArray(result.data)) throw new Error("رد التصدير غير صالح.");
    const doc = popup.document;
    doc.documentElement.lang = "ar";
    doc.documentElement.dir = "rtl";
    doc.title = "تقرير المنتجات";
    const style = doc.createElement("style");
    style.textContent =
      "body{font-family:Tahoma,Arial;padding:24px;color:#172a53}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:10px;text-align:right}th{background:#f3f6ff}";
    doc.head.append(style);
    const heading = doc.createElement("h1");
    heading.textContent = "تقرير المنتجات";
    doc.body.append(heading);
    const table = doc.createElement("table"),
      head = doc.createElement("tr");
    for (const title of [
      "المنتج",
      "رقم القطعة",
      "الماركة",
      "الجودة",
      "السعر",
      "المخزون",
      "الحالة",
    ]) {
      const th = doc.createElement("th");
      th.textContent = title;
      head.append(th);
    }
    table.append(head);
    for (const row of result.data) {
      const tr = doc.createElement("tr");
      for (const value of [
        row.name,
        row.part_number,
        row.brand_name,
        row.quality_name ?? row.quality_tier,
        row.discount_price ?? row.price,
        row.stock_quantity,
        row.status,
      ]) {
        const td = doc.createElement("td");
        td.textContent = String(value ?? "—");
        tr.append(td);
      }
      table.append(tr);
    }
    doc.body.append(table);
    await doc.fonts.ready;
    popup.focus();
    popup.print();
    return result.data.length;
  } catch (error) {
    popup.close();
    throw error;
  }
}
