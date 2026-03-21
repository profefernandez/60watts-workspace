// ── 60 Watts of Clarity — Color Palette ──
// Spline-inspired 3D Luxury Tech Aesthetic
// Obsidian · Rose Gold · Soft Cream

import type { ThemeColors } from "./types";

export const C = {
  // Obsidian
  ob1: "#08090C",
  ob2: "#0E1015",
  ob3: "#14161C",
  ob4: "#1A1D26",
  ob5: "#222530",
  ob6: "#2C303D",
  // Rose Gold
  rg: "#E8A87C",
  rg2: "#D4956C",
  rg3: "#C0825E",
  rgL: "#F2C4A0",
  rgGlow: "#E8A87C40",
  // Cream
  cr: "#FAF5EF",
  cr2: "#F0E8DC",
  cr3: "#E6DCCF",
  crD: "#D4C8B8",
  // Glass
  glass: "rgba(255,255,255,0.04)",
  glassB: "rgba(255,255,255,0.08)",
  glassBrd: "rgba(255,255,255,0.06)",
  glow: "#E8A87C22",
  // Text
  tx: "#FAF5EF",
  tx2: "#C8BFB4",
  tx3: "#8A8078",
  tx4: "#5C554E",
  // Accents
  red: "#E85D5D",
  green: "#5DE8A8",
};

// ── Dark Theme (default — the v6 glassmorphism look) ──
export const DK: ThemeColors = {
  bg: "#08090C", bg2: "#0E1015", bg3: "#14161C",
  surface: "#0E1015", surfR: "#14161C", surfA: "#0A0C10",
  brd: "#2C303D", brdS: "#1A1D26", brdF: C.rg,
  tx: "#FAF5EF", tx2: "#C8BFB4", tx3: "#8A8078", tx4: "#5C554E",
  navBg: "#0A0C10", navBrd: "#1A1D26", navH: "#14161C", navA: `${C.rg}14`,
  navTx: "#8A8078", navTxActive: "#FAF5EF", navTxMuted: "#5C554E",
  inBg: "#08090C", inBrd: "#2C303D",
  aiU: `${C.rg}0A`, aiA: "#0A0C10",
  aiBg: "#080A0E", aiBrd: "#1A1D26", aiHeaderBg: "#060810",
  aiSurfA: "#0C0E14", aiInBg: "#080A0E", aiInBrd: "#222530",
  aiTx: "#E0D8D0", aiTx2: "#B0A89C", aiTx3: "#685E54",
  aiMsgBg: "#0C0E14", aiUserBg: `${C.rg}0C`,
  centerBg: "#0C0E14", headerBg: "#0A0C10", toolbarBg: "#0E1015",
  sh: "0 1px 3px rgba(0,0,0,0.3)", shL: "0 10px 40px rgba(0,0,0,0.5)",
  ov: "rgba(0,0,0,0.7)", grid: "#14161C",
  accent: C.rg, accentText: "#08090C",
};

// ── Light Theme (warm cream variant with rose gold accents) ──
export const LT: ThemeColors = {
  bg: "#F0E8DC", bg2: "#E6DCCF", bg3: "#DCD2C4",
  surface: "#FAF5EF", surfR: "#FFFFFF", surfA: "#F4EDE4",
  brd: "#D4C8B8", brdS: "#E6DCCF", brdF: C.rg,
  tx: "#1A1D26", tx2: "#3A3530", tx3: "#5C554E", tx4: "#8A8078",
  navBg: "#14161C", navBrd: "#222530", navH: "#1A1D26", navA: `${C.rg}20`,
  navTx: "#C8BFB4", navTxActive: "#FFFFFF", navTxMuted: "#8A8078",
  inBg: "#FFFFFF", inBrd: "#C8BFB4",
  aiU: `${C.rg}10`, aiA: "#F4EDE4",
  aiBg: "#0C0E14", aiBrd: "#1A1D26", aiHeaderBg: "#080A0E",
  aiSurfA: "#0E1015", aiInBg: "#0C0E14", aiInBrd: "#2C303D",
  aiTx: "#E0D8D0", aiTx2: "#B0A89C", aiTx3: "#685E54",
  aiMsgBg: "#0E1015", aiUserBg: `${C.rg}0C`,
  centerBg: "#EDE5D8", headerBg: "#E8E0D2", toolbarBg: "#ECE4D6",
  sh: "0 2px 6px rgba(0,0,0,0.1)", shL: "0 12px 48px rgba(0,0,0,0.15)",
  ov: "rgba(26,29,38,0.6)", grid: "#E6DCCF",
  accent: C.rg, accentText: "#1A1D26",
};
