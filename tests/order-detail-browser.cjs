const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE || "playwright-core",
);
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1100 },
    });
    await context.addInitScript(() =>
      localStorage.setItem(
        "mypart.admin.session.v1",
        JSON.stringify({
          verified: true,
          accessToken: "order-test",
          admin: { name: "اختبار" },
        }),
      ),
    );
    const page = await context.newPage(),
      writes = [],
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    let failQuantity = true,
      failShipping = true,
      failInvoice = true;
    const order = {
      id: "o1",
      order_number: "ORD-TEST",
      status: "confirmed",
      status_options: [{ status: "delivered", label: "تم التوصيل" }],
      total: 100,
      subtotal: 100,
      payment_method: "cash",
      shipping_fee: 0,
      tax: 0,
      discount: 0,
      shipping_cost: 4,
      packaging_cost: 2,
      extra_fees: 0,
      city: "الرياض",
      street: "الأول",
      customer: { name: "عميل", phone: "0500" },
      items: [
        {
          id: "i1",
          product_id: "p1",
          product_name: "قطعة أولى",
          quantity: 1,
          unit_price: 100,
          line_total: 100,
          car: { makeNameAr: "تويوتا", modelNameAr: "كامري", year: 2022 },
        },
      ],
    };
    const send = (route, data, meta, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify({
          success: status < 400,
          message: status < 400 ? "Success" : "رفض تجريبي",
          data,
          meta,
        }),
      });
    await context.route("https://car-parts-backend.vercel.app/**", (route) => {
      const request = route.request(),
        url = new URL(request.url()),
        path = url.pathname,
        method = request.method(),
        body = request.postDataJSON();
      if (method !== "GET") writes.push({ path, method, body });
      if (path === "/api/payments/methods")
        return send(route, {
          methods: [
            { code: "cash", label: "كاش", enabled: false },
            { code: "mada", label: "مدى", enabled: true },
            { code: "visa", label: "فيزا", enabled: true },
          ],
        });
      if (path === "/api/orders/all")
        return send(route, [{ ...order, customer_name: "عميل" }], {
          total: 1,
          statusCounts: { all: 1, confirmed: 1 },
        });
      if (path === "/api/suppliers/admin")
        return send(route, { items: [], total: 0 });
      if (path === "/api/cars/admin/makes") return send(route, []);
      if (path === "/api/orders/admin/o1") return send(route, order);
      if (path === "/api/products/admin")
        return send(route, [{ id: "p2", name: "قطعة ثانية" }], { total: 1 });
      if (path === "/api/products/admin/p2")
        return send(route, {
          id: "p2",
          name: "قطعة ثانية",
          variants: [
            {
              id: "v2",
              variant_label: "عبوة كبيرة",
              price: 50,
              is_active: true,
            },
          ],
        });
      if (path === "/api/orders/admin/o1/items") {
        assert.equal(body.productId, "p2");
        assert.equal(body.variantId, "v2");
        order.items.push({
          id: "i2",
          product_id: "p2",
          product_name: "قطعة ثانية",
          quantity: body.quantity,
          unit_price: 50,
          line_total: 50 * body.quantity,
        });
        return send(route, order);
      }
      if (path === "/api/orders/admin/o1/items/i1") {
        if (failQuantity) {
          failQuantity = false;
          return send(route, null, null, 422);
        }
        assert.deepEqual(Object.keys(body), ["quantity"]);
        order.items[0].quantity = body.quantity;
        order.items[0].line_total = 100 * body.quantity;
        order.total = order.subtotal = order.items.reduce(
          (a, x) => a + x.line_total,
          0,
        );
        return send(route, order);
      }
      if (path === "/api/orders/admin/o1/items/i2") {
        assert.equal(method, "DELETE");
        order.items = order.items.filter((x) => x.id !== "i2");
        return send(route, order);
      }
      if (path === "/api/orders/admin/o1/shipping") {
        if (failShipping) {
          failShipping = false;
          return send(route, null, null, 422);
        }
        if (body.deliveryAddress) Object.assign(order, body.deliveryAddress);
        for (const [a, b] of Object.entries({
          shippingCost: "shipping_cost",
          packagingCost: "packaging_cost",
          extraFees: "extra_fees",
          trackingNo: "tracking_no",
          trackingUrl: "tracking_url",
        }))
          if (body[a] !== undefined) order[b] = body[a];
        return send(route, order);
      }
      if (path === "/api/orders/o1/status") {
        order.status = body.status;
        order.admin_notes = body.adminNotes;
        return send(route, order);
      }
      if (path === "/api/orders/admin/o1/costs")
        return send(route, {
          items: [
            {
              id: "i1",
              productName: "قطعة أولى",
              quantity: 2,
              unitPrice: 100,
              lineTotal: 200,
              unitCost: 30,
              profit: 140,
            },
          ],
          summary: {
            totalSales: 200,
            orderTotal: 200,
            productsCost: 60,
            shippingCost: order.shipping_cost,
            packagingCost: order.packaging_cost,
            extraFees: order.extra_fees,
            paymentFees: { amount: 3 },
            totalCosts: 69,
            netProfit: 131,
            netMarginPercent: 65.5,
            isPartial: true,
          },
        });
      if (path === "/api/orders/admin/o1/invoice")
        return send(route, {
          invoiceNumber: "INV-1",
          customer: order.customer,
          items: [
            {
              productName: "قطعة أولى",
              quantity: 2,
              unitPrice: 100,
              lineTotal: 200,
            },
          ],
          totals: { total: 200 },
        });
      if (path === "/api/orders/admin/o1/invoice/send") {
        if (failInvoice) {
          failInvoice = false;
          return send(route, null, null, 503);
        }
        return send(route, { sent: true });
      }
      if (path === "/api/admin/me")
        return send(route, { id: "admin", permissions: ["orders.manage"] });
      throw new Error("Unexpected " + method + " " + path);
    });
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
      (process.env.TEST_BASE_URL || "http://127.0.0.1:5188") + "/#orders",
    );
    await page.getByRole("button", { name: "ORD-TEST", exact: true }).click();
    await page
      .getByRole("cell", { name: "تويوتا كامري 2022", exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByLabel("حالة الطلب", { exact: true })
        .locator('option[value="shipped"]')
        .count(),
      0,
    );
    await page
      .getByRole("button", { name: "تعديل الطلب", exact: true })
      .click();
    await page.locator('.op-edit-item input[type="number"]').fill("2");
    await page
      .getByRole("button", { name: "حفظ التعديلات", exact: true })
      .first()
      .click();
    await page.getByRole("status").filter({ hasText: "رفض تجريبي" }).waitFor();
    assert.equal(order.items[0].quantity, 1);
    await page
      .getByRole("button", { name: "حفظ التعديلات", exact: true })
      .first()
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "تم حفظ التعديلات والتحقق" })
      .waitFor();
    assert.equal(order.items[0].quantity, 2);
    await page
      .getByRole("button", { name: "إضافة منتج للطلب", exact: true })
      .click();
    const modal = page.getByRole("dialog");
    await modal.getByLabel("المنتج", { exact: true }).selectOption("p2");
    await modal.getByLabel("نوع المنتج", { exact: true }).selectOption("v2");
    await modal.getByRole("button", { name: "تأكيد", exact: true }).click();
    await modal.waitFor({ state: "hidden" });
    assert.equal(order.items.length, 2);
    page.once("dialog", (d) => d.accept());
    await page
      .getByRole("button", { name: "إزالة قطعة ثانية", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "تم حذف القطعة" })
      .waitFor();
    assert.equal(order.items.length, 1);
    await page.getByRole("tab", { name: "الشحن والتتبع", exact: true }).click();
    await page.locator('input[placeholder="الرياض"]').fill("جدة");
    await page.locator('input[placeholder="رقم التتبع"]').fill("TRACK-1");
    await page
      .getByRole("button", { name: "حفظ التعديلات", exact: true })
      .first()
      .click();
    await page.getByRole("status").filter({ hasText: "رفض تجريبي" }).waitFor();
    assert.equal(order.city, "الرياض");
    await page
      .getByRole("button", { name: "حفظ التعديلات", exact: true })
      .first()
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "تم حفظ التعديلات والتحقق" })
      .waitFor();
    assert.equal(order.city, "جدة");
    assert.equal(order.tracking_no, "TRACK-1");
    await page
      .getByRole("tab", { name: "التكاليف والأرباح", exact: true })
      .click();
    await page
      .getByText("التقرير جزئي؛ بعض المنتجات ليس لها تكلفة مسجلة.", {
        exact: true,
      })
      .waitFor();
    await page.getByLabel("تكلفة الشحن", { exact: true }).fill("9");
    await page
      .getByRole("button", { name: "حفظ و تحديث التقرير", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "تم تحديث تقرير التكاليف" })
      .waitFor();
    assert.equal(order.shipping_cost, 9);
    assert.equal(order.shipping_fee, 0);
    await page.getByRole("tab", { name: "الفاتورة", exact: true }).click();
    await page.getByText("INV-1", { exact: true }).waitFor();
    await page
      .getByRole("button", { name: "إرسال للعميل", exact: true })
      .click();
    await page.getByRole("status").filter({ hasText: "رفض تجريبي" }).waitFor();
    await page
      .getByRole("button", { name: "إرسال للعميل", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "تم إرسال الفاتورة للعميل على الخادم" })
      .waitFor();
    assert.equal(
      writes.filter((x) => x.path.endsWith("/invoice/send")).length,
      2,
    );
    await page
      .getByRole("main")
      .getByRole("button", { name: "الطلبات", exact: true })
      .click();
    await page
      .getByRole("button", { name: "إجراءات ORD-TEST", exact: true })
      .click();
    await page
      .getByRole("button", { name: "الفاتورة والشحن", exact: true })
      .click();
    await page.getByText("INV-1", { exact: true }).waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: order quantities validation/retry, real variant item add/delete, car snapshots, supported transitions, shipping persistence/retry, server profit/partial costs and invoice notification retry.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
