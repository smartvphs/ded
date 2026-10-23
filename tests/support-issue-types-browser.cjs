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
        JSON.stringify({
          verified: true,
          accessToken: "types-test",
          admin: { name: "اختبار" },
        }),
      ),
    );
    const p = await c.newPage(),
      errors = [],
      writes = [];
    p.on("pageerror", (e) => errors.push(e.message));
    let manage = true,
      failRead = false,
      sequence = 0;
    const types = [
      {
        id: "other",
        code: "other",
        name: "أخرى",
        name_en: "Other",
        is_active: true,
        is_protected: true,
        sort_order: 1,
        tickets_count: 0,
      },
      {
        id: "used",
        code: "technical",
        name: "مشكلة تقنية",
        name_en: "Technical",
        is_active: true,
        is_protected: false,
        sort_order: 2,
        tickets_count: 3,
      },
    ];
    await c.route("https://car-parts-backend.vercel.app/**", async (r) => {
      const q = r.request(),
        u = new URL(q.url()),
        path = u.pathname,
        method = q.method(),
        body = q.postDataJSON();
      const send = (data, status = 200, message) =>
        r.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify({ success: status < 400, data, message }),
        });
      if (path === "/api/admin/notifications")
        return send({ items: [], unreadCount: 0 });
      if (path === "/api/admin/me")
        return send({
          id: "admin",
          permissions: manage ? ["support.manage"] : ["support.view"],
        });
      if (path === "/api/support-tickets/admin")
        return send({ items: [], total: 0, countsByStatus: { open: 0 } });
      if (path === "/api/support-tickets/categories")
        return send(types.filter((x) => x.is_active));
      if (
        path === "/api/support-tickets/admin/categories" &&
        method === "GET"
      ) {
        if (failRead) {
          failRead = false;
          return send(null, 503, "قراءة مؤقتة فاشلة");
        }
        return send({ items: types });
      }
      if (method === "GET") throw Error("Unexpected " + path);
      writes.push({ path, method, body });
      if (
        path === "/api/support-tickets/admin/categories" &&
        method === "POST"
      ) {
        const row = {
          id: "new" + ++sequence,
          code: body.code,
          name: body.name,
          name_en: body.nameEn ?? null,
          is_active: body.isActive,
          sort_order: body.sortOrder ?? 3,
          tickets_count: 0,
          is_protected: false,
        };
        types.push(row);
        failRead = true;
        return send(row, 201);
      }
      const id = path.split("/").pop(),
        row = types.find((x) => x.id === id);
      assert(row);
      if (method === "PATCH") {
        for (const [key, value] of Object.entries(body))
          row[
            {
              nameEn: "name_en",
              isActive: "is_active",
              sortOrder: "sort_order",
            }[key] || key
          ] = value;
        return send(row);
      }
      if (method === "DELETE") {
        types.splice(types.indexOf(row), 1);
        return send({ deleted: true });
      }
      throw Error("Unexpected write");
    });
    const base = process.env.TEST_BASE_URL || "http://127.0.0.1:5189";
    await p.goto(base + "/#support");
    await p.getByRole("button", { name: "أنواع المشكلة", exact: true }).click();
    await p.getByLabel("حذف نوع المشكلة أخرى", { exact: true }).waitFor();
    assert(
      await p.getByLabel("حذف نوع المشكلة أخرى", { exact: true }).isDisabled(),
    );
    assert(
      await p
        .getByLabel("حذف نوع المشكلة مشكلة تقنية", { exact: true })
        .isDisabled(),
    );
    await p.getByLabel("تعديل نوع المشكلة أخرى", { exact: true }).click();
    assert(await p.getByLabel("نوع مشكلة مفعّل", { exact: true }).isDisabled());
    await p.getByRole("dialog").getByLabel("إغلاق", { exact: true }).click();
    await p
      .getByRole("button", { name: "إضافة نوع مشكلة", exact: true })
      .click();
    const d = () => p.getByRole("dialog");
    await d().getByLabel("اسم نوع المشكلة", { exact: true }).fill("نوع اختبار");
    await d().getByLabel("كود نوع المشكلة", { exact: true }).fill("qa_type");
    await d().getByLabel("نوع مشكلة مفعّل", { exact: true }).uncheck();
    await d()
      .getByRole("button", { name: "حفظ نوع المشكلة", exact: true })
      .click();
    await d().getByText("قراءة مؤقتة فاشلة", { exact: true }).waitFor();
    await d().getByLabel("إغلاق", { exact: true }).click();
    await p
      .getByRole("button", { name: "إضافة نوع مشكلة", exact: true })
      .click();
    assert.equal(
      await d().getByLabel("اسم نوع المشكلة", { exact: true }).inputValue(),
      "نوع اختبار",
    );
    await d()
      .getByRole("button", { name: "إعادة التحقق", exact: true })
      .click();
    await d().waitFor({ state: "hidden" });
    assert.equal(writes.filter((x) => x.method === "POST").length, 1);
    await p.getByLabel("تعديل نوع المشكلة نوع اختبار", { exact: true }).click();
    await d().getByLabel("اسم نوع المشكلة", { exact: true }).fill("نوع معدل");
    await d()
      .getByLabel("اسم نوع المشكلة بالإنجليزي", { exact: true })
      .fill("Updated");
    await d().getByLabel("ترتيب نوع المشكلة", { exact: true }).fill("0");
    await d().getByLabel("نوع مشكلة مفعّل", { exact: true }).check();
    await d()
      .getByRole("button", { name: "حفظ نوع المشكلة", exact: true })
      .click();
    await d().waitFor({ state: "hidden" });
    assert.equal(types.at(-1).sort_order, 0);
    assert.equal(types.at(-1).name_en, "Updated");
    await p.getByLabel("تعديل نوع المشكلة نوع معدل", { exact: true }).click();
    await d()
      .getByLabel("اسم نوع المشكلة بالإنجليزي", { exact: true })
      .fill("");
    await d()
      .getByRole("button", { name: "حفظ نوع المشكلة", exact: true })
      .click();
    await d().waitFor({ state: "hidden" });
    assert.deepEqual(writes.filter((x) => x.method === "PATCH").at(-1).body, {
      nameEn: null,
    });
    await p.getByLabel("حذف نوع المشكلة نوع معدل", { exact: true }).click();
    await d().getByRole("button", { name: "تأكيد الحذف", exact: true }).click();
    await d().waitFor({ state: "hidden" });
    assert.equal(types.length, 2);
    manage = false;
    await p.reload();
    await p.getByRole("button", { name: "أنواع المشكلة", exact: true }).click();
    assert(
      await p
        .getByRole("button", { name: "إضافة نوع مشكلة", exact: true })
        .isDisabled(),
    );
    assert.equal(
      await p
        .getByLabel("تعديل نوع المشكلة مشكلة تقنية", { exact: true })
        .count(),
      0,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS support issue types: server catalogs, protected/used deletion guards, create/readback retry across close without duplicate POST, sparse edit/null/zero, delete, read-only permissions.",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
