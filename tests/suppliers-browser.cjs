const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE || "playwright-core",
);
const assert = require("node:assert/strict");
const fs = require("node:fs");
(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1420 },
    });
    await context.addInitScript(() =>
      localStorage.setItem(
        "mypart.admin.session.v1",
        JSON.stringify({
          verified: true,
          accessToken: "supplier-ui-test",
          admin: { name: "اختبار" },
        }),
      ),
    );
    const page = await context.newPage(),
      errors = [],
      reads = [],
      writes = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const suppliers = Array.from({ length: 5 }, (_, i) => ({
      id: "s" + i,
      name: i % 2 ? "شركة النيل" : "شركة الخليج",
      contact_name: "محمد أحمد",
      supplier_type: "parts",
      supplier_types: ["parts"],
      phone: "+96605123556",
      email: "mohamed@example.com",
      city: "الرياض",
      address: "حي الصناعية",
      rating: "4.9",
      approval_status: [
        "pending",
        "approved",
        "approved",
        "approved",
        "rejected",
      ][i],
      wallet_balance: "2410",
      sales_count: 98,
      quotations_count: 62,
      supported_make_ids: ["bmw", "fiat", "lambo"],
      supported_qualities: ["original", "oem", "alternative"],
      settlement_days: 14,
      created_at: "2023-01-01T12:00:00Z",
      bank_name: "بنك الراجحي",
      bank_account_name: "محمد أحمد",
      iban: "SA4420000001234567890000",
      logo_url: null,
    }));
    const makes = [
      {
        id: "bmw",
        name_ar: "بي إم دبليو",
        is_active: true,
        logo_url: "/supplier-reference-assets/bmw.svg",
      },
      { id: "fiat", name_ar: "فيات تينو", is_active: true },
      { id: "lambo", name_ar: "لامبورغيني", is_active: true },
    ];
    const files = Array.from({ length: 6 }, (_, i) => ({
      id: "f" + i,
      file_name: "كتالوج_قطع_يونيو.pdf",
      supplier_name: "شركة الحسام",
      created_at: "2025-05-12T12:00:00Z",
      total_rows: 180,
      unmatched_rows: 5,
      cheaper_rows: 45,
      expensive_rows: 5,
    }));
    const parts = Array.from({ length: 5 }, (_, i) => ({
      id: "part" + i,
      part_name: "كومبروسر تكييف",
      part_number: "1HGCM82633A123456",
      supplier_price: "14200",
      platform_price: "16400",
      price_diff: "2200",
      comparison: [
        "expensive",
        "cheaper",
        "unmatched",
        "unmatched",
        "expensive",
      ][i],
      product_id: i === 2 || i === 3 ? null : "p" + i,
      current_margin_percent: 20,
    }));
    await page.route(
      "https://car-parts-backend.vercel.app/**",
      async (route) => {
        const r = route.request(),
          u = new URL(r.url()),
          p = u.pathname;
        assert.equal(r.headers().authorization, "Bearer supplier-ui-test");
        const send = (data, status = 200) =>
          route.fulfill({
            status,
            contentType: "application/json",
            body: JSON.stringify({ success: status < 400, ...data }),
          });
        if (r.method() !== "GET") {
          writes.push(p);
          return send({ message: "No live writes in visual test" }, 422);
        }
        reads.push(p + u.search);
        if (p === "/api/admin/notifications")
          return send({
            data: { items: [], unreadCount: 0 },
            meta: { total: 0 },
          });
        if (p === "/api/cars/admin/makes") return send({ data: makes });
        if (p === "/api/suppliers/quality-tiers")
          return send({
            data: [
              { code: "original", nameAr: "قطعة أصلية" },
              { code: "oem", nameAr: "قطعة كورية" },
              { code: "alternative", nameAr: "قطعة بديلة" },
            ],
          });
        if (p === "/api/suppliers/admin") {
          const status = u.searchParams.get("approvalStatus");
          return send({
            data: {
              items: status
                ? suppliers.filter((x) => x.approval_status === status)
                : suppliers,
              countsByStatus: { approved: 5, rejected: 5, pending: 5 },
              total: 50,
              metrics: {
                total_sales: "148200",
                monthly_pricing_requests: 312,
                late_suppliers: 3,
              },
            },
          });
        }
        if (/^\/api\/suppliers\/admin\/s\d$/.test(p))
          return send({
            data: {
              ...suppliers.find((x) => x.id === p.split("/").pop()),
              name: "شركة النيل للتجارة والتوزيع",
              confirmed_orders_count: 147,
              confirmed_orders_total: 148200,
              response_rate: 90,
              response_time_hours: 2.4,
            },
          });
        if (p.endsWith("/wallet"))
          return send({
            data: {
              balance: 2410,
              totalEarned: 148200,
              totalSettled: 0,
              totalDeducted: 0,
              iban: "SA4420000012345",
            },
          });
        if (p.endsWith("/transactions"))
          return send({
            data: [
              {
                id: "t1",
                type: "settlement",
                amount: "3000",
                description: "تسوية الرصيد",
                created_at: "2025-03-20T12:00:00Z",
                settlement_id: "st1",
              },
              {
                id: "t2",
                type: "settlement",
                amount: "2500",
                description: "تسوية الرصيد",
                created_at: "2025-03-19T12:00:00Z",
              },
              {
                id: "t3",
                type: "settlement",
                amount: "2500",
                description: "تسوية الرصيد",
                created_at: "2025-03-18T12:00:00Z",
              },
            ],
            meta: { total: 3 },
          });
        if (p === "/api/suppliers/admin/settlements") return send({ data: [] });
        if (p === "/api/suppliers/admin/settlements/st1")
          return send({
            data: {
              settlementNumber: "STL-001",
              netAmount: 27641,
              supplierName: "شركة النيل للتجارة والتوزيع",
              confirmedOrdersTotal: 148200,
              ordersProfit: 20200,
              totalDeductions: 200,
              iban: "26266sdd455ss",
              status: "paid",
              breakdown: {
                profitByRate: [
                  { percent: 5, amount: 7410 },
                  { percent: 3, amount: 200 },
                  { percent: 1, amount: 100 },
                ],
                pricingFees: [
                  { pricingType: "express", amount: 63 },
                  { pricingType: "normal", amount: 45 },
                  { pricingType: "free", amount: 0 },
                ],
                deductions: [
                  { reason: "خصم بوليصة تأخير", amount: 150 },
                  { reason: "رسوم إلغاء طلبات", amount: 50 },
                ],
              },
            },
          });
        if (p === "/api/admin/reports/suppliers")
          return send({
            data: {
              items: [
                "النيل",
                "الخليج",
                "مصر أوتو",
                "أوتو بلس",
                "العربي",
                "سريع أوتو",
                "توب كار",
                "السيارات",
              ].map((name, i) => ({
                supplierId: "s" + i,
                name,
                netRevenue: [
                  120000, 80000, 70000, 65000, 50000, 65000, 50000, 10000,
                ][i],
              })),
            },
          });
        if (p === "/api/admin/reports/pricing-suppliers")
          return send({
            data: {
              items: suppliers.map((x, i) => ({
                supplierId: x.id,
                name: x.name,
                quotationsCount: [60, 40, 80, 22, 10][i],
                quotedTotal: [48200, 36800, 36800, 29400, 36800][i],
                rating: 4.9,
              })),
            },
          });
        if (p === "/api/admin/reports/performance")
          return send({
            data: {
              topCategories: {
                items: [
                  "كومبروسر",
                  "فرامل",
                  "فلتر زيت",
                  "ترس فتيس",
                  "بطارية",
                  "مضخة مياه",
                ].map((nameAr, i) => ({
                  nameAr,
                  pricingRequests: [40, 60, 50, 40, 41, 35][i],
                })),
              },
              partsQuality: {
                items: [
                  { label: "أصلي", quotesCount: 142 },
                  { label: "كوري", quotesCount: 86 },
                  { label: "صيني", quotesCount: 52 },
                  { label: "بديل", quotesCount: 32 },
                ],
              },
            },
          });
        if (p === "/api/pricing-requests/admin")
          return send({
            data: [0, 1, 2].map((i) => ({
              id: "pr" + i,
              request_number: "PRQ-00" + (i + 1),
              request_type: "new",
              pricing_type: i ? "express" : "free",
              status: i === 2 ? "open" : "quoted",
              status_label: i === 2 ? "في التسعير" : "تم التسعير",
              accepted_items_count: i ? 0 : 1,
              lowest_total: 4800,
              accepted_total: 3000,
            })),
            meta: { total: 3 },
          });
        if (p === "/api/support-tickets/admin")
          return send({
            data: {
              items: [
                {
                  id: "tk1",
                  supplier_id: "s1",
                  source: "supplier",
                  ticket_number: "TKT-3428",
                  subject: "مشكلة في الدفع",
                  category_name: "مشكلة مالية",
                  status: "open",
                  created_at: "2025-03-12T12:00:00Z",
                },
                {
                  id: "tk2",
                  supplier_id: "s1",
                  source: "supplier",
                  ticket_number: "TKT-3424",
                  subject: "لماذا لا يمكنني تحديث التطبيق؟",
                  status: "in_progress",
                  created_at: "2025-03-12T12:00:00Z",
                },
                { id: "other", supplier_id: "s2", subject: "تذكرة مورد آخر" },
              ],
              total: 3,
            },
          });
        if (p.startsWith("/api/support-tickets/admin/"))
          return send({
            data: {
              id: "tk1",
              supplier_id: "s1",
              ticket_number: "TKT-3428",
              subject: "مشكلة في الدفع",
              category_name: "مشكلة مالية",
              priority: "high",
              status: "open",
              created_at: "2025-03-12T12:00:00Z",
              messages: [
                {
                  id: "m1",
                  body: "لماذا لا يمكنني تحديث التطبيق؟ يستمر في إعادة تحميل نفس الصفحة، الرجاء المساعدة.",
                  sender_name: "المورد",
                  is_staff: false,
                  created_at: "2025-03-12T12:00:00Z",
                },
                {
                  id: "m2",
                  body: "مرحبًا، هل حاولت إيقاف تشغيل هاتفك وتشغيله مرة أخرى؟",
                  sender_name: "مسؤول الدعم الفني",
                  is_staff: true,
                  created_at: "2025-03-12T12:20:00Z",
                },
                {
                  id: "m3",
                  body: "لا لم أفعل، سأحاول الآن.",
                  sender_name: "المورد",
                  is_staff: false,
                  created_at: "2025-03-12T14:00:00Z",
                },
              ],
            },
          });
        if (p === "/api/suppliers/admin/price-lists")
          return send({ data: files, meta: { total: 6 } });
        if (p.startsWith("/api/suppliers/admin/price-lists/"))
          return send({
            data: {
              priceList: {
                id: "f0",
                fileName: "كتالوج_قطع_يونيو.pdf",
                supplierName: "شركة الحسام",
                createdAt: "2025-05-12T12:00:00Z",
                summary: {
                  total: 180,
                  unmatched: 5,
                  cheaper: 45,
                  expensive: 5,
                },
              },
              items: parts,
            },
            meta: { total: 5 },
          });
        if (p === "/api/offers/admin")
          return send({
            data: Array.from({ length: 7 }, (_, i) => ({
              id: "o" + i,
              product_id: "p" + i,
              product_name: "كومبروسر تكييف",
              part_number: "1HGCM82633A123456",
              supplier_name: "شركة الحسام",
              orders_count: 15,
              status: "active",
              supplier_price: "16300",
              offer_price: "12400",
              original_price: "16500",
            })),
            meta: { total: 7 },
          });
        if (p.startsWith("/api/products/admin/"))
          return send({
            data: {
              id: "p1",
              name: "كومبروسر تكييف",
              images: [],
              qualities: [],
              specifications: [],
            },
          });
        return send({ message: "not available" }, 404);
      },
    );
    const shot = async (name) => {
      await page.screenshot({
        path: "/tmp/suppliers-" + name + ".png",
        fullPage: true,
      });
    };
    await page.goto("http://127.0.0.1:5189/#suppliers");
    await page
      .getByRole("heading", { name: "الموردين", exact: true })
      .waitFor();
    await page.locator(".su-table tbody tr").first().waitFor();
    await shot("list");
    const listDelete = page
      .getByLabel("حذف شركة النيل", { exact: true })
      .first();
    assert.equal(await listDelete.isDisabled(), false);
    await listDelete.click();
    await page
      .getByRole("dialog", { name: "حذف المورد", exact: true })
      .waitFor();
    await page.getByRole("dialog").getByLabel("إغلاق", { exact: true }).click();
    await page
      .getByRole("button", { name: "إجراءات شركة النيل", exact: true })
      .first()
      .click();
    await page.getByRole("menuitem", { name: "تسوية الرصيد" }).click();
    await page.getByRole("dialog").waitFor();
    await shot("credit");
    await page.getByRole("button", { name: "خصم رصيد", exact: true }).click();
    await shot("deduction");
    await page.getByRole("button", { name: "إغلاق", exact: true }).click();
    await page.getByRole("button", { name: "إضافة جديد", exact: true }).click();
    await page.getByRole("dialog").waitFor();
    await shot("add");
    await page.getByRole("button", { name: "إغلاق", exact: true }).click();
    await page
      .getByRole("button", { name: "الإحصائيات والتحليلات", exact: true })
      .click();
    await page.locator(".su-sales-bar").first().waitFor();
    await shot("analytics");
    await page
      .getByRole("button", { name: "أوقات التسعير", exact: true })
      .click();
    await shot("times");
    await page
      .getByRole("button", { name: "جميع الموردين", exact: true })
      .click();
    await page.locator(".su-table tbody tr").first().waitFor();
    await page
      .getByRole("button", { name: "عرض شركة النيل", exact: true })
      .first()
      .click();
    await page
      .getByRole("heading", {
        name: "شركة النيل للتجارة والتوزيع",
        exact: true,
      })
      .waitFor();
    await shot("details-basic");
    await page
      .getByRole("button", { name: "طلبات التسعير", exact: true })
      .last()
      .click();
    await page.getByText("PRQ-001", { exact: true }).waitFor();
    await shot("details-pricing");
    await page
      .getByRole("button", { name: "المالية والأرصدة", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "سجل المعاملات المالية" })
      .waitFor();
    await page.getByRole("button", { name: "تفاصيل المعاملة t1" }).waitFor();
    await shot("details-finance");
    await page.getByRole("button", { name: "تفاصيل المعاملة t1" }).click();
    await page.getByText("STL-001", { exact: true }).waitFor();
    await shot("invoice");
    await page.getByRole("button", { name: "إغلاق", exact: true }).click();
    await page.getByRole("button", { name: "التذاكر", exact: true }).click();
    await page.getByText("المحادثة (3 رسائل)", { exact: true }).waitFor();
    assert.equal(await page.getByText("تذكرة مورد آخر").count(), 0);
    await shot("details-tickets");
    await page
      .getByRole("button", { name: "عروض الأسعار", exact: true })
      .click();
    await page.locator(".su-offer-file").first().waitFor();
    await shot("files");
    await page
      .getByRole("button", { name: "عرض كتالوج_قطع_يونيو.pdf", exact: true })
      .first()
      .click();
    await page
      .getByRole("button", { name: "تحديد الأرخص", exact: true })
      .waitFor();
    await page.locator(".su-table tbody tr").first().waitFor();
    await shot("file-details");
    await page
      .getByRole("button", { name: "تحديد الأرخص", exact: true })
      .click();
    await page
      .getByRole("button", { name: "تطبيق العرض على المنتجات", exact: true })
      .click();
    await page.getByRole("dialog", { name: "تطبيق عرض مؤقت" }).waitFor();
    await shot("apply");
    await page.getByRole("button", { name: "إغلاق", exact: true }).click();
    await page
      .locator(".sidebar")
      .getByRole("button", { name: "ملفات العروض", exact: true })
      .click();
    await page
      .locator(".sidebar")
      .getByRole("button", { name: "منتجات العروض", exact: true })
      .click();
    await page.locator(".su-table tbody tr").first().waitFor();
    await shot("offer-products");
    await page.getByRole("button", { name: "الموردين", exact: true }).click();
    await page.locator(".su-table tbody tr").first().waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(
      () =>
        document.querySelector(".sidebar").getBoundingClientRect().x >=
        innerWidth - 1,
    );
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await shot("mobile");
    assert.equal(errors.length, 0, errors.join("\n"));
    assert.equal(writes.length, 0);
    console.log(
      "Suppliers visual browser PASS: list, analytics, times, four detail tabs, add, credit, deduction, invoice, files, comparison, apply, offer products, mobile; no real writes.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
