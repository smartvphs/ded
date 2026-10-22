# Abandoned carts integration — 2026-10-22

Source: Car Parts — Admin API.postman_collection (5).json, Abandoned Carts.

## Connected

- GET /api/admin/abandoned-carts: real rows, search, idleHours, last_activity ordering, limit/offset and meta.total. Default abandonment filter is 24 hours; optional shorter listing does not make a cart eligible for reminders.
- meta.metrics supplies abandoned carts/value/quantity, readyToRemind, guest carts/value, and reminders/recovery metrics for the last 30 days. Unknown values remain distinct from zero. Guest carts are aggregate counts, never contact targets.
- GET /api/admin/abandoned-carts/:userId: fresh customer/cart details, images with shared default asset, product quantities, actual quality labels, prices/line totals, linked car/compatibility, coupon, backend-calculated order summary and reminder history/recovered status.
- POST /api/admin/abandoned-carts/:userId/remind: explicit confirmation, optional validated 5–300 character message, documented in-app + push notification, server reminder ID/user ID/time required before success.
- POST /api/admin/abandoned-carts/remind: selected customer IDs, maximum 100, individual sent/skipped results with actual skipped reasons. A 200 response alone is not success: every requested customer must appear exactly once, with consistent counts and valid acknowledgements.
- GET /api/admin/me: reminder controls require super admin or customers.manage; customers.view/accounting.view can read. Server 403 remains visible.
- Refreshes after confirmed/409/uncertain outcomes; uncertain POSTs and malformed acknowledgements block blind resubmission for those customers during the page session. No simulated “sent” flags or local arithmetic.
- #carts link, sidebar return, session expiry, loading/errors/retry/empty, pagination and mobile connected.

## Old fixture fields

The old screen invented last visited page, manufacturer, previous order counts/purchases and product rows. The abandoned-cart contract does not return last visited page. The page now shows documented idle duration/last addition and real cart metadata; it does not invent page tracking or customer purchase history. Quantity edits are not recorded as activity by the documented backend.

## Checks and limits

- 56 native tests pass, including backend filter/pagination construction, text/selection validation and rejecting incomplete/duplicate/mismatched bulk acknowledgements.
- Chromium contract test passes: server errors/retry, search/paging/filter/order, actual details and fallback image, backend totals, single reminder validation/422 retry/log, bulk partial success, not-ready/already-reminded controls, 409 refresh, unknown/malformed POST outcome lock, empty/404/403, read-only access and mobile with no JavaScript errors.
- Production build passes.
- Tests use mocked responses matching the supplied collection and a test-only token. No actual customer notification was sent and no live cart/customer data was changed. An authenticated production session is needed for live backend validation.
- All supplied abandoned-cart routes are integrated. No extra backend endpoint is required for these documented functions; last-page tracking would need a separate backend field if requested.
