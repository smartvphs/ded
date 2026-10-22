# Customers integration — 2026-10-22

Reference: supplied Car Parts — Admin API Postman collection (5).

Removed static customers, invented purchases/counts/payment methods/dates, preset vehicles/VINs, fake orders/quotes/carts, simulated reminders and local-only profile/wallet mutations. Retained the customers layout, colors and action-menu styling.

Connected:
- GET /api/admin/customers: server-side name/email/phone search, status/newDays, real metrics, creation sorting and pagination. Main table uses actual avatar_url, orders_count, abandoned_cart_items (cart lines, not quantity), payment method, pricing count, last order and status. Deleted customers remain represented as returned by the server.
- GET /api/admin/customers/summary: actual four cards and explicit server period; abandoned carts are counted as carts, not fabricated piece totals.
- GET /api/admin/customers/:id: actual customer profile, account/phone verification, notes (read only), wallet values, counts, vehicles, addresses and dates.
- POST /api/admin/customers: required Saudi phone/name, optional email; phone normalized, no invented verified flag, address, avatar or notes fields. A failed confirmation GET retries the saved ID without creating again.
- PATCH /api/admin/customers/:id: name/email only; email null removes it. Phone is read only because it changes through customer OTP. Deleted accounts cannot be edited.
- PATCH /api/admin/customers/:id/status: documented active/block behavior with a required block reason; state is read back. No undocumented inactive-write value is invented.
- DELETE /api/admin/customers/:id: confirmed soft deletion, verified through deleted state (or 404 after a successful delete); retry after confirmation failure does not repeat deletion.
- GET /api/admin/customers/export: actual filtered server CSV; respects data.export and other backend permissions. Shared authenticated request helper gained optional CSV response support with MIME verification; ordinary JSON requests and session refresh behavior remain intact. No client-side export bypass.
- GET /api/orders/all?userId=...: all customer orders with real paging and delivered filter. Expanded order reads /api/orders/admin/:id for actual products, images and totals; full OrderDetail opens and returns to the customer context.
- GET /api/pricing-requests/admin?customerId=...: real paginated requests, quoted/accepted tabs with server totals. Full PricingDetails opens and returns to customer details. No guessed part-pricing progress is drawn when the list omits it.
- GET /api/admin/abandoned-carts/:id: actual cart items/images/value/last activity and canRemind; 404 means no cart.
- POST /api/admin/abandoned-carts/:id/remind: explicit user confirmation, optional message, actual in-app + push reminder and authoritative subsequent state. No simulated send or invented success. Ambiguous send outcomes block blind repeats.
- POST /api/admin/customers/:id/vehicles: actual active make/model lookups, explicit year, optional VIN/plate/trim/engine/transmission/default flag. New returned vehicle IDs are verified through customer details before success.
- POST /api/admin/customers/:id/addresses: actual city/district/street/building/short address/phone/label/default fields; new address IDs verified through customer details. No local-only addresses.
- GET /api/wallet/admin/:id and /transactions: real balance and paginated history.
- POST /api/wallet/admin/:id/adjust: positive credit with a reason; no frontend balance arithmetic. A successful adjustment followed by a failed read retries only the read. An ambiguous network/5xx result blocks blind repeated credit and asks the operator to review wallet/history.
- PATCH /api/wallet/admin/:id/cashback: documented percentage, including zero, confirmed through wallet read-back. Minimum/maximum display actual stored values read only.

Contract gaps/constraints:
1. Customer PATCH explicitly accepts only name/email. Admin avatar and admin_notes writes are not documented. Current values are displayed; no fake upload/save action is offered. Backend must supply supported fields/route and avatar upload-signature type if required.
2. Cashback write documents cashbackPercent only. Saving cashback_min_order/cashback_max_amount requires clarification of accepted fields; current values remain read only.
3. Separate temporary deactivation (`inactive`) is not documented for the status write. Supported block/activate actions are connected; inactive remains a real server list filter. Do not infer an unsupported status payload.
4. Phone changes intentionally belong to the customer OTP flow; this is not treated as an admin editing endpoint gap.

Validation:
- 50 native tests passing.
- Chromium contract integration passing: list/summary/search/paging, permission-denied CSV then successful export, restricted edit fields and 422 draft retention, block/unblock, order/pricing reads/navigation, wallet 422 and read-back retry without duplicate credit, ambiguous credit lock, cashback zero, saved addresses/vehicles, actual cart reminder state, soft deletion, create confirmation retry, mobile and no runtime errors.
- Existing order payment/contact browser regression passing after the shared authenticated CSV change.
- Production build passing.
- Tests use mocked contract responses. No authenticated production session is available in this environment, and no live customers, wallet credits, reminders or accounts were modified during testing. Real deployed permissions and writes still need an authenticated smoke check.
