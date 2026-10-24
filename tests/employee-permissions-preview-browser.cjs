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
    await page
      .getByRole("heading", { name: "إدارة الموظفين", exact: true })
      .waitFor();
    await page.getByRole("button", { name: "إضافة جديد", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("اسم الموظف", { exact: true }).fill("موظف تجريبي");
    await dialog
      .getByLabel("البريد الإلكتروني", { exact: true })
      .fill("preview@example.com");
    await dialog
      .getByLabel("كلمة المرور", { exact: true })
      .fill("preview-only");
    await dialog.getByRole("button", { name: "إضافة", exact: true }).click();
    await page
      .getByRole("button", { name: "عرض موظف تجريبي", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "حذف موظف تجريبي", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "حذف", exact: true })
      .click();
    assert.equal(
      await page
        .getByRole("button", { name: "عرض موظف تجريبي", exact: true })
        .count(),
      0,
    );
    await page
      .getByRole("textbox", { name: "البحث عن موظف" })
      .fill("محمد احمد");
    assert.equal(await page.locator(".employees-ui tbody tr").count(), 1);
    await page.getByRole("textbox", { name: "البحث عن موظف" }).fill("");
    await page.screenshot({ path: "/tmp/employees-list.png", fullPage: true });
    await page
      .getByRole("button", { name: "عرض محمد احمد", exact: true })
      .click();
    const root = page.locator(".employee-permissions-preview");
    await root.waitFor();
    assert.equal(
      await root.locator(".epp-department-cards .epp-extra").count(),
      7,
    );
    const deliveryView = root.getByRole("checkbox", {
      name: "عرض طلبات التوصيل",
      exact: true,
    });
    assert.equal(await deliveryView.isChecked(), false);
    const ordersRead = root.getByRole("checkbox", {
      name: "الطلبات قراءة",
      exact: true,
    });
    await ordersRead.uncheck();
    await deliveryView.check();
    assert.equal(await ordersRead.isChecked(), true);
    await deliveryView.uncheck();
    assert.equal(await ordersRead.isChecked(), false);
    await deliveryView.check();
    await ordersRead.uncheck();
    assert.equal(await deliveryView.isChecked(), false);
    await deliveryView.check();
    await root
      .getByRole("checkbox", { name: "إدارة التسويات", exact: true })
      .check();
    assert.equal(await deliveryView.isChecked(), true);

    assert.equal(await root.locator(".epp-main-row").count(), 11);
    assert.equal(await root.getByRole("checkbox").count(), 71);
    const check = root.getByRole("checkbox", {
      name: "التصنيفات قراءة",
      exact: true,
    });
    assert.equal(await check.isChecked(), true);
    await check.uncheck();
    await root.getByRole("button", { name: "التصنيفات", exact: true }).click();
    await root.getByRole("button", { name: "العملاء", exact: true }).click();
    assert.equal(await root.locator(".epp-extra-row .epp-extra").count(), 2);
    assert.equal(await root.getByRole("checkbox").count(), 77);
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
