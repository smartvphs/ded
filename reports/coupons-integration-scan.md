# Coupons integration — 2026-10-22

Contract: Car Parts — Admin API.postman_collection (5).json, Coupons and Coupon usage report, plus the user-supplied create/PATCH fields and GET /api/payments/methods clarification received 2026-10-22.

## Connected

- GET /api/coupons: backend search, active/inactive filter, documented validity=valid filter, paymentMethod, limit/offset, meta.total. All row states (valid/scheduled/expired/exhausted/inactive) display from the backend.
- meta.metrics supplies total/active/valid coupons, total uses, orders with coupons, total discount and average discount. Remaining uses/progress only derive from actual max_uses/used_count; null limits remain unlimited and absent metrics are not shown as zero.
- POST /api/coupons: code, discountType (percentage/fixed), value, maxUses, minOrderValue, startsAt, expiresAt and isActive, plus maxDiscount, paymentMethods and description. Empty optional fields are omitted on create. Percentages, dates, money and usage limits are validated.
- PATCH /api/coupons/:id: only changed documented fields are sent. Null explicitly clears documented optional limits/dates. Unchanged timestamp precision is retained; entered date/time is explicitly Saudi time, converted to UTC for the API.
- Activation/deactivation uses PATCH isActive, then GET verifies the persisted status. Displayed checkbox does not fake a successful local change.
- DELETE /api/coupons/:id: used coupons are disabled for deletion with an explanation to deactivate them. Server 409 remains visible. A successful delete requires acknowledgement and confirmed absence from the list. After uncertain delete, retry performs verification rather than blindly repeating DELETE.
- POST /api/coupons/:id/duplicate: new code plus isActive, new ID and zero usage verified, documented settings checked against the source. Clipboard copy remains a separate local action.
- Save/readback uses the documented list with search/paging, never an invented GET /coupons/:id. A known successful write followed by failed readback retries only GET. Unknown create/duplicate outcomes block resubmission.
- GET /api/admin/reports/coupons: actual usage report, date range, totals and per-coupon order/customer counts, discount and sales. Permissions reports.view/accounting.view enforced by server and UI. No list-row sums substitute for report totals.
- GET /api/admin/me: only super admin/catalog.manage/coupons.manage can mutate. Accounting readers can view/report. No fake success for denied requests.
- #coupons deep link, sidebar return, auth expiry, loading/error/retry/empty, clipboard and mobile layout connected.

## Completed field clarification

- Editable description is sent as `description`; empty string clears it. Readback accepts the documented string or normalized null for an empty description.
- Editable discount ceiling is sent as `maxDiscount` and verified against `max_discount`.
- Multi-select payment restrictions use `paymentMethods`, read back from `payment_methods`. Arrays are compared as sets, so order-only changes do not trigger PATCH. Saved legacy codes are preserved and displayed rather than silently removed.
- GET /api/payments/methods supplies actual `data.methods` codes, labels and enabled flags for both form choices and list filtering. No static payment code/label list remains in the coupons page. Disabled-at-checkout methods remain identifiable for future restrictions; the UI displays their current availability.
- Missing/malformed method responses surface errors and disable the selector; new coupon submission waits for valid method choices instead of silently using a hardcoded fallback.
- Read-only live GET /api/payments/methods returned 200 with mada, visa, mastercard, apple_pay, stcpay, tabby, tamara and cash, including availability flags. No live coupon was mutated.
- PATCH includes only changed fields, including empty descriptions; unchanged restrictions and exact original timestamp precision are retained. Duplicate verification includes the three new fields.
- Clearing maxDiscount or all payment restrictions currently sends null, consistent with nullable saved fields and the existing optional coupon-field convention. The user was asked to confirm these two clearing values; they were not explicitly specified in the supplied examples. The form verifies the returned saved fields and never claims success when the server rejects/ignores the change.

## Validation and limits

- 63 native tests pass, including Saudi-time conversion, unchanged timestamp preservation, partial PATCH shapes, clearing optional fields, official fields, payment catalog validation, set comparison and sparse PATCH bodies and readback verification.
- Chromium contract integration passes backend filters/paging/metrics, clipboard, partial edit, editable cap/description/method restrictions and clearing, status, create/duplicate/delete readback retry without repeat writes, 409 errors, uncertain POST lock, ignored-save detection, report dates/values, payment-catalog errors without fallback, read-only/403 access, mobile sidebar placement and no JavaScript errors.
- Production build passes.
- Browser tests use mocked responses matching the supplied contract and a test-only token. No real coupon/order was created, changed, applied or deleted while testing. Live backend validation needs an authenticated admin session.
