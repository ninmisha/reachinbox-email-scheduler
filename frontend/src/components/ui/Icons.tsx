import type { SVGProps } from 'react';

const base = (p: SVGProps<SVGSVGElement>) => ({
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...p,
});

export const ArrowLeft = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
);
export const Clock = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
export const Paperclip = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M21 11l-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.6 8.6a2 2 0 0 1-3-3L15 7" /></svg>
);
export const Search = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
);
export const Upload = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 16V4M7 9l5-5 5 5M4 20h16" /></svg>
);
