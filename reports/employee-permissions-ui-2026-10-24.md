# Admin employee permissions preview

Implemented the supplied 02.jpg and 75.jpg employee permission references as interactive HTML, using the original reference artwork for checkboxes, chevrons and special-permission icons.

The admin employees route now renders a UI-only preview. The previous connected employee components remain available in source, but this preview does not fetch staff, fetch permission catalogs, save permissions, or mutate the authenticated account. Checkbox and pagination state is local and resets when the page is remounted. The sample employee name comes from the reference. Category and customer special permissions expand independently. All eight main permission rows remain present when expanded.

The existing admin shell, order pages and isolated delivery workspace were preserved.

Validation: production build passed; all 90 native tests passed; browser checks passed for checkbox state, expansions, local pagination, mobile overflow and absence of staff/permission API calls. Existing delivery browser regression passed including admin/staff routing isolation. Desktop collapsed and expanded states and mobile screenshots reviewed.

## Employee list correction

Added the employee list as the default admin employees screen from the newly supplied list reference. Includes search, row selection, sample status badges, view/delete actions, pagination, and the top-left Add New button. View opens that employee's permission preview with a return action. Add opens a local-only form; added employees and deletions exist only in memory. Password input is discarded when the preview entry is created. No employee API calls or authenticated permissions are changed.

Browser checks now also verify entering the list, opening Add New, adding/removing a sample entry, searching, and opening permissions from the eye action.

## Seven department cards

Added seven local-only permission cards below the existing matrix: delivery agents, department staff, orders department, product staff, customer service, supplier staff and accountants. They reuse the customer-service card styling and reference icon. Each currently offers a view-interface and manage-section checkbox; both default off and affect preview state only. The user was asked to specify any more detailed options. Existing customer cashback and category statistics controls are preserved. Desktop/mobile browser checks cover seven cards, independent checkbox changes, no overflow and no staff API requests. Production build passed.

The user clarified they will select individual section permissions with checkboxes. Replaced the generic view/manage pair with 38 independent feature checkboxes across the seven cards. Labels are UI preview choices, not a claim of backend permission-code mappings. All default off; original matrix and nested category/customer permissions remain unchanged. Browser checks passed with 62 initial checkboxes and 68 after expanding existing special permissions.
