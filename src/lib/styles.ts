import { C } from "./colors";
import type { CSSProperties } from "react";

/**
 * 60 Watts of Clarity — Style Helpers
 * Reusable glass-panel style generators for the Spline-inspired aesthetic.
 */

/** Glass panel style — use for cards, sidebars, modals. */
export const glass = (extra: CSSProperties = {}): CSSProperties => ({
  background: C.glass,
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  border: `1px solid ${C.glassBrd}`,
  borderRadius: "16px",
  ...extra,
});

/** Glass button style — use for interactive controls. */
export const glassBtn = (extra: CSSProperties = {}): CSSProperties => ({
  padding: "8px 16px",
  border: `1px solid ${C.glassBrd}`,
  borderRadius: "12px",
  background: C.glass,
  backdropFilter: "blur(12px)",
  color: C.tx2,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "15px",
  fontWeight: 500,
  transition: "all .25s cubic-bezier(.4,0,.2,1)",
  fontFamily: "'Satoshi',sans-serif",
  ...extra,
});
