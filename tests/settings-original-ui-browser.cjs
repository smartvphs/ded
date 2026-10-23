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
      viewport: { width: 1440, height: 1100 },
    });
    await context.addInitScript(() =>
      localStorage.setItem(
        "mypart.admin.session.v1",
        JSON.stringify({
          verified: true,
          accessToken: "settings-original-test",
          admin: { name: "اختبار" },
        }),
      ),
    );
    const page = await context.newPage(),
      errors = [],
      writes = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const settings = [
      {
        key: "platform_margin_percent",
        label: "هامش المنصة على الخدمات",
        value: 20,
        type: "percent",
        min: 0,
        max: 100,
      },
      {
        key: "cashback_percent",
        label: "نسبة الكاش باك العامة",
        value: 2,
        type: "percent",
        min: 0,
        max: 100,
      },
      {
        key: "cashback_min_order",
        label: "حد أدنى للطلب",
        value: 150,
        type: "money",
        min: 0,
      },
      {
        key: "cashback_max",
        label: "حد أعلى الكاش باك",
        value: 1000,
        type: "money",
        min: 0,
      },
      {
        key: "pricing_fee_normal",
        label: "رسوم التسعير العادي",
        value: 1,
        type: "money",
        min: 0,
      },
      {
        key: "pricing_fee_express",
        label: "رسوم التسعير السريع",
        value: 3,
        type: "money",
        min: 0,
      },
      {
        key: "contact_phones",
        label: "أرقام التواصل",
        value: ["500000001", "500000002"],
        type: "json",
      },
      {
        key: "contact_emails",
        label: "البريد الإلكتروني",
        value: ["real@example.com"],
        type: "json",
      },
    ];
    let site = {
      contact: {
        phones: [
          { label: "", number: "500000001" },
          { label: "", number: "500000002" },
        ],
        emails: [{ label: "", email: "real@example.com" }],
      },
      workingHours: null,
      pricingTypes: null,
    };
    let failRead = false,
      failSave = false,
      malformed = false,
      permissions = ["settings.manage", "support.manage", "catalog.manage"];
    const message = {
      id: "m1",
      name: "مرسل فعلي",
      phone: "+966500000123",
      email: "real@example.com",
      subject: "رسالة من الباك",
      message: "محتوى الرسالة الحقيقي",
      status: "new",
      admin_notes: null,
      created_at: "2026-10-23T01:00:00Z",
    };
    await page.route("**/api/**", async (route) => {
      const req = route.request(),
        url = new URL(req.url()),
        path = url.pathname,
        method = req.method(),
        body = req.postDataJSON();
      const send = (data, status = 200) =>
        route.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify(
            status < 400
              ? { success: true, data }
              : { success: false, message: "فشل اختباري" },
          ),
        });
      if (path === "/api/admin/notifications")
        return send({ items: [], unreadCount: 0 });
      if (path === "/api/admin/me") return send({ id: "staff", permissions });
      if (path === "/api/admin/site-info") {
        if (method === "PATCH") {
          writes.push({ path, body });
          site = { ...site, ...body };
          failRead = true;
        }
        return send(site);
      }
      if (path === "/api/admin/settings") {
        if (method === "PATCH") {
          writes.push({ path, body });
          if (failSave) {
            failSave = false;
            return send(null, 422);
          }
          for (const [k, v] of Object.entries(body))
            settings.find((s) => s.key === k).value = v;
          failRead = true;
          return send({ updated: Object.keys(body).length });
        }
        if (failRead) {
          failRead = false;
          return send(null, 503);
        }
        if (malformed) return send({});
        return send({
          groups: [
            {
              key: "margins",
              label: "الهوامش",
              settings: settings
                .filter((s) => !s.key.startsWith("contact_"))
                .map((s) => ({
                  ...s,
                  updatedAt: "2026-10-23T10:00:00Z",
                })),
            },
          ],
          unknown: [
            {
              key: "offer_target_margin_percent",
              value: "20",
              isReadOnly: true,
            },
          ],
        });
      }
      if (path === "/api/contact/admin")
        return send({
          items: [message],
          countsByStatus: {
            new: message.status === "new" ? 1 : 0,
            replied: message.status === "replied" ? 1 : 0,
          },
        });
      if (path === "/api/contact/admin/m1") {
        if (method === "PATCH") {
          writes.push({ path, body });
          if (body.status) message.status = body.status;
          if (Object.hasOwn(body, "adminNotes"))
            message.admin_notes = body.adminNotes;
          return send(message);
        }
        return send(message);
      }
      if (path === "/api/products/admin/generate-description") {
        writes.push({ path, body });
        return send({ description: "وصف فعلي من الباك", model: "test" });
      }
      throw Error("Unexpected " + method + " " + path);
    });
    await page.goto(
      (process.env.TEST_BASE_URL || "http://127.0.0.1:5189") + "/#settings",
    );
    await page
      .getByLabel("نسبة ربح المنصة على التسعيرات", { exact: true })
      .waitFor();
    await page.waitForFunction(
      () =>
        document.querySelector('[aria-label="نسبة ربح المنصة على التسعيرات"]')
          .value === "20",
    );
    assert.equal(await page.locator(".st-tabs [role=tab]").count(), 7);
    assert.equal(
      await page.getByRole("tab", { name: "إعدادات المنصة الأخرى" }).count(),
      0,
    );
    assert.equal(await page.locator(".st-percentages").count(), 3);
    assert.equal(
      await page
        .getByLabel("نسبة ربح المنصة على العروض", { exact: true })
        .inputValue(),
      "20",
    );
    assert.equal(
      await page
        .getByLabel("نسبة ربح المنصة على العروض", { exact: true })
        .isDisabled(),
      true,
    );
    assert.equal(
      await page
        .getByLabel("نسبة ربح المنصة على الخدمات", { exact: true })
        .isDisabled(),
      true,
    );
    const pricingIcons = await page
      .locator(".st-tabs .st-art image")
      .evaluateAll((nodes) => nodes.map((x) => x.getAttribute("href")));
    assert.ok(pricingIcons.every((x) => x.includes("/settings-reference/")));
    await page
      .getByLabel("نسبة ربح المنصة على التسعيرات", { exact: true })
      .fill("0");
    await page
      .getByRole("tab", { name: "إعدادات كاش باك", exact: true })
      .click();
    await page.getByLabel("نسبة الكاش باك", { exact: true }).fill("5");
    await page
      .getByRole("button", { name: "حفظ إعدادات التسعير", exact: true })
      .click();
    await page.getByRole("alert").waitFor();
    assert.deepEqual(writes.at(-1).body, { cashback_percent: 5 });
    assert.equal(
      await page.getByLabel("نسبة الكاش باك", { exact: true }).isDisabled(),
      true,
    );
    await page
      .getByRole("button", { name: "إعادة التحقق", exact: true })
      .first()
      .click();
    await page.getByText("تم حفظ الإعدادات.", { exact: true }).waitFor();
    assert.equal(
      writes.filter((x) => x.path === "/api/admin/settings").length,
      1,
    );
    await page
      .getByRole("tab", { name: "إعدادات الأرباح", exact: true })
      .click();
    assert.equal(
      await page
        .getByLabel("نسبة ربح المنصة على التسعيرات", { exact: true })
        .inputValue(),
      "0",
    );
    await page
      .getByRole("button", { name: "حفظ جميع الإعدادات", exact: true })
      .click();
    await page.getByRole("alert").waitFor();
    await page
      .getByRole("button", { name: "إعادة التحقق", exact: true })
      .first()
      .click();
    await page.getByText("تم حفظ الإعدادات.", { exact: true }).waitFor();
    assert.deepEqual(
      writes.filter((x) => x.path === "/api/admin/settings").at(-1).body,
      { platform_margin_percent: 0 },
    );
    failSave = true;
    await page
      .getByLabel("نسبة ربح المنصة على التسعيرات", { exact: true })
      .fill("3");
    await page
      .getByRole("button", { name: "حفظ جميع الإعدادات", exact: true })
      .click();
    await page.getByRole("alert").waitFor();
    assert.equal(
      await page
        .getByLabel("نسبة ربح المنصة على التسعيرات", { exact: true })
        .inputValue(),
      "3",
    );
    assert.equal(
      await page
        .getByLabel("نسبة ربح المنصة على التسعيرات", { exact: true })
        .isDisabled(),
      false,
    );
    await page.getByRole("tab", { name: "إدارة التواصل", exact: true }).click();
    await page.getByText("رسالة من الباك", { exact: true }).waitFor();
    assert.equal(await page.getByText("محمد احمد", { exact: true }).count(), 0);
    await page
      .getByRole("button", { name: "إجراءات رسالة مرسل فعلي", exact: true })
      .click();
    await page.getByText("محتوى الرسالة الحقيقي", { exact: true }).waitFor();
    await page
      .getByLabel("حالة الرسالة", { exact: true })
      .selectOption("replied");
    await page
      .getByLabel("ملاحظات الإدارة", { exact: true })
      .fill("ملاحظة فعلية");
    await page.getByRole("button", { name: "حفظ", exact: true }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(message.status, "replied");
    assert.equal(message.admin_notes, "ملاحظة فعلية");
    await page
      .getByRole("tab", { name: "إعدادات التواصل", exact: true })
      .click();
    assert.equal(
      await page
        .getByLabel("رقم الجوال*", { exact: true })
        .first()
        .inputValue(),
      "500000001",
    );
    await page
      .getByLabel("رقم الجوال*", { exact: true })
      .first()
      .fill("500000009");
    await page
      .getByRole("button", { name: "حفظ إعدادات الدفع", exact: true })
      .click();
    await page.getByRole("alert").waitFor();
    await page
      .getByRole("button", { name: "إعادة التحقق", exact: true })
      .first()
      .click();
    await page.getByText("تم حفظ الإعدادات.", { exact: true }).waitFor();
    assert.deepEqual(
      writes
        .filter((x) => x.path === "/api/admin/site-info")
        .at(-1)
        .body.contact.phones.map((x) => x.number),
      ["500000009", "500000002"],
    );
    await page
      .getByRole("tab", { name: "إعدادات الذكاء الاصطناعي", exact: true })
      .click();
    await page.getByLabel("اسم منتج", { exact: true }).fill("فلتر زيت");
    await page.getByLabel("السيارة", { exact: true }).fill("تويوتا");
    await page
      .getByRole("button", { name: "توليد الوصف", exact: true })
      .click();
    await page.waitForFunction(
      () =>
        document.querySelector('[aria-label="الوصف المقترح"]').value ===
        "وصف فعلي من الباك",
    );
    assert.deepEqual(writes.at(-1).body, {
      name: "فلتر زيت",
      compatibility: ["تويوتا"],
    });
    assert.equal(
      await page
        .getByRole("button", { name: "حفظ التعليمات", exact: true })
        .isDisabled(),
      true,
    );
    await page.getByRole("tab", { name: "بوابة الدفع", exact: true }).click();
    assert.equal(await page.locator(".st-payment-card").count(), 11);
    assert.equal(
      await page.getByLabel("API Key", { exact: true }).first().isDisabled(),
      true,
    );
    await page.getByRole("tab", { name: "إعدادات الشحن", exact: true }).click();
    assert.equal(await page.locator(".st-shipper").count(), 5);
    assert.equal(
      await page
        .getByRole("button", { name: "اختر الصورة", exact: true })
        .isDisabled(),
      true,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page
      .getByRole("tab", { name: "إعدادات كاش باك", exact: true })
      .click();
    await page.screenshot({
      path: "/tmp/settings-original-bound-mobile.png",
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.reload();
    await page.locator(".st-tabs").waitFor();
    await page.screenshot({
      path: "/tmp/settings-original-bound-desktop.png",
      fullPage: true,
    });
    assert.equal(await page.locator(".st-tabs [role=tab]").count(), 7);
    permissions = ["settings.view"];
    await page.reload();
    await page
      .getByLabel("نسبة ربح المنصة على التسعيرات", { exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByLabel("نسبة ربح المنصة على التسعيرات", { exact: true })
        .isDisabled(),
      true,
    );
    malformed = true;
    await page.reload();
    await page.getByRole("alert").waitFor();
    assert.equal(
      await page
        .getByLabel("نسبة ربح المنصة على التسعيرات", { exact: true })
        .isDisabled(),
      true,
    );
    console.log(
      "PASS settings on original UI: seven tabs/artwork/panels, sparse per-tab and all saves, zero, GET-only confirmation retry, 422 retention, contact list/detail/status/notes, contact arrays, real AI generation, unavailable contracts disabled, read-only/malformed/mobile/no runtime errors.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
