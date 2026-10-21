# Categories integration — 2026-10-21

Contract: supplied Car Parts — Admin API Postman collection (5).

Removed all hardcoded main categories, sample counts, preset subcategory names, BMW/demo makes/models, local-only CRUD, static brand lists, catalog options and fabricated analytics. Category layout and existing icon/color system retained. Main artwork is now the server's icon_url (no screenshot sprites or local category image overrides).

Connected:
- GET /api/categories/admin/main: official active main sections, names, descriptions, image URLs, sort positions, product/supplier/car/field/subcategory counts and configuration warnings. Does not fabricate a missing/disabled sixth category.
- GET /api/admin/reports/categories: actual order counts per section, with server period shown (not mislabeled as all-time orders).
- GET /api/categories/admin and ?parentId=...: complete state-aware category lists and parent-scoped subcategories. POST /api/categories, PUT /api/categories/:id, PATCH /:id/status, DELETE /:id. Root section data/image editing, subcategory creation/editing/visibility/deletion with server dependency protection.
- GET /api/brands?category=parts|oils|tires|accessories (hidden included): add, edit, hide/show, delete via official POST/PUT/DELETE routes. Used parts shares the documented parts brand namespace.
- GET /api/cars/admin/makes, /admin/makes/:id/models and /admin/variants: actual names/logos/model images/years/specifications/visibility; makes search is server-side and also matches unloaded models. Pagination is fully loaded for supported paginated endpoints.
- POST/PUT/DELETE /api/cars/makes..., /makes/:id/models, /models/:id; PATCH make/model status.
- POST /api/cars/admin/models/:id/variants; PUT/DELETE /admin/variants/:id; PATCH variant status. Model and variant are separate server entities: add a model first, then its years/trim/engine/transmission. Years validated 1950–2100.
- GET /api/catalog-fields: per-category fields plus shared engine/transmission, including hidden options. PUT field labels/order/visibility; POST/PUT/PATCH-status/DELETE options. Actual stored values remain separate from translated labels. In-use errors are surfaced; nothing is silently removed locally.
- GET /api/uploads/signature?type=categories|brands|cars&strictFormats=true and signed direct Cloudinary upload; persisted URLs used in the category/make/brand/lookup write. JPG/PNG/WebP, 5 MB. Existing/removable images retained until a successful write.
- GET /api/admin/reports/performance: actual KPIs, charts, monthly comparison, cars, years, category data, supplier performance with sorting/pagination, pricing quality, response time and server insights. Report covers the platform (no undocumented category filter). Missing/empty metrics stay empty; no synthetic trend multipliers or alerts. Partial profit and test-data coverage are disclosed from server fields.

Save safety:
- Mutations lock repeated clicks, preserve drafts on validation/conflict errors, and confirm returned list values (including names/images/years) after a successful write.
- If a write succeeds but verification fails, retry refreshes the saved ID instead of creating again.
- Ambiguous POST/network/5xx outcomes lock blind resubmission and ask the operator to check the actual list.
- Deletes are confirmed and verified; dependency conflicts remain visible. A failed refresh after a completed delete does not issue another delete on retry.

Remaining contract clarification:
- Models return image_url in GET, but documented POST model / PUT model only specify nameAr/nameEn. No model image upload/save action is fabricated. Backend must confirm a supported image field (e.g. imageUrl) and route before exposing model-photo editing. Make logos, root category images, brand logos and lookup images are wired.

Verification:
- 46 native tests passing.
- Chromium API-contract integration passing: six images/counts, signed upload, root category update, model/variant CRUD, subcategory conflict/status/delete, brand verification retry without duplicate create, catalog field/option operations, in-use protection, analytics date filters, mobile, ambiguous create lock and no runtime errors.
- Production build passing.
- No authenticated live backend session exists in this execution environment. Browser tests use mocked contract responses; no production catalog records were created, edited or deleted during testing. A live authenticated smoke check is still needed to confirm actual server deployment/permissions and persisted business data.
