import { useEffect, useState } from "react";
import { adminRequest, queryString } from "./admin-api";
import { supplierOptions } from "./order-list-api";
export default function useSupplierActivity() {
  const [state, setState] = useState({
    loading: true,
    data: null,
    error: null,
  });
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const today = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Riyadh",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(new Date()),
          start = new Date(today + "T00:00:00Z");
        start.setUTCDate(start.getUTCDate() - 29);
        const period = { from: start.toISOString().slice(0, 10), to: today };
        const suppliers = (await supplierOptions(controller.signal)).data;
        if (suppliers.length > 500)
          throw new Error("عدد الموردين كبير؛ يلزم مسار تجميعي لخريطة النشاط.");
        const reports = [];
        for (let offset = 0; offset < suppliers.length; offset += 5) {
          const chunk = await Promise.all(
            suppliers.slice(offset, offset + 5).map(async (s) => {
              const result = await adminRequest(
                "/api/suppliers/admin/" +
                  encodeURIComponent(s.id) +
                  "/stats?" +
                  queryString(period),
                { signal: controller.signal },
              );
              if (
                result.data?.period?.from !== period.from ||
                result.data?.period?.to !== period.to ||
                !Array.isArray(result.data?.activityHeatmap)
              )
                throw new Error(
                  "رد إحصائيات المورد غير مكتمل أو بفترة مختلفة.",
                );
              return result.data;
            }),
          );
          reports.push(...chunk);
        }
        const hours = Array(24).fill(0);
        let sum = 0,
          count = 0;
        for (const r of reports) {
          for (const d of r.activityHeatmap) {
            if (!Array.isArray(d.hours) || d.hours.length !== 24)
              throw new Error("خريطة النشاط غير مكتملة.");
            d.hours.forEach((v, i) => (hours[i] += Number(v)));
          }
          if (r.response?.avgMinutes != null && r.response.firstResponses > 0) {
            sum += r.response.avgMinutes * r.response.firstResponses;
            count += r.response.firstResponses;
          }
        }
        if (!controller.signal.aborted)
          setState({
            loading: false,
            error: null,
            data: {
              hours,
              avgMinutes: count ? sum / count : null,
              total: hours.reduce((a, b) => a + b, 0),
            },
          });
      } catch (error) {
        if (!controller.signal.aborted)
          setState({ loading: false, error, data: null });
      }
    })();
    return () => controller.abort();
  }, []);
  return state;
}
