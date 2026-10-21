import React from "react";

// Compact glyphs matching the category reference: engine, shift gate, front car,
// linked years, package and the four-dot subcategory mark.
export default function CategoryIcon({ name, size = 20, ...props }) {
  const paths = {
    car: (
      <>
        <path d="m4 10 2-5h12l2 5M3 11h18v7H3zM6 18v2m12-2v2M6 14h2m8 0h2M8 5l1-2h6l1 2" />
        <path d="M2 10h2m16 0h2" />
      </>
    ),
    engine: (
      <>
        <path d="M6 7h11l3 4v7H6l-3-3V9h3zm4-4v4m-3-4h6M3 12H1m0-3v6m19-4h3v7h-3" />
      </>
    ),
    transmission: (
      <>
        <path d="M5 5v14m7-14v14m7-14v7H5" />
        <circle cx="5" cy="3" r="1.5" />
        <circle cx="12" cy="3" r="1.5" />
        <circle cx="19" cy="3" r="1.5" />
        <circle cx="5" cy="21" r="1.5" />
        <circle cx="12" cy="21" r="1.5" />
      </>
    ),
    calendar: (
      <>
        <rect x="4" y="5" width="16" height="16" rx="3" />
        <path d="M8 3v4m8-4v4M4 10h16m-12 4h2m4 0h2m-8 3h2" />
      </>
    ),
    package: (
      <>
        <path d="m12 3 9 5-9 5-9-5zm-9 5v10l9 5 9-5V8M12 13v10M8 5l9 5" />
      </>
    ),
    categories: (
      <>
        {[
          [7, 7],
          [17, 7],
          [7, 17],
          [17, 17],
        ].map(([cx, cy], i) => (
          <rect
            key={i}
            x={cx - 3.5}
            y={cy - 3.5}
            width="7"
            height="7"
            rx="2.5"
            fill="currentColor"
            stroke="none"
          />
        ))}
      </>
    ),
    link: (
      <>
        <path
          d="m10 14 4-4m-6 7-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m4 0 1-1a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0"
          transform="translate(1 -1)"
        />
      </>
    ),
    chart: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="3" />
        <path d="M8 16v-4m4 4V8m4 8v-6" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name] || paths.categories}
    </svg>
  );
}
