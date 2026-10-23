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
    const context = await browser.newContext();
    await context.addInitScript(() =>
      localStorage.setItem(
        "mypart.admin.session.v1",
        JSON.stringify({
          verified: true,
          accessToken: "supplier-wallet-test",
          admin: { name: "اختبار" },
        }),
      ),
    );
    const page = await context.newPage();
    let posts = 0,
      reads = 0,
      failRead = true;
    await page.route(
      "https://car-parts-backend.vercel.app/**",
      async (route) => {
        const req = route.request(),
          p = new URL(req.url()).pathname;
        assert.equal(
          req.headers().authorization,
          "Bearer supplier-wallet-test",
        );
        const send = (data, status = 200) =>
          route.fulfill({
            status,
            contentType: "application/json",
            body: JSON.stringify({ success: status < 400, ...data }),
          });
        if (p === "/api/admin/notifications")
          return send({
            data: { items: [], unreadCount: 0 },
            meta: { total: 0 },
          });
        if (
          p === "/api/cars/admin/makes" ||
          p === "/api/suppliers/quality-tiers"
        )
          return send({ data: [] });
        if (p === "/api/suppliers/admin")
          return send({
            data: {
              items: [
                {
                  id: "s",
                  name: "المورد",
                  approval_status: "approved",
                  wallet_balance: "100",
                },
              ],
              total: 1,
              countsByStatus: { approved: 1 },
            },
          });
        if (p === "/api/suppliers/admin/s/wallet")
          return send({ data: { balance: posts ? 175 : 100 } });
        if (p === "/api/suppliers/admin/s/credit") {
          assert.equal(req.method(), "POST");
          assert.equal(req.postDataJSON().amount, 75);
          posts++;
          return send({
            data: { id: "t", amount: "75", balance_after: "175" },
          });
        }
        if (p === "/api/suppliers/admin/s/transactions") {
          reads++;
          if (failRead) {
            failRead = false;
            return send({ message: "تعذر التحقق" }, 503);
          }
          return send({
            data: [{ id: "t", amount: "75", balance_after: "175" }],
            meta: { total: 1 },
          });
        }
        return send({ message: "not found" }, 404);
      },
    );
    await page.goto("http://127.0.0.1:5189/#suppliers");
    await page
      .getByRole("button", { name: "إجراءات المورد", exact: true })
      .click();
    await page.getByRole("menuitem", { name: "تسوية الرصيد" }).click();
    await page.getByLabel("المبلغ", { exact: true }).fill("75");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "تسوية الرصيد", exact: true })
      .click();
    await page.getByText("تعذر التحقق", { exact: true }).waitFor();
    assert.equal(posts, 1);
    await page.getByRole("button", { name: "إغلاق", exact: true }).click();
    await page
      .getByRole("button", { name: "إجراءات المورد", exact: true })
      .click();
    await page.getByRole("menuitem", { name: "تسوية الرصيد" }).click();
    await page
      .getByRole("button", { name: "إعادة التحقق", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(posts, 1);
    assert.equal(reads, 2);
    console.log(
      "Supplier wallet browser PASS: saved transaction survives modal close, retry only GET, single mocked credit.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
