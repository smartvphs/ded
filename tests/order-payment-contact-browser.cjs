const { chromium } = require(
    process.env.PLAYWRIGHT_MODULE || "playwright-core",
  ),
  assert = require("node:assert/strict");
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
          accessToken: "order-payment-test",
          admin: { name: "اختبار" },
        }),
      ),
    );
    const page = await context.newPage(),
      errors = [],
      calls = [];
    page.on("pageerror", (e) => errors.push(e.message));
    let failCoupon = true,
      failContact = true,
      blockPayment = false;
    const account = {
      id: "customer",
      name: "صاحب الحساب",
      phone: "+966500000001",
      email: "account@example.com",
    };
    const order = {
      id: "o5",
      order_number: "ORD-5",
      status: "pending",
      order_type: "product",
      status_options: [{ status: "confirmed" }],
      payment_method: "cash",
      coupon_code: null,
      discount: 0,
      tax: 15,
      shipping_fee: 0,
      subtotal: 100,
      total: 115,
      customer: account,
      contact: {
        name: account.name,
        phone: account.phone,
        email: account.email,
        isCustom: false,
      },
      items: [
        {
          id: "item5",
          product_name: "قطعة",
          quantity: 1,
          unit_price: 100,
          line_total: 100,
        },
      ],
    };
    const send = (r, data, meta, status = 200) =>
      r.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify({
          success: status < 400,
          message:
            status === 400
              ? "كوبون غير متاح"
              : status === 409
                ? "لا يمكن التعديل بعد فتح صفحة الدفع"
                : status === 422
                  ? "بيانات التواصل غير صحيحة"
                  : "Success",
          data,
          meta,
        }),
      });
    await context.route("https://car-parts-backend.vercel.app/**", (r) => {
      const req = r.request(),
        u = new URL(req.url()),
        path = u.pathname,
        m = req.method(),
        body = req.postDataJSON();
      if (m !== "GET") calls.push({ path, body });
      if (path === "/api/payments/methods")
        return send(r, {
          methods: [
            { code: "cash", label: "كاش", enabled: false },
            { code: "mada", label: "مدى", enabled: true },
            { code: "visa", label: "فيزا", enabled: true },
          ],
        });
      if (path === "/api/admin/notifications")
        return send(r, { items: [], unreadCount: 0 });
      if (path === "/api/orders/all")
        return send(
          r,
          [
            {
              ...order,
              customer_name: account.name,
              contact_name: order.contact.isCustom ? order.contact.name : null,
            },
          ],
          { total: 1, statusCounts: { all: 1, pending: 1 } },
        );
      if (path === "/api/suppliers/admin")
        return send(r, { items: [], total: 0 });
      if (path === "/api/cars/admin/makes") return send(r, []);
      if (path === "/api/orders/admin/o5") return send(r, order);
      if (path === "/api/orders/admin/o5/payment") {
        if (blockPayment) return send(r, null, null, 409);
        if (failCoupon) {
          failCoupon = false;
          return send(r, null, null, 400);
        }
        if (body.paymentMethod) order.payment_method = body.paymentMethod;
        if ("couponCode" in body) order.coupon_code = body.couponCode;
        order.discount = order.coupon_code ? 10 : 0;
        order.tax = (order.subtotal - order.discount) * 0.15;
        order.total = order.subtotal - order.discount + order.tax;
        return send(r, order);
      }
      if (path === "/api/orders/admin/o5/contact") {
        if (failContact) {
          failContact = false;
          return send(r, null, null, 422);
        }
        for (const [input, key] of Object.entries({
          contactName: "name",
          contactPhone: "phone",
          contactEmail: "email",
        }))
          if (input in body) order.contact[key] = body[input] ?? account[key];
        order.contact.isCustom = true;
        return send(r, order);
      }
      if (path === "/api/orders/o5/status") {
        order.status = body.status;
        return send(r, order);
      }
      throw new Error("Unexpected " + m + " " + path);
    });
    await page.goto(
      (process.env.TEST_BASE_URL || "http://127.0.0.1:5189") + "/#orders",
    );
    await page.getByRole("button", { name: "ORD-5", exact: true }).click();
    async function edit() {
      await page
        .getByRole("button", { name: "تعديل الطلب", exact: true })
        .click();
    }
    async function save() {
      await page
        .getByRole("button", { name: "حفظ التعديلات", exact: true })
        .first()
        .click();
    }
    await edit();
    await page.getByLabel("طريقة الدفع", { exact: true }).selectOption("mada");
    await page.getByLabel("كود خصم الطلب", { exact: true }).fill("SAVE10");
    await save();
    await page
      .getByRole("status")
      .filter({ hasText: "كوبون غير متاح" })
      .waitFor();
    assert.equal(
      await page.getByLabel("كود خصم الطلب", { exact: true }).inputValue(),
      "SAVE10",
    );
    assert.equal(order.total, 115);
    await save();
    await page
      .getByRole("status")
      .filter({ hasText: "تم حفظ التعديلات والتحقق" })
      .waitFor();
    assert.equal(order.total, 103.5);
    assert.equal(order.tax, 13.5);
    assert.deepEqual(
      calls.filter((x) => x.path.endsWith("/payment")).at(-1).body,
      { paymentMethod: "mada", couponCode: "SAVE10" },
    );
    await edit();
    await page
      .getByLabel("الاسم كاملًا", { exact: true })
      .fill("المستلم الجديد");
    await page
      .getByLabel("البريد الإلكتروني (اختياري)", { exact: true })
      .fill("new@example.com");
    await save();
    await page
      .getByRole("status")
      .filter({ hasText: "بيانات التواصل غير صحيحة" })
      .waitFor();
    assert.equal(
      await page.getByLabel("الاسم كاملًا", { exact: true }).inputValue(),
      "المستلم الجديد",
    );
    await save();
    await page
      .getByRole("status")
      .filter({ hasText: "تم حفظ التعديلات والتحقق" })
      .waitFor();
    assert.equal(account.name, "صاحب الحساب");
    assert.equal(order.contact.name, "المستلم الجديد");
    assert.deepEqual(
      calls.filter((x) => x.path.endsWith("/contact")).at(-1).body,
      { contactName: "المستلم الجديد", contactEmail: "new@example.com" },
    );
    await edit();
    await page.getByLabel("كود خصم الطلب", { exact: true }).fill("");
    await page
      .getByLabel("البريد الإلكتروني (اختياري)", { exact: true })
      .fill("");
    await save();
    await page
      .getByRole("status")
      .filter({ hasText: "تم حفظ التعديلات والتحقق" })
      .waitFor();
    assert.deepEqual(
      calls.filter((x) => x.path.endsWith("/payment")).at(-1).body,
      { couponCode: null },
    );
    assert.deepEqual(
      calls.filter((x) => x.path.endsWith("/contact")).at(-1).body,
      { contactEmail: null },
    );
    assert.equal(order.total, 115);
    assert.equal(order.contact.email, account.email);
    blockPayment = true;
    await edit();
    await page.getByLabel("طريقة الدفع", { exact: true }).selectOption("visa");
    await save();
    await page
      .getByRole("status")
      .filter({ hasText: "لا يمكن التعديل بعد فتح صفحة الدفع" })
      .waitFor();
    assert.equal(order.payment_method, "mada");
    assert.equal(
      await page.getByLabel("طريقة الدفع", { exact: true }).inputValue(),
      "visa",
    );
    blockPayment = false;
    await page.getByRole("button", { name: "إلغاء", exact: true }).click();
    await page
      .getByLabel("حالة الطلب", { exact: true })
      .selectOption("confirmed");
    await save();
    await page
      .getByRole("status")
      .filter({ hasText: "تم حفظ التعديلات والتحقق" })
      .waitFor();
    await edit();
    assert.equal(
      await page.getByLabel("طريقة الدفع", { exact: true }).isDisabled(),
      true,
    );
    assert.equal(
      await page.getByLabel("كود خصم الطلب", { exact: true }).isDisabled(),
      true,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: real payment/coupon fields, 400 and 409 retention, server tax/totals, coupon removal, order-only contact, null fallback, account unchanged and confirmed order restrictions.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
