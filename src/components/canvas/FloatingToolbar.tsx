"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { C } from "../../lib/colors";
import { I } from "../../lib/icons";
import { useDrag } from "./useDrag";

type FormatAction = "bold" | "italic" | "underline" | "strikethrough";
type HeadingAction = "h1" | "h2";
type InsertAction = "image" | "youtube";

interface Props {
  onFormat: (action: FormatAction) => void;
  onHeading: (action: HeadingAction) => void;
  onInsert: (action: InsertAction) => void;
}

export default function FloatingToolbar({ onFormat, onHeading, onInsert }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [posX, setPosX] = useState<number | null>(null);
  const [posY, setPosY] = useState<number | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (posX === null) {
      setPosX(window.innerWidth - 200);
      setPosY(window.innerHeight - 80);
    }
  }, [posX]);

  useEffect(() => {
    const handleSelection = () => {
      const sel = window.getSelection();
      if (sel && sel.toString().trim().length > 0) {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setPosX(rect.left + rect.width / 2 - 150);
        setPosY(rect.top - 52);
        setExpanded(true);
      }
    };

    document.addEventListener("selectionchange", handleSelection);
    return () => document.removeEventListener("selectionchange", handleSelection);
  }, []);

  const { onPointerDown } = useDrag({
    getInitial: () => ({ x: posX ?? 0, y: posY ?? 0 }),
    onDrag: (x, y) => {
      setPosX(x);
      setPosY(y);
    },
  });

  const formatBtn = (
    label: React.ReactNode,
    action: FormatAction,
    style?: React.CSSProperties
  ) => (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        onFormat(action);
      }}
      style={{
        padding: "5px 9px",
        borderRadius: 7,
        fontSize: 14,
        color: C.cr,
        background: "transparent",
        border: "none",
        cursor: "pointer",
        ...style,
      }}
    >
      {label}
    </button>
  );

  const sep = (
    <span
      style={{
        width: 1,
        height: 18,
        background: "rgba(255,255,255,0.08)",
        margin: "0 4px",
        flexShrink: 0,
      }}
    />
  );

  if (!expanded) {
    return (
      <div
        ref={toolbarRef}
        onPointerDown={onPointerDown}
        onClick={() => setExpanded(true)}
        style={{
          position: "fixed",
          left: posX ?? undefined,
          top: posY ?? undefined,
          background: "rgba(232,168,124,0.15)",
          border: "1px solid rgba(232,168,124,0.3)",
          borderRadius: 20,
          padding: "6px 14px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          cursor: "grab",
          userSelect: "none",
          zIndex: 100,
        }}
      >
        <span style={{ fontSize: 15, color: C.rg, fontWeight: 600 }}>Aa</span>
      </div>
    );
  }

  return (
    <div
      ref={toolbarRef}
      style={{
        position: "fixed",
        left: posX ?? undefined,
        top: posY ?? undefined,
        background: "rgba(20,22,28,0.92)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        padding: "8px 10px",
        display: "flex",
        alignItems: "center",
        gap: 2,
        zIndex: 100,
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        userSelect: "none",
      }}
    >
      <span
        onPointerDown={onPointerDown}
        style={{
          padding: "4px 6px",
          fontSize: 12,
          color: "#555",
          cursor: "grab",
          letterSpacing: 1,
        }}
      >
        ⁞⁞
      </span>
      {sep}

      {formatBtn(<strong>B</strong>, "bold", { fontWeight: 700 })}
      {formatBtn(<em>I</em>, "italic", { fontStyle: "italic" })}
      {formatBtn(<u>U</u>, "underline", { textDecoration: "underline" })}
      {formatBtn(<s>S</s>, "strikethrough", { textDecoration: "line-through" })}
      {sep}

      <button
        onMouseDown={(e) => {
          e.preventDefault();
          onHeading("h1");
        }}
        style={{
          padding: "5px 9px",
          borderRadius: 7,
          fontSize: 14,
          fontWeight: 600,
          color: C.cr,
          background: "transparent",
          border: "none",
          cursor: "pointer",
        }}
      >
        H1
      </button>
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          onHeading("h2");
        }}
        style={{
          padding: "5px 9px",
          borderRadius: 7,
          fontSize: 14,
          fontWeight: 600,
          color: C.cr,
          background: "transparent",
          border: "none",
          cursor: "pointer",
        }}
      >
        H2
      </button>
      {sep}

      <button
        onClick={() => onInsert("image")}
        style={{
          padding: "5px 9px",
          borderRadius: 7,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: C.rg,
          display: "flex",
        }}
      >
        {I.img}
      </button>
      <button
        onClick={() => onInsert("youtube")}
        style={{
          padding: "5px 9px",
          borderRadius: 7,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: C.rg,
          display: "flex",
        }}
      >
        {I.yt}
      </button>
      {sep}

      <button
        onClick={() => setExpanded(false)}
        style={{
          padding: "5px 8px",
          borderRadius: 7,
          fontSize: 13,
          color: "#555",
          background: "transparent",
          border: "none",
          cursor: "pointer",
        }}
      >
        ✕
      </button>
    </div>
  );
}
