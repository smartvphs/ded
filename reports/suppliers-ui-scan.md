# Supplier interface — 2026-10-22

Reference: user-supplied الموردين.zip (17 PNGs). This is a UI implementation request, not a claim that all pictured business metrics have backend contracts.

## Screens implemented

- #suppliers: supplier management heading/add button, all/analytics/pricing-times tabs, five pastel KPI cards, search/filter panel, four status tabs, selectable supplier table with make logos, approval/rejection, row actions menu and pagination.
- Analytics: sales ranking bars, supplier quotation ranking cards, quotation bar chart, requested-parts line chart and quality distribution doughnut. Period control uses documented report date ranges.
- Pricing times: hourly heatmap layout, activity legend, four response/activity KPI cards.
- Supplier details: exact supplied blue ribbon cover artwork, supplier identity/status/rating/join date, six KPI cards and four tabs.
- Basic details: contact information/identity viewer, bank information, make/quality chips and two chart panels.
- Pricing: four compact KPI cards, search/type/status controls, selectable server-paged pricing table and real request detail navigation.
- Finance: profit cards, trend/distribution panels, pricing-type breakdown cards, server wallet/transaction records and invoice modal.
- Tickets: only this supplier's tickets, list/search/status counts, detail summary, actual conversation, reply composer and quick actions.
- Add/edit supplier modal: personal/company information, image pickers, make multiselect, working-hours control, official quality options, banking fields and notes.
- Wallet credit/deduction dialogs, deduction reason and transaction/invoice detail modal including earnings/rates/fees/deductions/net value and browser print/save-as-PDF.
- #offers: supplied price-list file screen, price comparison table, cheaper-row selection, product preview, temporary-offer duration modal and offer-products table.
- Existing sidebar/header remains shared; supplier/offer navigation and return/reset behavior now work. Mobile layouts and table horizontal scrolling are included.

## Source artwork

All new pictorial UI glyphs use SVG viewport crops of the supplied PNGs via supplier-ui.jsx, including KPI icons, tabs, form icons, eye/delete/more/approve/reject, edit, upload, close, send and print. No substitute Lucide icons were introduced in these supplier/offer components. The cover ribbon is a direct viewport of the supplied detail image. Existing real logo URLs are used for supplier/make images; company names/logos are not fabricated. Existing shared linked product/pricing detail components retain their established UI.

## Data and actions

Live authenticated reads use documented supplier list/detail/wallet/transactions/settlements, car makes, quality tiers, supplier reports, pricing requests, tickets, price-list files/items, offers and product-detail routes. Test/example suppliers and numeric reference values exist only in browser test fixtures, never in application source.

Documented create/review, credit/deduction, ticket reply/status, offer apply/cancel actions are implemented with error handling. Wallet retry confirms a saved transaction with GET, never repeats a POST, and retains uncertain outcomes across closing/reopening the modal in the same app session. Reply and offer-apply uncertain outcomes likewise remain locked when switching views. No financial operation was executed on production during implementation.

## What the UI does not fabricate

The collection does not document supplier profile editing/deleting/blocking, working-hour persistence/filtering, make/balance filtering on the list, per-supplier response-time/activity metrics/trends, the complete pictured financial attribution/quality-profit breakdown, admin price-list upload/deletion, or importing unmatched price-list rows as catalog products. These controls remain visible but disabled where applicable; unavailable numbers show a dash and charts show an empty state. Bank fields on admin supplier creation are explicitly rejected by the documented backend, so the fields are displayed read-only and the supplier-app requirement is explained. No unrelated endpoint or fake success was added for these pictured controls.

No universal supplier-ticket filter is documented: the supplier ticket list traverses source=supplier pages and selects exact supplier_id, avoiding displaying a different supplier's tickets as this supplier's. Server errors keep that list incomplete rather than displaying partial counts as complete.

## Verification

- Production build, native test suite (74 tests) and git diff --check.
- Chromium visual/navigation check covers the main list, analytics, pricing times, four supplier-detail tabs, add/credit/deduction/invoice dialogs, price-list files/detail, apply-offer modal, offer-products and mobile overflow.
- Separate wallet test checks a mocked successful credit followed by a failed GET, modal close/reopen and GET-only retry with exactly one POST.
- Browser tests use mocked API responses and a test-only authenticated session. They do not prove live authenticated backend writes; none were performed.

## 2026-10-23 contract update

The new support endpoints are now connected for supplier ticket assignment, priority, internal notes and ticket deletion through the shared support management component. See dashboard-audit-2026-10-23.md for current remaining contracts.
