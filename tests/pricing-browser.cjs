const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE || "playwright-core",
);
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    await context.addInitScript(() =>
      localStorage.setItem(
        "mypart.admin.session.v1",
        JSON.stringify({
          verified: true,
          accessToken: "pricing-test",
          admin: { name: "اختبار" },
        }),
      ),
    );
    const page = await context.newPage(),
      errors = [],
      calls = [];
    page.on("pageerror", (e) => errors.push(e.message));
    let quoteFail = true;
    const part = {
      id: "part1",
      part_type: "part",
      part_name: "قطعة اختبار حقيقية",
      quantity: 2,
      images: [],
      offers: [],
    };
    const detail = {
      id: "request1",
      request_number: "PRQ-REAL-1",
      status: "pending_admin_review",
      pricing_type: "normal",
      customer_name: "عميل من الخادم",
      customer_phone: "+966500000001",
      make_name_ar: "تويوتا",
      model_name_ar: "كامري",
      year: 2022,
      created_at: "2026-10-21T10:00:00Z",
      parts: [part],
      isReady: false,
      quotations: [],
      timeline: [],
    };
    const send = (r, data, meta, status = 200) =>
      r.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify({
          success: status < 400,
          message: status === 422 ? "السعر غير مقبول" : "Success",
          data,
          meta,
        }),
      });
    await context.route(
      "https://car-parts-backend.vercel.app/**",
      async (r) => {
        const req = r.request(),
          u = new URL(req.url()),
          p = u.pathname,
          m = req.method();
        calls.push({ p, m, q: u.searchParams, body: req.postDataJSON() });
        assert.equal(req.headers().authorization, "Bearer pricing-test");
        if (p === "/api/cars/admin/makes")
          return send(r, [{ id: "toyota", name_ar: "تويوتا" }]);
        if (p === "/api/suppliers/quality-tiers")
          return send(r, [{ code: "japanese", name: "ياباني رسمي" }]);
        if (p === "/api/products/admin")
          return send(r, [{ id: "product1", name: "منتج مطابق من الخادم" }], {
            total: 1,
          });
        if (p.endsWith("/pending-review"))
          return send(
            r,
            [
              {
                id: detail.id,
                missing_products_count: part.matched_product_id ? 0 : 1,
              },
            ],
            { total: 1 },
          );
        if (p === "/api/pricing-requests/admin")
          return send(r, [{ ...detail, parts_count: 1 }], {
            total: 1,
            statusCounts: { all: 1, open: 0 },
            paidFeesTotal: 25,
          });
        if (p === "/api/pricing-requests/admin/request1")
          return send(r, detail);
        if (p.endsWith("/link-product")) {
          assert.deepEqual(req.postDataJSON(), { productId: "product1" });
          part.matched_product_id = "product1";
          part.matched_product_name = "منتج مطابق من الخادم";
          detail.isReady = true;
          detail.status = "products_added";
          return send(r, { isReady: true });
        }
        if (p.endsWith("/send-to-suppliers")) {
          detail.status = "open";
          return send(r, {});
        }
        if (p.endsWith("/quotes")) {
          if (quoteFail) {
            quoteFail = false;
            return send(r, null, null, 422);
          }
          assert.deepEqual(req.postDataJSON(), {
            offers: [{ qualityTier: "japanese", price: 123, notes: "ضمان" }],
            deliveryDays: 2,
          });
          part.offers = [
            {
              itemId: "offer1",
              qualityTier: "japanese",
              qualityName: "ياباني رسمي",
              price: 123,
              notes: "ضمان",
              supplier: { name: "ماي بارت" },
              pricedByAdmin: true,
            },
          ];
          part.is_priced = true;
          return send(r, detail);
        }
        if (p.endsWith("/offers/offer1")) {
          assert.deepEqual(req.postDataJSON(), { price: 140, notes: "ضمان" });
          part.offers[0].price = 140;
          return send(r, {});
        }
        if (p.endsWith("/cancel")) {
          assert.deepEqual(req.postDataJSON(), { reason: "اختبار الإلغاء" });
          detail.status = "cancelled";
          return send(r, { refundRequired: true });
        }
        throw Error("Unexpected " + m + " " + p);
      },
    );
    await page.route("**/api/admin/notifications?*", (r) =>
      r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { items: [], unreadCount: 0 },
          meta: { total: 0 },
        }),
      }),
    );
    await page.goto(
      (process.env.TEST_BASE_URL || "http://127.0.0.1:5189") + "/#pricing",
    );
    await page
      .getByRole("button", { name: "PRQ-REAL-1", exact: true })
      .waitFor();
    assert.ok(
      !(await page.getByLabel("أوقات التسعير", { exact: true }).isDisabled()),
    );
    await page
      .getByLabel("شركة السيارة", { exact: true })
      .selectOption("toyota");
    await page.getByRole("button", { name: "البحث والتصفية" }).click();
    await page.waitForTimeout(150);
    assert.ok(calls.some((c) => c.q.get("makeId") === "toyota"));
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: /تصدير Excel/ }).click();
    assert.ok((await download).suggestedFilename().endsWith(".xlsx"));
    await page.getByRole("button", { name: "PRQ-REAL-1", exact: true }).click();
    await page.getByText("العميل عميل من الخادم", { exact: false }).waitFor();
    assert.ok(
      await page
        .getByRole("button", { name: "إرسال التسعير للموردين" })
        .isDisabled(),
    );
    await page.getByRole("button", { name: "إضافة منتج", exact: true }).click();
    await page.getByLabel("المنتج المرتبط بالقطعة").selectOption("product1");
    await page.getByRole("button", { name: "ربط المنتج", exact: true }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page.getByRole("button", { name: "إرسال التسعير للموردين" }).click();
    await page
      .getByText("تم إرسال طلب التسعير للموردين.", { exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "إضافة تسعير", exact: true })
      .click();
    await page.getByLabel("الجودة 1", { exact: true }).selectOption("japanese");
    await page.getByLabel("السعر 1", { exact: true }).fill("123");
    await page.getByLabel("ملاحظة 1", { exact: true }).fill("ضمان");
    await page.getByLabel("مدة التوصيل بالأيام", { exact: true }).fill("2");
    await page.getByRole("button", { name: "إرسال", exact: true }).click();
    await page.getByText("السعر غير مقبول", { exact: true }).waitFor();
    assert.equal(
      await page.getByLabel("السعر 1", { exact: true }).inputValue(),
      "123",
    );
    await page.getByRole("button", { name: "إرسال", exact: true }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page
      .getByRole("button", { name: "تعديل الأسعار", exact: true })
      .click();
    await page.getByLabel("السعر 1", { exact: true }).fill("140");
    await page
      .getByRole("button", { name: "حفظ التعديلات", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page.screenshot({ path: "/tmp/pricing-desktop.png", fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "/tmp/pricing-mobile.png", fullPage: true });
    await page
      .getByRole("button", { name: "إلغاء طلب التسعير", exact: true })
      .click();
    await page.getByLabel("سبب إلغاء التسعير").fill("اختبار الإلغاء");
    await page.getByRole("button", { name: "تأكيد الإلغاء" }).click();
    await page
      .getByText("تم إلغاء الطلب. رد الرسوم مطلوب ولم يُنفّذ تلقائيًا.", {
        exact: true,
      })
      .waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "إضافة تسعير", exact: true })
        .count(),
      0,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS pricing: real list, filters, export, linking, supplier send, quote retry/edit, cancel/refund, mobile, no runtime errors",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
