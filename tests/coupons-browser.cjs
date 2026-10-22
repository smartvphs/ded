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
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await context.addInitScript(() =>
      localStorage.setItem(
        "mypart.admin.session.v1",
        JSON.stringify({
          verified: true,
          accessToken: "coupon-test",
          admin: { name: "اختبار" },
        }),
      ),
    );
    const page = await context.newPage(),
      reads = [],
      writes = [],
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    let failList = true,
      failCreate = true,
      failRead = false,
      unknownDuplicate = false,
      deleteConflict = true,
      readOnly = false,
      denyList = false,
      ignoreValue = false;
    const coupons = Array.from({ length: 7 }, (_, i) => ({
      id: "c" + i,
      code: "SAVE" + i,
      discount_type: i === 1 ? "fixed" : "percentage",
      value: i === 1 ? "50.00" : "10.00",
      max_uses: i === 0 ? 100 : null,
      used_count: i === 0 ? 9 : 0,
      expires_at: "2027-01-01T00:00:00.123Z",
      is_active: i !== 4,
      min_order_value: "200.00",
      starts_at: "2026-10-01T00:00:00.123Z",
      created_at: "2026-10-22T10:00:00Z",
      max_discount: "50.00",
      payment_methods: ["mada", "visa"],
      description: "وصف من الباك اند " + i,
      state: i === 4 ? "inactive" : "valid",
      orders_count: i === 0 ? 8 : 0,
      total_discount: i === 0 ? "945.99" : "0",
    }));
    const map = {
      discountType: "discount_type",
      maxUses: "max_uses",
      minOrderValue: "min_order_value",
      startsAt: "starts_at",
      expiresAt: "expires_at",
      isActive: "is_active",
    };
    await page.route(
      "https://car-parts-backend.vercel.app/**",
      async (route) => {
        const req = route.request(),
          u = new URL(req.url()),
          path = u.pathname,
          method = req.method(),
          body = req.postDataJSON();
        assert.equal(req.headers().authorization, "Bearer coupon-test");
        const send = (data, status = 200) =>
          route.fulfill({
            status,
            contentType: "application/json",
            body: JSON.stringify({ success: status < 400, ...data }),
          });
        if (method === "GET") reads.push(path + u.search);
        else writes.push({ path, method, body });
        if (path === "/api/admin/me")
          return send({
            data: {
              id: "admin",
              isSuperAdmin: false,
              permissions: readOnly
                ? ["accounting.view"]
                : ["coupons.manage", "reports.view"],
            },
          });
        if (path === "/api/admin/reports/coupons")
          return send({
            data: {
              period: {
                from: u.searchParams.get("from") || "2026-09-22",
                to: u.searchParams.get("to") || "2026-10-22",
              },
              totals: {
                couponsUsed: 1,
                ordersCount: 8,
                discountTotal: "945.99",
                grossSales: "7000.00",
              },
              items: [
                {
                  couponId: "c0",
                  code: "SAVE0",
                  discountType: "percentage",
                  ordersCount: 8,
                  customersCount: 6,
                  discountTotal: "945.99",
                  grossSales: "7000.00",
                },
              ],
            },
          });
        if (path === "/api/coupons" && method === "GET") {
          if (denyList) return send({ message: "forbidden" }, 403);
          if (failList) {
            failList = false;
            return send({ message: "تعذر تحميل الكوبونات" }, 503);
          }
          if (failRead && u.searchParams.get("limit") === "100") {
            failRead = false;
            return send({ message: "فشل تأكيد بيانات الكوبون" }, 503);
          }
          let rows = coupons;
          const search = u.searchParams.get("search");
          if (search)
            rows = rows.filter((c) =>
              (c.code + c.description).includes(search),
            );
          if (u.searchParams.get("status"))
            rows = rows.filter(
              (c) =>
                c.is_active === (u.searchParams.get("status") === "active"),
            );
          if (u.searchParams.get("validity"))
            rows = rows.filter(
              (c) => c.state === u.searchParams.get("validity"),
            );
          if (u.searchParams.get("paymentMethod"))
            rows = rows.filter(
              (c) =>
                c.payment_methods == null ||
                c.payment_methods.includes(u.searchParams.get("paymentMethod")),
            );
          const total = rows.length,
            offset = +u.searchParams.get("offset"),
            limit = +u.searchParams.get("limit");
          return send({
            data: rows.slice(offset, offset + limit),
            meta: {
              total,
              metrics: {
                total_coupons: coupons.length,
                active_coupons: 6,
                valid_coupons: 6,
                total_uses: 9,
                orders_with_coupon: 8,
                total_discount_value: "945.99",
                average_discount_per_use: "118.25",
              },
            },
          });
        }
        function make(body, id, source) {
          const row = source
            ? { ...source }
            : {
                discount_type: "percentage",
                value: "0",
                max_uses: null,
                min_order_value: null,
                starts_at: null,
                expires_at: null,
                is_active: true,
                payment_methods: null,
                max_discount: null,
                description: null,
              };
          for (const [key, val] of Object.entries(body)) {
            assert(
              ![
                "maxDiscount",
                "paymentMethods",
                "description",
                "max_discount",
                "payment_methods",
              ].includes(key),
            );
            row[map[key] || key] = val;
          }
          row.id = id;
          row.used_count = 0;
          row.orders_count = 0;
          row.total_discount = "0";
          row.state = row.is_active ? "valid" : "inactive";
          coupons.push(row);
          return row;
        }
        if (path === "/api/coupons" && method === "POST") {
          if (failCreate) {
            failCreate = false;
            return send({ message: "كود الكوبون مستخدم بالفعل" }, 409);
          }
          const row = make(body, "created");
          failRead = true;
          return send({ data: row }, 201);
        }
        const m = path.match(/^\/api\/coupons\/(.+?)(\/duplicate)?$/);
        if (m) {
          const row = coupons.find((c) => c.id === m[1]);
          assert(row);
          if (m[2]) {
            if (unknownDuplicate)
              return send({ message: "تعذر تأكيد النسخ" }, 503);
            const clone = make(body, "cloned", row);
            failRead = true;
            return send({ data: clone }, 201);
          }
          if (method === "DELETE") {
            if (deleteConflict) {
              deleteConflict = false;
              return send({ message: "الكوبون مستخدم؛ أوقفه بدل الحذف" }, 409);
            }
            coupons.splice(coupons.indexOf(row), 1);
            failRead = true;
            return send({ data: { deleted: true } });
          }
          if (method === "PATCH") {
            for (const [key, val] of Object.entries(body)) {
              assert(
                !["maxDiscount", "paymentMethods", "description"].includes(key),
              );
              if (key === "value" && ignoreValue) continue;
              row[map[key] || key] = val;
            }
            row.state = row.is_active ? "valid" : "inactive";
            return send({ data: row });
          }
        }
        throw new Error("Unexpected endpoint " + method + " " + path);
      },
    );
    await page.goto(
      (process.env.TEST_BASE_URL || "http://127.0.0.1:5189") + "/#coupons",
    );
    await page.getByText("تعذر تحميل الكوبونات", { exact: true }).waitFor();
    await page
      .getByRole("button", { name: "إعادة المحاولة", exact: true })
      .click();
    await page
      .getByRole("button", { name: "تعديل SAVE0", exact: true })
      .waitFor();
    assert(
      await page
        .getByRole("button", { name: "حذف SAVE0", exact: true })
        .isDisabled(),
    );
    await page.screenshot({ path: "/tmp/coupons-desktop.png", fullPage: true });
    await page
      .getByRole("button", { name: "نسخ كود SAVE0", exact: true })
      .click();
    assert.equal(
      await page.evaluate(() => navigator.clipboard.readText()),
      "SAVE0",
    );
    await page.getByRole("button", { name: "التالي", exact: true }).click();
    await page
      .getByRole("button", { name: "تعديل SAVE3", exact: true })
      .waitFor();
    assert(reads.some((p) => p.includes("offset=3")));
    await page.getByLabel("البحث في الكوبونات").fill("SAVE0");
    await page
      .getByRole("button", { name: "تعديل SAVE0", exact: true })
      .click();
    assert(
      (await page
        .getByLabel("الوصف", { exact: true })
        .getAttribute("readonly")) !== null,
    );
    assert(
      (await page
        .getByLabel("أقصى خصم", { exact: true })
        .getAttribute("readonly")) !== null,
    );
    assert(
      (
        await page
          .getByLabel("وسائل الدفع المسموحة", { exact: true })
          .inputValue()
      ).includes("مدى"),
    );
    await page.getByLabel("قيمة الخصم", { exact: true }).fill("15");
    await page.getByLabel("حد الاستخدام", { exact: true }).fill("");
    await page
      .getByRole("button", { name: "حفظ الكوبون", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "تعديل الكوبون", exact: true })
      .waitFor({ state: "hidden" });
    const patch = writes.find(
      (w) => w.path === "/api/coupons/c0" && w.method === "PATCH",
    );
    assert.deepEqual(patch.body, { value: 15, maxUses: null });
    assert.equal(coupons[0].expires_at, "2027-01-01T00:00:00.123Z");
    await page
      .getByRole("checkbox", { name: "تفعيل SAVE0", exact: true })
      .click();
    await page.getByRole("button", { name: "تأكيد", exact: true }).click();
    await page
      .getByRole("checkbox", { name: "تفعيل SAVE0", exact: true })
      .waitFor();
    await page.waitForFunction(
      () => !document.querySelector('[aria-label="تفعيل SAVE0"]').checked,
    );
    assert.equal(coupons[0].is_active, false);
    await page
      .getByRole("button", { name: "إضافة كوبون", exact: true })
      .click();
    await page.getByLabel("كود الكوبون", { exact: true }).fill("NEW15");
    await page.getByLabel("قيمة الخصم", { exact: true }).fill("15");
    await page
      .getByLabel("بداية الصلاحية", { exact: true })
      .fill("2026-11-01T00:00");
    await page
      .getByLabel("نهاية الصلاحية", { exact: true })
      .fill("2026-12-01T00:00");
    await page
      .getByRole("button", { name: "حفظ الكوبون", exact: true })
      .click();
    await page
      .getByText("كود الكوبون مستخدم بالفعل", { exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "حفظ الكوبون", exact: true })
      .click();
    await page
      .getByRole("button", { name: "تأكيد البيانات", exact: true })
      .waitFor();
    const postCount = writes.filter(
      (w) => w.path === "/api/coupons" && w.method === "POST",
    ).length;
    await page
      .getByRole("button", { name: "تأكيد البيانات", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "إضافة كوبون جديد", exact: true })
      .waitFor({ state: "hidden" });
    assert.equal(
      writes.filter((w) => w.path === "/api/coupons" && w.method === "POST")
        .length,
      postCount,
    );
    assert.equal(
      coupons.find((c) => c.id === "created").starts_at,
      "2026-10-31T21:00:00.000Z",
    );
    await page.getByLabel("البحث في الكوبونات").fill("SAVE1");
    await page
      .getByRole("button", { name: "تكرار كوبون SAVE1", exact: true })
      .click();
    await page.getByLabel("كود الكوبون", { exact: true }).fill("COPY50");
    await page
      .getByRole("button", { name: "حفظ الكوبون", exact: true })
      .click();
    await page
      .getByRole("button", { name: "تأكيد البيانات", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "تأكيد البيانات", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "إنشاء نسخة من الكوبون", exact: true })
      .waitFor({ state: "hidden" });
    assert.equal(writes.filter((w) => w.path.endsWith("/duplicate")).length, 1);
    assert.equal(coupons.find((c) => c.id === "cloned").used_count, 0);
    await page.getByLabel("البحث في الكوبونات").fill("NEW15");
    await page.getByRole("button", { name: "حذف NEW15", exact: true }).click();
    await page.getByRole("button", { name: "تأكيد", exact: true }).click();
    await page
      .getByText("الكوبون مستخدم؛ أوقفه بدل الحذف", { exact: true })
      .waitFor();
    await page.getByRole("button", { name: "تأكيد", exact: true }).click();
    await page
      .getByRole("button", { name: "تأكيد البيانات", exact: true })
      .waitFor();
    const deletes = writes.filter((w) => w.method === "DELETE").length;
    await page
      .getByRole("button", { name: "تأكيد البيانات", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "حذف الكوبون", exact: true })
      .waitFor({ state: "hidden" });
    assert.equal(writes.filter((w) => w.method === "DELETE").length, deletes);
    await page.getByLabel("البحث في الكوبونات").fill("");
    await page.getByLabel("حالة تفعيل الكوبونات").selectOption("active");
    await page.getByLabel("صلاحية الكوبونات").selectOption("valid");
    await page.getByLabel("وسيلة دفع الكوبونات").selectOption("mada");
    await page.waitForResponse((r) => r.url().includes("paymentMethod=mada"));
    assert(
      reads.some(
        (p) =>
          p.includes("status=active") &&
          p.includes("validity=valid") &&
          p.includes("paymentMethod=mada"),
      ),
    );
    await page
      .getByRole("button", { name: "تقرير الاستخدام", exact: true })
      .click();
    await page.getByRole("cell", { name: "SAVE0", exact: true }).waitFor();
    await page.getByLabel("تقرير الكوبونات من تاريخ").fill("2026-10-01");
    await page
      .getByRole("button", { name: "عرض التقرير", exact: true })
      .click();
    await page
      .getByText("حدد بداية الفترة ونهايتها مع بعض.", { exact: true })
      .waitFor();
    await page.getByLabel("تقرير الكوبونات إلى تاريخ").fill("2026-10-22");
    await page
      .getByRole("button", { name: "عرض التقرير", exact: true })
      .click();
    await page.waitForResponse(
      (r) =>
        r.url().includes("/reports/coupons") &&
        r.url().includes("from=2026-10-01"),
    );
    await page.getByRole("cell", { name: "SAVE0", exact: true }).waitFor();
    await page
      .getByRole("button", { name: "رجوع للكوبونات", exact: true })
      .click();
    await page.getByLabel("البحث في الكوبونات").fill("SAVE1");
    await page
      .getByRole("button", { name: "تكرار كوبون SAVE1", exact: true })
      .click();
    unknownDuplicate = true;
    await page.getByLabel("كود الكوبون", { exact: true }).fill("UNCERTAIN");
    await page
      .getByRole("button", { name: "حفظ الكوبون", exact: true })
      .click();
    await page
      .getByText(
        "نتيجة الإضافة غير مؤكدة؛ راجع القائمة قبل المحاولة عشان الكوبون ما يتكررش.",
        { exact: true },
      )
      .waitFor();
    assert(
      await page
        .getByRole("button", { name: "حفظ الكوبون", exact: true })
        .isDisabled(),
    );
    await page.getByRole("button", { name: "إغلاق", exact: true }).click();
    await page
      .getByRole("button", { name: "تعديل SAVE1", exact: true })
      .click();
    ignoreValue = true;
    await page.getByLabel("قيمة الخصم", { exact: true }).fill("75");
    await page
      .getByRole("button", { name: "حفظ الكوبون", exact: true })
      .click();
    await page
      .getByText(
        "بعض بيانات الكوبون لم ترجع بالقيم المحفوظة. حدّث البيانات قبل المحاولة من جديد.",
        { exact: true },
      )
      .waitFor();
    const patches = writes.filter(
      (w) => w.path === "/api/coupons/c1" && w.method === "PATCH",
    ).length;
    await page
      .getByRole("button", { name: "تأكيد البيانات", exact: true })
      .click();
    assert.equal(
      writes.filter((w) => w.path === "/api/coupons/c1" && w.method === "PATCH")
        .length,
      patches,
    );
    await page.getByRole("button", { name: "إغلاق", exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(()=>document.querySelector(".sidebar").getBoundingClientRect().x>=innerWidth-1);
    const sidebarBox = await page.locator(".sidebar").boundingBox();
    assert(
      sidebarBox.x >= 389,
      "Closed sidebar must remain outside the mobile page",
    );
    await page.screenshot({ path: "/tmp/coupons-mobile.png", fullPage: true });
    readOnly = true;
    await page.reload();
    await page
      .getByRole("button", { name: "تعديل SAVE1", exact: true })
      .waitFor();
    assert(
      await page
        .getByRole("button", { name: "تعديل SAVE1", exact: true })
        .isDisabled(),
    );
    assert(
      await page
        .getByRole("button", { name: "إضافة كوبون", exact: true })
        .isDisabled(),
    );
    denyList = true;
    await page.reload();
    await page
      .getByText("ليس لديك صلاحية لعرض هذه البيانات أو تنفيذ الإجراء.", {
        exact: true,
      })
      .waitFor();
    assert.deepEqual(errors, []);
    console.log(
      "Coupons browser PASS: backend filters/paging/metrics, clipboard, partial edit preserving timestamps/readonly unsupported fields, status, create/duplicate/delete readback retry without repeated write, 409 and uncertain POST, ignored save detection, usage report, read-only/403, mobile/no JS errors.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
