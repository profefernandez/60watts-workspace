import React from "react";

// ── 60 Watts of Clarity — Icon Components ──

interface IcProps extends Omit<React.SVGProps<SVGSVGElement>, "d"> {
  d: React.ReactNode;
  s?: number;
}

const Ic: React.FC<IcProps> = ({ d, s = 20, ...p }) => (
  <svg
    width={s}
    height={s}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    {typeof d === "string" ? <path d={d} /> : d}
  </svg>
);

export const I = {
  file: (
    <Ic
      d={
        <>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </>
      }
    />
  ),
  board: (
    <Ic
      d={
        <>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </>
      }
    />
  ),
  db: (
    <Ic
      d={
        <>
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </>
      }
    />
  ),
  spark: (
    <Ic d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
  ),
  send: <Ic d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" s={17} />,
  img: (
    <Ic
      d={
        <>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </>
      }
      s={17}
    />
  ),
  plus: (
    <Ic
      d={
        <>
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </>
      }
    />
  ),
  trash: (
    <Ic
      d={
        <>
          <path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </>
      }
      s={16}
    />
  ),
  wand: (
    <Ic
      d={
        <>
          <circle cx="15" cy="9" r="3" />
          <line x1="2" y1="22" x2="12" y2="12" />
          <path d="M15 4V2M15 16v-2M8 9h2M20 9h2" />
        </>
      }
      s={16}
    />
  ),
  h1: (
    <Ic
      d={
        <>
          <path d="M6 4v16M18 4v16M6 12h12" />
        </>
      }
    />
  ),
  list: (
    <Ic
      d={
        <>
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </>
      }
    />
  ),
  dl: (
    <Ic
      d={
        <>
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </>
      }
    />
  ),
  x: (
    <Ic
      d={
        <>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </>
      }
      s={16}
    />
  ),
  search: (
    <Ic
      d={
        <>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </>
      }
    />
  ),
  pen: (
    <Ic
      d={
        <>
          <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
        </>
      }
    />
  ),
  sun: (
    <Ic
      d={
        <>
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
        </>
      }
    />
  ),
  bulb: (
    <Ic
      d={
        <>
          <path d="M9 18h6M10 22h4" />
          <path d="M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z" />
        </>
      }
      s={20}
    />
  ),
  loader: <Ic d={<path d="M21 12a9 9 0 11-6.219-8.56" />} s={18} />,
  upload: (
    <Ic
      d={
        <>
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </>
      }
    />
  ),
  folder: (
    <Ic
      d={
        <>
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
        </>
      }
    />
  ),
  ctx: (
    <Ic
      d={
        <>
          <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
        </>
      }
    />
  ),
  yt: (
    <Ic
      d={
        <>
          <path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.25 29 29 0 00-.46-5.43z" />
          <polygon points="9.75 15.02 15.5 11.75 9.75 8.48" />
        </>
      }
    />
  ),
  eye: (
    <Ic
      d={
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </>
      }
      s={16}
    />
  ),
  min: (
    <Ic
      d={
        <>
          <line x1="5" y1="12" x2="19" y2="12" />
        </>
      }
      s={16}
    />
  ),
  max: (
    <Ic
      d={
        <>
          <polyline points="15 3 21 3 21 9" />
          <polyline points="9 21 3 21 3 15" />
          <line x1="21" y1="3" x2="14" y2="10" />
          <line x1="3" y1="21" x2="10" y2="14" />
        </>
      }
      s={16}
    />
  ),
  chL: <Ic d={<polyline points="15 18 9 12 15 6" />} s={18} />,
};
