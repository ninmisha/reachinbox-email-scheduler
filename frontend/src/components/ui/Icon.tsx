const PATHS = {
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.3-4.3',
  back: 'M19 12H5M12 19l-7-7 7-7',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  x: 'M6 6l12 12M18 6L6 18',
  bold: 'M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z',
  italic: 'M19 4h-9M14 20H5M15 4L9 20',
  underline: 'M6 4v7a6 6 0 0 0 12 0V4M4 21h16',
  ul: 'M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01',
  ol: 'M10 6h11M10 12h11M10 18h11M4 5h1v4M4 9h2M4 15h2l-2 3h2',
  undo: 'M3 7v6h6M3 13a9 9 0 1 0 3-7.7L3 8',
  redo: 'M21 7v6h-6M21 13a9 9 0 1 1-3-7.7L21 8',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
