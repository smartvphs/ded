import React, { useId } from 'react';

// Sidebar glyphs from the supplied Figma screenshots. Use an inactive source
// for every glyph so the screenshot's selection background is never included.
const referenceRows = {
  0: 185, 1: 239, 2: 293, 4: 421, 5: 475, 6: 529, 7: 583,
  8: 637, 9: 691, 10: 745, 12: 799, 13: 850, 14: 902, 15: 957,
};

export default function SidebarIcon({ index, fallback: Fallback }) {
  const filterId = useId();
  if (index !== 3 && referenceRows[index] === undefined) {
    return <Fallback size={19} strokeWidth={1.65} aria-hidden="true" />;
  }
  const product = index === 3;
  const file = product ? '/settings-reference/shipping.png' : '/product-reference/01.png';
  const row = product ? 349 : referenceRows[index];
  return <svg className="sidebar-reference-icon" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
    <defs>
      <filter id={filterId} x="0" y="0" width="20" height="20" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -.2126 -.7152 -.0722 0 1" result="ink" />
        <feFlood floodColor="currentColor" result="color" />
        <feComposite in="color" in2="ink" operator="in" />
      </filter>
    </defs>
    <g filter={`url(#${filterId})`}>
      <svg width="20" height="20" viewBox={`1380 ${row - 10} 20 20`}>
        <image href={file} x="0" y="0" width="1440" height={product ? 1526 : 1461} />
      </svg>
    </g>
  </svg>;
}
