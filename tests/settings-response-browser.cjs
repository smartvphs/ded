const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE || "playwright-core",
);
const assert = require("node:assert/strict");
const fixture = require("./fixtures/settings-response-2026-10-23.json");
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
          accessToken: "settings-response-test",
        }),
      ),
    );
    const p = await c.newPage(),
      writes = [],
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    const rows = fixture.data.groups.flatMap((g) => g.settings);
    await p.route("**/api/**", async (route) => {
      const request = route.request(),
        path = new URL(request.url()).pathname;
      let body = { success: true, data: { items: [], unreadCount: 0 } };
      if (path === "/api/admin/me")
        body.data = { isSuperAdmin: true, permissions: [] };
      else if (path === "/api/admin/settings") {
        if (request.method() === "PATCH") {
          const update = request.postDataJSON();
          writes.push(update);
          for (const [k, v] of Object.entries(update))
            rows.find((r) => r.key === k).value = v;
        }
        body = fixture;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    });
    await p.goto(
      (process.env.TEST_BASE_URL || "http://127.0.0.1:5189") + "/#settings",
    );
    await p.waitForFunction(
      () =>
        document.querySelector('[aria-label="نسبة ربح المنصة على الخدمات"]')
          ?.value === "20",
    );
    assert.equal(await p.locator(".st-tabs [role=tab]").count(), 7);
    assert.equal(
      await p
        .getByLabel("حد الشريحة الأولى (قطع)", { exact: true })
        .first()
        .inputValue(),
      "3",
    );
    assert.equal(
      await p
        .getByLabel("نسبة ربح المورد", { exact: true })
        .first()
        .isDisabled(),
      true,
    );
    await p.getByText("حتى 48 ساعة", { exact: true }).waitFor();
    await p.getByText("حتى 120 دقيقة", { exact: true }).waitFor();
    await p.getByText("حتى 30 دقيقة", { exact: true }).waitFor();
    await p
      .getByLabel("حد الشريحة الأولى (قطع)", { exact: true })
      .first()
      .fill("4");
    await p
      .getByRole("button", { name: "حفظ إعدادات التسعير", exact: true })
      .click();
    await p.getByText("تم حفظ الإعدادات.", { exact: true }).waitFor();
    assert.deepEqual(writes.at(-1), { pricing_free_parts_limit: 4 });
    await p.getByRole("tab", { name: "إعدادات كاش باك", exact: true }).click();
    assert.equal(
      await p.getByLabel("نسبة الكاش باك", { exact: true }).inputValue(),
      "0",
    );
    assert.equal(
      await p.getByLabel("حد أعلى الكاش باك", { exact: true }).inputValue(),
      "0",
    );
    assert.equal(
      await p.getByLabel("حد أدنى للطلب", { exact: true }).isDisabled(),
      true,
    );
    await p.getByLabel("حد أعلى الكاش باك", { exact: true }).fill("50");
    await p
      .getByRole("button", { name: "حفظ إعدادات التسعير", exact: true })
      .click();
    await p.waitForFunction(
      () =>
        document.querySelector('[aria-label="حد أعلى الكاش باك"]')?.disabled ===
        false,
    );
    assert.deepEqual(writes.at(-1), { cashback_max_per_order: 50 });
    await p
      .getByRole("tab", { name: "وقت تجهيز الطلبات", exact: true })
      .click();
    assert.equal(
      await p.getByLabel("عدد الساعات *", { exact: true }).inputValue(),
      "24",
    );
    await p.getByRole("button", { name: "يوم", exact: true }).click();
    assert.equal(
      await p.getByLabel("عدد الأيام *", { exact: true }).inputValue(),
      "1",
    );
    assert.equal(writes.length, 2);
    await p.getByLabel("عدد الأيام *", { exact: true }).fill("2");
    await p
      .getByRole("button", { name: "حفظ إعدادات الدفع", exact: true })
      .click();
    await p.waitForFunction(
      () =>
        document.querySelector('[aria-label="عدد الأيام *"]')?.disabled ===
        false,
    );
    assert.deepEqual(writes.at(-1), { supplier_fulfillment_hours: 48 });
    await p.getByRole("button", { name: "ساعة", exact: true }).click();
    assert.equal(
      await p.getByLabel("عدد الساعات *", { exact: true }).inputValue(),
      "48",
    );
    assert.equal(
      await p
        .getByRole("switch", { name: "يوم الأحد", exact: true })
        .isDisabled(),
      true,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS actual settings response: free limit and SLA, cashback zero/max, fulfillment hours/day conversion, sparse backend keys, original seven tabs, ambiguous supplier commission blocked.",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
