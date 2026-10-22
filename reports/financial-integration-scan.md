# Financial/performance report integration — 2026-10-22

Contract: latest supplied Car Parts — Admin API.postman_collection.json, Dashboard & Reports.

## Connected

- GET /api/admin/reports/financial: full revenue, pricingFees, suppliers and profit breakdowns. Sales, discounts, VAT, shipping, wallet-paid amounts, cashback, refunds/count, net revenue, order average, margins, known/unknown-cost sales, commissions, adjustments and paid settlements display their actual reported fields.
- GET /api/admin/reports/performance: pricing request total/quoted/awaiting/confirmed, actual orders and active supplier counts; `kpis.profit.amount` supplies net known profit after payment fees. `financial.profit.knownProfit` is separately labelled before payment fees and never substituted for net profit if performance data is absent.
- Partial profit disclosure is displayed when costs are missing; the actual unknownMarginSales amount is shown and never included by frontend estimates.
- GET /api/admin/reports/pricing-parts: priced, unpriced and confirmed quality tables use their own items/totals. Counts distinguish partsCount, pieces and requestsCount. Mean price derives only from value / actual pieces, not request count. No sums across overlapping priced/confirmed groups.
- GET /api/admin/reports/sales: actual time buckets, counts and net revenue. Two labelled axes; negative net revenue is retained and visible, missing values break line segments instead of fabricating zero. Exact chart values remain available in a table.
- All report endpoints receive the same applied inclusive Saudi-date from/to. Day/week/month grouping drives performance/sales; presets use Saudi calendar days. Custom ranges validate real dates/order and maximum 366 inclusive days. Unapplied input edits do not alter report/export state. Response periods must match the applied request period or the section is rejected.
- GET /api/admin/reports/financial/export: actual UTF-8 CSV through the authenticated MIME-checked download helper, with the same applied dates. No client-side export bypass. GET /api/admin/me enables export only for super admin or reporting/accounting plus data.export permission; server denial remains visible.
- #finance deep link and auth expiry callback connected. Loading, retries, malformed/incomplete responses, missing values, empty tables, permission failures and mobile handled.

## Replaced demo semantics

The previous screen used fixed balances/profit rates (5%, 3%, 1%), sample qualities/prices and repeated rows. The documented API does not provide financial account balances or a 5/3/1 percent breakdown. The existing five-card layout now shows actual gross sales, net revenue, net known profit, supplier commissions and collected pricing fees with accurate labels. No arbitrary multiplication or rate attribution is used.

The pricing-stat sublabels distinguish request counts, collected fees and quoted/unpriced part values rather than treating these different measures as a single total. Financial missing values display a dash, never fabricated zero.

## Validation and limits

- 71 native tests pass, including date validation, same-period response checking, weighted piece averages, zero/missing distinction and negative chart values.
- Chromium contract integration passes report read failure/retry, all four report requests for the same period, net profit vs pre-fee profit, partial-cost disclosure, negative chart values, custom/preset/group filters, invalid date range rejection without requests, matching CSV dates/download and 403 handling, empty/missing sections, mismatched period rejection, export permissions, mobile and no JavaScript errors.
- Production build passes.
- Tests use mocked responses matching the supplied collection and a test-only token. No authenticated live financial data was accessed, exported or changed. Deployed totals and real permissions require a real authorized admin session for final live validation.
