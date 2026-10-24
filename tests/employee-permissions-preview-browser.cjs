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
    await context.addInitScript(() => {
      localStorage.setItem(
        "mypart.admin.session.v1",
        JSON.stringify({
          verified: true,
          accessToken: "ui-test",
          admin: {
            id: "test",
            name: "Admin",
            role: "admin",
            isSuperAdmin: true,
            permissions: [],
          },
        }),
      );
      sessionStorage.setItem("mypart.screen", "employees");
    });
    const calls = [],
      errors = [];
    await context.route("https://car-parts-backend.vercel.app/**", (r) => {
      calls.push(r.request().url());
      return r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { items: [], unreadCount: 0 },
          meta: { total: 0 },
        }),
      });
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(
      (process.env.TEST_BASE_URL || "http://127.0.0.1:5189") + "/#employees",
    );
    const root = page.locator(".employee-permissions-preview");
    await root.waitFor();
    assert.equal(await root.locator(".epp-main-row").count(), 8);
    assert.equal(await root.getByRole("checkbox").count(), 24);
    const check = root.getByRole("checkbox", {
      name: "التصنيفات قراءة",
      exact: true,
    });
    assert.equal(await check.isChecked(), true);
    await check.uncheck();
    await root.getByRole("button", { name: "التصنيفات", exact: true }).click();
    await root.getByRole("button", { name: "العملاء", exact: true }).click();
    assert.equal(await root.locator(".epp-extra").count(), 2);
    assert.equal(await root.getByRole("checkbox").count(), 30);
    await root
      .getByRole("checkbox", { name: "تعديل الإحصائيات", exact: true })
      .check();
    await page.screenshot({
      path: "/tmp/employees-expanded.png",
      fullPage: true,
    });
    await root.getByRole("button", { name: "التصنيفات", exact: true }).click();
    await root.getByRole("button", { name: "العملاء", exact: true }).click();
    await page.screenshot({
      path: "/tmp/employees-collapsed.png",
      fullPage: true,
    });
    await root.getByRole("button", { name: "2", exact: true }).click();
    await root.getByRole("button", { name: "1", exact: true }).click();
    assert.equal(await check.isChecked(), false);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: "/tmp/employees-mobile.png",
      fullPage: true,
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    assert.equal(
      calls.some((url) => /\/staff|\/permissions|\/admin\/me/.test(url)),
      false,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Employee permission UI: desktop, expansions, toggles, pagination, mobile and no staff API calls passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
