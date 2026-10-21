# Pricing requests integration — 2026-10-21

Reference: supplied Admin API Postman collection (5).

Removed the previous hardcoded requests, statistics, countdowns, quotes, brand logos and simulated mutations. Preserved the existing pricing layout and action styling.

Connected:
- GET /api/pricing-requests/admin: server pagination, search, makeId, pricingType, status, from/to. Global summary uses meta.total, statusCounts.open and paidFeesTotal. Accepted request count uses hasAccepted=true.
- GET /api/pricing-requests/admin/pending-review: actual requests with missing_products_count > 0 determine the missing-products count.
- GET /api/cars/admin/makes: actual filter choices, including inactive historical makes.
- GET /api/pricing-requests/admin/:requestId: customer/car, parts, media, attributes, quotes, supplier/customer prices, quality labels, acceptance, delivery, timeline and actual SLA.
- GET /api/products/admin: searchable catalog selection.
- PATCH /api/pricing-requests/admin/:requestId/parts/:partId/link-product: existing product linking. New supported catalog products can be created with ProductEditor, verified, then linked; failed links retain their product ID for retry.
- POST /api/pricing-requests/admin/:requestId/send-to-suppliers: requires linked parts; refreshes detail after success. Ambiguous failures require explicit refresh before resending.
- GET /api/suppliers/quality-tiers: official quality names/codes.
- POST /api/pricing-requests/admin/:requestId/parts/:partId/quotes: actual offers and deliveryDays; ambiguous create outcomes block blind duplicate submissions.
- PATCH /api/pricing-requests/admin/:requestId/offers/:itemId: individual customer price/notes.
- POST /api/pricing-requests/admin/:requestId/cancel: confirmed soft cancellation; refundRequired explicitly does not claim a completed payment refund.
- Excel export retrieves all filtered server pages, validates completeness/duplicates, and exports actual rows or selected IDs. Old upload label corrected to export; no documented import endpoint exists.

Known limits:
- Hour-of-day filtering is not documented; its control is disabled. Date filtering is connected.
- No documented pricing Excel import or hard-delete endpoint; no simulated success or local-only deletion is provided.
- No live authenticated backend reads/writes were possible in this environment; production data and actual customer/supplier notifications still require an authenticated smoke check. No live test orders or quotes were created.

Validation:
- 41 native tests passing.
- Chromium integration: real-contract list/filter/export, link-product, send-to-suppliers, quote 422 draft preservation/retry, edit-offer, cancel/refund warning, mobile rendering, no runtime errors (mock API).
- Existing product editor browser regression passing.
- Production build passing.
