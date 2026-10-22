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
          accessToken: "finance-test",
          admin: { name: "اختبار" },
        }),
      ),
    );
    const page = await context.newPage(),
      reads = [],
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    let failFinancial = true,
      failExport = true,
      denyReport = false,
      emptyParts = false,
      missingProfit = false,
      mismatchedPeriod = false,
      noExport = false;
    await page.route(
      "https://car-parts-backend.vercel.app/**",
      async (route) => {
        const req = route.request(),
          u = new URL(req.url()),
          path = u.pathname;
        assert.equal(req.method(), "GET");
        assert.equal(req.headers().authorization, "Bearer finance-test");
        reads.push(path + u.search);
        const send = (data, status = 200) =>
          route.fulfill({
            status,
            contentType: "application/json",
            body: JSON.stringify({ success: status < 400, ...data }),
          });
        if (path === "/api/admin/me")
          return send({
            data: {
              id: "admin",
              isSuperAdmin: false,
              permissions: noExport
                ? ["accounting.view"]
                : ["accounting.view", "data.export"],
            },
          });
        if (denyReport) return send({ message: "forbidden" }, 403);
        const period = {
          from: u.searchParams.get("from"),
          to: u.searchParams.get("to"),
          timezone: "Asia/Riyadh",
        };
        if (path === "/api/admin/reports/financial/export") {
          if (failExport) {
            failExport = false;
            return send({ message: "forbidden" }, 403);
          }
          assert(req.headers().accept.includes("text/csv"));
          return route.fulfill({
            contentType: "text/csv; charset=utf-8",
            body: "\ufeffالقسم,البند,القيمة\nالإيرادات,الصافي,850\n",
          });
        }
        if (path === "/api/admin/reports/financial") {
          if (failFinancial) {
            failFinancial = false;
            return send({ message: "تعذر تحميل التقرير المالي" }, 503);
          }
          return send({
            data: {
              period: mismatchedPeriod
                ? { ...period, from: "2000-01-01" }
                : period,
              revenue: {
                ordersCount: 8,
                grossSales: "1200",
                itemsSubtotal: "1000",
                discounts: "100",
                tax: "150",
                shipping: "150",
                walletPaid: "50",
                cashbackGranted: "10",
                refunds: "350",
                refundsCount: 1,
                netRevenue: "850",
                averageOrderValue: "150",
              },
              pricingFees: {
                paidCount: 5,
                paid: "100",
                refundedCount: 1,
                refunded: "20",
              },
              suppliers: {
                commissions: "40",
                pricingFees: "15",
                deductions: "10",
                adjustments: "5",
                settlementsPaidCount: 2,
                settlementsPaid: "500",
              },
              profit: {
                productMargin: "120",
                serviceMargin: "30",
                knownMarginSales: "700",
                unknownMarginSales: "300",
                allocatedDiscounts: "60",
                allocatedCashback: "7",
                returnedMargin: "5",
                pricingFeesPaid: "100",
                supplierCommissions: "40",
                supplierPricingFees: "15",
                knownProfit: "233",
              },
            },
          });
        }
        if (path === "/api/admin/reports/performance")
          return send({
            data: {
              period,
              kpis: {
                profit: {
                  amount: missingProfit ? null : "200",
                  knownProfit: "233",
                  paymentFees: "33",
                  isPartial: true,
                  unknownMarginSales: "300",
                },
                orders: { total: 8, active: 3, completed: 4 },
                pricingRequests: {
                  total: 10,
                  quoted: 4,
                  awaitingQuote: 3,
                  confirmed: 2,
                },
                activeCompanies: { count: 7 },
              },
            },
          });
        if (path === "/api/admin/reports/pricing-parts") {
          const group = (label, key) => ({
            label,
            totals: { partsCount: 2, pieces: 6, value: "300" },
            items: emptyParts
              ? []
              : [
                  {
                    quality: key,
                    qualityLabel: label + " جودة",
                    partsCount: 2,
                    pieces: 6,
                    requestsCount: 1,
                    value: "300",
                  },
                ],
          });
          return send({
            data: {
              period,
              priced: group("مسعرة", "original"),
              unpriced: group("غير مسعرة", "alternative"),
              confirmed: group("مؤكدة", "commercial"),
            },
          });
        }
        if (path === "/api/admin/reports/sales")
          return send({
            data: {
              period,
              groupBy: u.searchParams.get("groupBy"),
              series: [
                { period: period.from, ordersCount: 1, netRevenue: "-150" },
                { period: period.to, ordersCount: 7, netRevenue: "1000" },
              ],
            },
          });
        throw new Error("Unexpected endpoint " + path);
      },
    );
    await page.goto(
      (process.env.TEST_BASE_URL || "http://127.0.0.1:5189") + "/#finance",
    );
    await page
      .getByText("تعذر تحميل التقرير المالي", { exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "إعادة المحاولة", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "تفاصيل المبيعات", exact: true })
      .waitFor();
    const netCard = page
      .locator(".finance-balance")
      .filter({ hasText: "صافي الربح المحسوب" });
    assert((await netCard.innerText()).includes("200"));
    assert(!(await netCard.innerText()).includes("233"));
    await page.getByText("الربح المعروض جزئي.", { exact: true }).waitFor();
    assert(
      (await page.locator(".finance-partial").innerText()).includes("300"),
    );
    assert.equal(
      await page.getByText("رصيد نسبة الربح 5%", { exact: true }).count(),
      0,
    );
    assert(
      (await page.locator(".finance-table-card").first().innerText()).includes(
        "50",
      ),
    );
    await page
      .getByRole("img", { name: "اتجاه صافي الإيرادات والطلبات", exact: true })
      .waitFor();
    await page.getByText("عرض أرقام الرسم", { exact: true }).click();
    assert(
      (await page.locator(".finance-trend-details").innerText()).includes(
        "-150",
      ),
    );
    await page.screenshot({
      path: "/tmp/financial-report-desktop.png",
      fullPage: true,
    });
    assert.equal(
      new Set(
        reads
          .filter(
            (p) => p.includes("/api/admin/reports/") && !p.includes("export"),
          )
          .map((p) =>
            new URL(p, "https://test.local").searchParams.get("from"),
          ),
      ).size,
      1,
    );
    await page.getByLabel("التقرير المالي من تاريخ").fill("2026-10-01");
    await page.getByLabel("التقرير المالي إلى تاريخ").fill("2026-10-22");
    const initial = reads.length;
    const periodResponse = page.waitForResponse(
      (r) =>
        r.url().includes("/reports/sales") &&
        r.url().includes("from=2026-10-01"),
    );
    await page
      .getByRole("button", { name: "تطبيق الفترة", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "تفاصيل المبيعات", exact: true })
      .waitFor();
    await periodResponse;
    for (const name of ["financial", "performance", "sales", "pricing-parts"])
      assert(
        reads
          .slice(initial)
          .some(
            (p) =>
              p.startsWith("/api/admin/reports/" + name + "?") &&
              p.includes("from=2026-10-01") &&
              p.includes("to=2026-10-22"),
          ),
      );
    const monthResponse = page.waitForResponse(
      (r) =>
        r.url().includes("/reports/sales") && r.url().includes("groupBy=month"),
    );
    await page.getByLabel("تجميع التقرير المالي").selectOption("month");
    await monthResponse;
    assert(
      reads.some(
        (p) =>
          p.startsWith("/api/admin/reports/performance") &&
          p.includes("groupBy=month"),
      ),
    );
    await page.getByLabel("التقرير المالي من تاريخ").fill("2025-01-01");
    const beforeInvalid = reads.length;
    await page
      .getByRole("button", { name: "تطبيق الفترة", exact: true })
      .click();
    await page
      .getByText("أقصى فترة للتقرير سنة واحدة.", { exact: true })
      .waitFor();
    assert.equal(reads.length, beforeInvalid);
    const weekResponse = page.waitForResponse(
      (r) =>
        r.url().includes("/reports/financial?") &&
        !r.url().includes("from=2026-10-01"),
    );
    await page.getByLabel("فترة التقرير المالي").selectOption("week");
    await weekResponse;
    await page
      .getByRole("button", { name: "تصدير التقرير CSV", exact: true })
      .click();
    await page
      .getByText("ليس لديك صلاحية لعرض هذه البيانات أو تنفيذ الإجراء.", {
        exact: true,
      })
      .waitFor();
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "تصدير التقرير CSV", exact: true })
      .click();
    assert((await download).suggestedFilename().startsWith("financial-"));
    const jsonPeriod = new URL(
      reads.filter((p) => p.startsWith("/api/admin/reports/financial?")).at(-1),
      "https://test.local",
    ).searchParams;
    const exported = new URL(
      reads
        .filter((p) => p.startsWith("/api/admin/reports/financial/export?"))
        .at(-1),
      "https://test.local",
    ).searchParams;
    assert.equal(exported.get("from"), jsonPeriod.get("from"));
    assert.equal(exported.get("to"), jsonPeriod.get("to"));
    missingProfit = true;
    emptyParts = true;
    await page.getByRole("button", { name: "تحديث", exact: true }).click();
    await page
      .getByText("لا توجد قطع خلال الفترة.", { exact: true })
      .first()
      .waitFor();
    assert((await netCard.innerText()).includes("—"));
    assert(!(await netCard.innerText()).includes("233"));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(
      () =>
        document.querySelector(".sidebar").getBoundingClientRect().x >=
        innerWidth - 1,
    );
    await page.screenshot({
      path: "/tmp/financial-report-mobile.png",
      fullPage: true,
    });
    mismatchedPeriod = true;
    await page.getByRole("button", { name: "تحديث", exact: true }).click();
    await page
      .getByText(
        "التقرير رجع بفترة مختلفة عن الفترة المطلوبة. حدّث البيانات.",
        { exact: true },
      )
      .waitFor();
    assert.equal(
      await page
        .getByRole("heading", { name: "تفاصيل المبيعات", exact: true })
        .count(),
      0,
    );
    assert(
      await page
        .getByRole("button", { name: "تصدير التقرير CSV", exact: true })
        .isDisabled(),
    );
    mismatchedPeriod = false;
    noExport = true;
    await page.reload();
    await page
      .getByRole("heading", { name: "تفاصيل المبيعات", exact: true })
      .waitFor();
    assert(
      await page
        .getByRole("button", { name: "تصدير التقرير CSV", exact: true })
        .isDisabled(),
    );
    denyReport = true;
    await page.reload();
    await page
      .getByText("ليس لديك صلاحية لعرض هذه البيانات أو تنفيذ الإجراء.", {
        exact: true,
      })
      .first()
      .waitFor();
    assert.equal(
      await page
        .getByRole("heading", { name: "تفاصيل المبيعات", exact: true })
        .count(),
      0,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Financial browser PASS: same-period backend financial/performance/parts/sales, real net profit and partial disclosure, negative chart, sparse missing values, custom/preset/grouping filters, server CSV/403, invalid ranges and mismatched periods rejected, read-only permission, mobile/no JS errors.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
