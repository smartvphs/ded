const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE || "playwright-core",
);
const assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const c = await b.newContext({ viewport: { width: 1440, height: 1100 } });
    await c.addInitScript(() =>
      localStorage.setItem(
        "mypart.admin.session.v1",
        JSON.stringify({ verified: true, accessToken: "oct23-test" }),
      ),
    );
    const p = await c.newPage(),
      errors = [],
      writes = [];
    p.on("pageerror", (e) => errors.push(e.message));
    const fixture = structuredClone(
      require("./fixtures/settings-response-2026-10-23.json"),
    );
    fixture.data.groups[0].settings.push(
      ...["free", "normal", "express"].map((type) => ({
        key: "pricing_" + type + "_enabled",
        label: "enabled " + type,
        type: "boolean",
        value: 1,
        min: 0,
        max: 1,
      })),
      {
        key: "cashback_min_order",
        label: "الحد الأدنى للكاش باك",
        type: "money",
        value: 0,
        min: 0,
      },
    );
    let site = {
      contact: {
        phones: [{ label: "الدعم", number: "+966500000001" }],
        emails: [{ label: "الدعم", email: "real@example.com" }],
        address: "الرياض",
        warehouse: { name: "رئيسي", address: "قديم", lat: 24, lng: 46 },
        location: {
          mapUrl: "https://maps.google.com/?q=24,46",
          lat: 24,
          lng: 46,
        },
        socials: {
          instagram: "https://instagram.com/example",
          x: "https://x.com/example",
          tiktok: "https://tiktok.com/keep",
        },
      },
      workingHours: {
        days: ["sat", "sun", "mon", "tue", "wed", "thu", "fri"].map((day) => ({
          day,
          isOpen: true,
          from: "09:00",
          to: "22:00",
        })),
        holidays: [{ date: "2026-12-01", name: "إجازة" }],
        isOpenNow: true,
        todayHoliday: null,
      },
      pricingTypes: {
        free: { title: "مجاني", titleEn: "Free", description: "قديم" },
        normal: { title: "عادي", description: "محفوظ" },
        express: { title: "سريع", description: "محفوظ" },
      },
    };
    let failSiteRead = false;
    const supplier = {
      id: "s1",
      name: "مورد فعلي",
      contact_name: "أحمد",
      phone: "+966500000002",
      email: "s@example.com",
      city: "الرياض",
      address: "قديم",
      supported_make_ids: [],
      supported_brands: [],
      supported_qualities: [],
      account_status: "active",
      approval_status: "approved",
      working_hours: null,
      pricing_hours: null,
    };
    const stats = {
      period: { from: "2026-09-24", to: "2026-10-23" },
      response: {
        quotations: 0,
        accepted: 0,
        acceptanceRate: null,
        firstResponses: 0,
        avgMinutes: null,
        lateResponses: 0,
      },
      fulfillment: { due: 0, late: 0 },
      activityHeatmap: ["sat", "sun", "mon", "tue", "wed", "thu", "fri"].map(
        (day) => ({ day, hours: Array(24).fill(0), total: 0 }),
      ),
      earnings: {
        acceptedSupplierAmount: "0.00",
        acceptedCustomerAmount: "0.00",
        commissionsTotal: "0.00",
        commissions: ["free", "normal", "express"].map((pricingType, i) => ({
          pricingType,
          percent: [1, 3, 5][i],
          amount: "0.00",
          count: 0,
        })),
      },
    };
    let priceList = {
        id: "l1",
        supplierId: "s1",
        fileName: "prices.csv",
        status: "processed",
        summary: { total: 1, unmatched: 1, cheaper: 0, expensive: 0 },
      },
      priceItems = [
        { id: "i1", part_number: "PN1", part_name: "فلتر", product_id: null },
      ];
    let priceDeleted = false,
      failPriceRead = false;
    await p.route("**/api/**", async (route) => {
      const req = route.request(),
        u = new URL(req.url()),
        path = u.pathname,
        method = req.method(),
        body = req.postDataJSON();
      const send = (data, status = 200) =>
        route.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify(
            status < 400
              ? { success: true, data }
              : { success: false, message: "رفض اختباري" },
          ),
        });
      if (method !== "GET") writes.push({ path, method, body });
      if (path === "/api/uploads/signature")
        return send({
          signature: "test",
          apiKey: "test",
          cloudName: "mock",
          folder: "car-parts/price-lists",
          timestamp: 1,
          uploadUrl: "https://api.cloudinary.com/v1_1/mock/raw/upload",
        });
      if (path === "/api/suppliers/admin/s1/price-lists") {
        priceList.status = "pending";
        return send({ id: "l1", status: "pending" }, 201);
      }
      if (path === "/api/suppliers/admin/price-lists/l1/process") {
        priceList.status = "processed";
        failPriceRead = true;
        return send({ matched: 1, unmatched: 0 });
      }
      if (path === "/api/admin/notifications")
        return send({ items: [], unreadCount: 0 });
      if (path === "/api/admin/me")
        return send({ id: "staff", isSuperAdmin: true, permissions: [] });
      if (path === "/api/admin/settings") {
        if (method === "PATCH")
          for (const [k, v] of Object.entries(body))
            fixture.data.groups
              .flatMap((g) => g.settings)
              .find((r) => r.key === k).value = v;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(fixture),
        });
      }
      if (path === "/api/admin/site-info") {
        if (method === "PATCH") {
          site = { ...site, ...body };
          failSiteRead = true;
        } else if (failSiteRead) {
          failSiteRead = false;
          return send(null, 503);
        }
        return send(site);
      }
      if (path === "/api/contact/admin")
        return send({ items: [], countsByStatus: {} });
      if (path === "/api/suppliers/admin")
        return send({
          items:
            u.searchParams.get("accountStatus") === "deleted"
              ? supplier.account_status === "deleted"
                ? [supplier]
                : []
              : [supplier],
          total: 1,
        });
      if (path === "/api/suppliers/admin/s1/status") {
        supplier.account_status = body.status;
        return send({ id: "s1", status: body.status, changed: true });
      }
      if (path === "/api/suppliers/admin/s1") {
        if (method === "PATCH") {
          const map = {
            contactName: "contact_name",
            supportedBrands: "supported_brands",
            supportedQualities: "supported_qualities",
            workingHours: "working_hours",
            pricingHours: "pricing_hours",
          };
          for (const [k, v] of Object.entries(body)) supplier[map[k] || k] = v;
        }
        if (method === "DELETE") {
          if (supplier.wallet_balance) return send(null, 409);
          supplier.account_status = "deleted";
        }
        return send(supplier);
      }
      if (path === "/api/suppliers/admin/s1/stats")
        return send({
          ...stats,
          period: {
            from: u.searchParams.get("from") || stats.period.from,
            to: u.searchParams.get("to") || stats.period.to,
          },
        });
      if (path === "/api/car-makes/admin") return send([]);
      if (path === "/api/suppliers/quality-tiers") return send([]);
      if (path === "/api/suppliers/admin/price-lists/l1/items/i1") {
        priceItems[0].product_id = body.productId;
        return send({ item: priceItems[0], counts: { matched: 1 } });
      }
      if (path === "/api/suppliers/admin/price-lists/l1") {
        if (method === "DELETE") {
          priceDeleted = true;
          return send({ id: "l1" });
        }
        if (priceDeleted) return send(null, 404);
        if (failPriceRead) {
          failPriceRead = false;
          return send(null, 503);
        }
        return send({ priceList, items: priceItems });
      }
      if (path === "/api/products/admin")
        return send([{ id: "p1", name: "منتج فعلي" }]);
      throw Error("Unexpected " + method + " " + path);
    });
    await p.goto(
      (process.env.TEST_BASE_URL || "http://127.0.0.1:5189") + "/#settings",
    );
    await p.waitForFunction(
      () =>
        document.querySelector('[aria-label="نسبة ربح المنصة على التسعيرات"]')
          ?.value === "20",
    );
    assert.equal(
      await p
        .getByLabel("نسبة ربح المنصة على الخدمات", { exact: true })
        .isDisabled(),
      true,
    );
    assert.equal(
      await p
        .getByLabel("نسبة ربح المورد", { exact: true })
        .first()
        .inputValue(),
      "1",
    );
    await p.getByLabel("نسبة ربح المورد", { exact: true }).first().fill("2");
    await p.getByLabel("نص توضيحي مجاني", { exact: true }).fill("وصف جديد");
    await p
      .getByRole("switch", { name: "تفعيل التسعير السريع", exact: true })
      .click();
    await p
      .getByRole("button", { name: "حفظ جميع الإعدادات", exact: true })
      .click();
    await p.getByRole("alert").waitFor();
    await p
      .getByRole("button", { name: "إعادة التحقق", exact: true })
      .first()
      .click();
    await p.getByText("تم حفظ الإعدادات.", { exact: true }).waitFor();
    assert.deepEqual(
      writes.find((x) => x.path === "/api/admin/settings").body,
      { supplier_commission_free: 2, pricing_express_enabled: 0 },
    );
    assert.equal(site.pricingTypes.free.titleEn, "Free");
    assert.equal(site.pricingTypes.normal.description, "محفوظ");
    assert.equal(
      writes.filter((x) => x.path === "/api/admin/site-info").length,
      1,
    );
    await p.getByRole("tab", { name: "إدارة التواصل", exact: true }).click();
    await p.getByRole("tab", { name: "إعدادات التواصل", exact: true }).click();
    await p.getByLabel("رقم الجوال*", { exact: true }).fill("+966500000009");
    await p
      .getByRole("button", { name: "حفظ إعدادات الدفع", exact: true })
      .click();
    await p.getByRole("alert").waitFor();
    await p
      .getByRole("button", { name: "إعادة التحقق", exact: true })
      .first()
      .click();
    await p.getByText("تم حفظ الإعدادات.", { exact: true }).waitFor();
    assert.equal(site.contact.phones[0].label, "الدعم");
    assert.equal(site.contact.location.lat, 24);
    assert.equal(site.contact.socials.tiktok, "https://tiktok.com/keep");
    await p
      .getByRole("tab", { name: "وقت تجهيز الطلبات", exact: true })
      .click();
    await p.getByLabel("بداية عمل الخميس", { exact: true }).fill("16:00");
    await p.getByLabel("نهاية عمل الخميس", { exact: true }).fill("02:00");
    await p
      .getByRole("button", { name: "حفظ إعدادات الدفع", exact: true })
      .click();
    await p.getByRole("alert").waitFor();
    await p
      .getByRole("button", { name: "إعادة التحقق", exact: true })
      .first()
      .click();
    await p.getByText("تم حفظ الإعدادات.", { exact: true }).waitFor();
    assert.deepEqual(site.workingHours.holidays, [
      { date: "2026-12-01", name: "إجازة" },
    ]);
    assert.equal(
      site.workingHours.days.find((d) => d.day === "thu").to,
      "02:00",
    );
    assert.equal(site.pricingTypes.free.description, "وصف جديد");
    assert.equal(await p.locator(".st-tabs [role=tab]").count(), 7);
    async function mount(module, exportName, props) {
      await p.evaluate(
        async ({ module, exportName, props }) => {
          const React = (await import("/node_modules/.vite/deps/react.js"))
            .default;
          const dom =
            await import("/node_modules/.vite/deps/react-dom_client.js");
          document.getElementById("root").style.display = "none";
          if (!window.harness) {
            const el = document.createElement("div");
            document.body.appendChild(el);
            window.harness = (dom.createRoot || dom.default.createRoot)(el);
          }
          const Component = (await import("/src/" + module + ".jsx"))[
            exportName || "default"
          ];
          window.saved = false;
          window.harness.render(
            React.createElement(Component, {
              key: Math.random(),
              ...props,
              onClose: () => {
                window.closed = true;
              },
              onSaved: () => {
                window.saved = true;
              },
            }),
          );
        },
        { module, exportName, props },
      );
    }
    await mount("SupplierForms", "SupplierEditor", { supplier });
    await p
      .getByRole("dialog", { name: "تعديل بيانات المورد", exact: true })
      .waitFor();
    await p.getByPlaceholder("اسم الشركة", { exact: true }).fill("شركة معدلة");
    await p.getByRole("button", { name: "حفظ التعديلات", exact: true }).click();
    await p.waitForFunction(() => window.saved);
    assert.equal(supplier.name, "شركة معدلة");
    await mount("SupplierForms", "SupplierEditor", { supplier });
    await p.locator("select").filter({has:p.locator("option[value=edit]")}).selectOption("edit");
    const hoursDialog = p.getByRole("dialog", {
      name: "مواعيد المورد بتوقيت السعودية",
      exact: true,
    });
    await hoursDialog
      .locator(".su-field")
      .filter({ hasText: "الأحد" })
      .getByRole("checkbox")
      .check();
    await hoursDialog.getByLabel("بداية الأحد", { exact: true }).fill("16:00");
    await hoursDialog.getByLabel("نهاية الأحد", { exact: true }).fill("02:00");
    await hoursDialog
      .getByRole("button", { name: "اعتماد المواعيد", exact: true })
      .click();
    await p.getByRole("button", { name: "حفظ التعديلات", exact: true }).click();
    await p.waitForFunction(() => window.saved);
    assert.equal(
      supplier.working_hours.days.find((d) => d.day === "sun").to,
      "02:00",
    );
    assert.equal(supplier.pricing_hours, null);

    assert.deepEqual(
      writes.find(
        (x) => x.path === "/api/suppliers/admin/s1" && x.method === "PATCH",
      ).body,
      { name: "شركة معدلة" },
    );
    await mount("SupplierAccountAction", null, { supplier, kind: "account" });
    await p.getByRole("button", { name: "تأكيد", exact: true }).click();
    await p.waitForFunction(() => window.saved);
    assert.equal(supplier.account_status, "suspended");
    await mount("SupplierAccountAction", null, { supplier, kind: "account" });
    await p.getByRole("button", { name: "تأكيد", exact: true }).click();
    await p.waitForFunction(() => window.saved);
    assert.equal(supplier.account_status, "active");
    supplier.wallet_balance = 10;
    await mount("SupplierAccountAction", null, { supplier, kind: "delete" });
    await p.getByRole("button", { name: "تأكيد", exact: true }).click();
    await p.getByRole("alert").waitFor();
    assert.equal(supplier.account_status, "active");
    supplier.wallet_balance = 0;
    await p.getByRole("button", { name: "تأكيد", exact: true }).click();
    await p.waitForFunction(() => window.saved);
    assert.equal(supplier.account_status, "deleted");
    await mount("PriceListLink", null, { listId: "l1", row: priceItems[0] });
    await p.getByLabel("منتج بند الملف", { exact: true }).selectOption("p1");
    await p.getByRole("button", { name: "ربط المنتج", exact: true }).click();
    await p.waitForFunction(() => window.saved);
    assert.equal(priceItems[0].product_id, "p1");
    supplier.account_status = "active";
    await p.route("https://api.cloudinary.com/**", (r) =>
      r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          secure_url: "https://res.cloudinary.com/mock/raw/upload/file.csv",
        }),
      }),
    );
    await mount("SupplierPriceUpload", null, {});
    await p.getByLabel("مورد ملف الأسعار", { exact: true }).selectOption("s1");
    await p
      .getByRole("dialog", { name: "رفع ملف عروض أسعار", exact: true })
      .locator("input[type=file]")
      .setInputFiles({
        name: "prices.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(
          "رقم القطعة,اسم القطعة,الوحدة,السعر\nPN1,فلتر,حبة,20\n",
        ),
      });
    await p.getByRole("button", { name: "رفع ومعالجة", exact: true }).click();
    await p.getByRole("alert").waitFor();
    await p.getByRole("button", { name: "إعادة التحقق", exact: true }).click();
    await p.waitForFunction(() => window.saved);
    assert.equal(
      writes.filter((x) => x.path === "/api/suppliers/admin/s1/price-lists")
        .length,
      1,
    );
    assert.equal(
      writes.filter((x) => x.path.endsWith("/l1/process")).length,
      1,
    );
    assert.equal(
      writes.find((x) => x.path.endsWith("/l1/process")).body.rows[0][0],
      "رقم القطعة",
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS Oct23 integration: original settings semantic bindings, full-section site save preserves translations/location/holidays and GET-only retry, overnight hours, sparse supplier edit, suspend/reactivate/delete 409, price-list item link, signed Arabic CSV upload/process and GET-only retry; no runtime errors.",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
