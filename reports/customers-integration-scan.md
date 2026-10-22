# Customers integration — 2026-10-22

Reference: latest supplied Car Parts — Admin API.postman_collection.json (customer update received 2026-10-22); other existing integrations retain collection (5) contracts.

Removed static customers, invented purchases/counts/payment methods/dates, preset vehicles/VINs, fake orders/quotes/carts, simulated reminders and local-only profile/wallet mutations. Retained the customers layout, colors and action-menu styling.

Connected:
- GET /api/admin/customers: server-side name/email/phone search, status/newDays, real metrics, creation sorting and pagination. Main table uses actual avatar_url, orders_count, abandoned_cart_items (cart lines, not quantity), payment method, pricing count, last order and status. Deleted customers remain represented as returned by the server.
- GET /api/admin/customers/summary: actual four cards and explicit server period; abandoned carts are counted as carts, not fabricated piece totals.
- GET /api/admin/customers/:id: actual customer profile, account/phone verification, admin notes, wallet values, counts, vehicles, addresses and dates.
- POST /api/admin/customers: required Saudi phone/name, optional email; phone normalized, no invented verified flag, address, avatar or notes fields. A failed confirmation GET retries the saved ID without creating again.
- PATCH /api/admin/customers/:id: name/email plus changed avatarUrl and notes. Cloudinary upload uses GET /api/uploads/signature?type=avatars&strictFormats=true and sends all signed parameters directly to Cloudinary. JPG/PNG/WebP up to 5 MB; file/read/upload errors remain visible. Avatar/notes are saved only on explicit profile save. null removes the photo/notes; readback validates avatar_url/admin_notes. Notes are capped at 1000 characters. Phone remains read only because it changes through customer OTP. Deleted accounts cannot be edited.
- PATCH /api/admin/customers/:id/status: documented active/blocked behavior with an optional reason capped at 300 characters; state is read back. No undocumented inactive-write value is invented.
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
- PATCH /api/wallet/admin/:id/cashback: cashbackPercent, minOrderValue and maxCashback, including zero and null platform defaults. Fresh customer details initialize the form and verify all three returned snake_case fields after saving. A verification failure retries GET only. Cashback editing does not depend on wallet.view permissions or GET wallet access.

Resolved backend clarifications:
1. Profile photo/admin notes fields and avatar upload type are documented and connected.
2. Cashback minimum/maximum fields and null inheritance are documented and connected.
3. Status writes only ever send blocked or active. inactive remains a read filter; there is no inactive write option. Optional block reason is supported.
4. Phone changes intentionally belong to the customer OTP flow; this is not an admin editing endpoint gap.

Validation:
- 62 native tests passing.
- Chromium contract integration passing: list/summary/search/paging, permission-denied CSV then successful export, signed avatar upload (all signed parameters, no API bearer sent to Cloudinary), invalid file rejection, upload failure/retry, saved photo/notes, clearing both, 422 draft retention, block/unblock, order/pricing reads/navigation, wallet 422 and read-back retry without duplicate credit, ambiguous credit lock, cashback limits/zero/defaults and verification retry without repeat PATCH, saved addresses/vehicles, actual cart reminder state, soft deletion, create confirmation retry, mobile and no runtime errors.
- Existing order payment/contact browser regression passing after the shared authenticated CSV change.
- Production build passing.
- Tests use mocked contract responses. No authenticated production session is available in this environment, and no live customers, wallet credits, reminders or accounts were modified during testing. Real deployed permissions and writes still need an authenticated smoke check.
