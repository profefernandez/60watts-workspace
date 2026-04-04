"use client";
import React, { useRef, useEffect, useCallback } from "react";
import DOMPurify from "dompurify";
import { C } from "../../lib/colors";
import type { CanvasBlock } from "../../lib/directus";

const PURIFY_CONFIG = {
  ALLOWED_TAGS: ["b", "i", "u", "s", "br", "strong", "em"],
  ALLOWED_ATTR: [] as string[],
};

const STYLES: Record<string, React.CSSProperties> = {
  text: {
    fontFamily: "'Satoshi'",
    fontSize: 20,
    fontWeight: 400,
    color: C.cr,
    lineHeight: 1.7,
  },
  h1: {
    fontFamily: "'Clash Display'",
    fontSize: 40,
    fontWeight: 700,
    color: C.rg,
    letterSpacing: "-0.03em",
    lineHeight: 1.2,
  },
  h2: {
    fontFamily: "'Clash Display'",
    fontSize: 26,
    fontWeight: 600,
    color: C.rg,
    letterSpacing: "-0.02em",
    lineHeight: 1.3,
  },
};

function getStyle(block: CanvasBlock): React.CSSProperties {
  if (block.type === "heading") {
    return STYLES[block.format || "h1"] || STYLES.h1;
  }
  return STYLES.text;
}

const PLACEHOLDERS: Record<string, string> = {
  text: "Start writing...",
  h1: "Heading",
  h2: "Subheading",
};

function getPlaceholder(block: CanvasBlock): string {
  if (block.type === "heading") return PLACEHOLDERS[block.format || "h1"];
  return PLACEHOLDERS.text;
}

interface Props {
  block: CanvasBlock;
  autoFocus?: boolean;
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onSplit: (id: string, beforeHtml: string, afterHtml: string) => void;
  onMergeUp: (id: string) => void;
  onNewBlockBelow: (id: string) => void;
}

export default function TextBlock({
  block,
  autoFocus,
  onUpdate,
  onDelete,
  onSplit,
  onMergeUp,
  onNewBlockBelow,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (ref.current && !initializedRef.current) {
      const sanitized = DOMPurify.sanitize(block.content || "", PURIFY_CONFIG);
      ref.current.innerHTML = sanitized;
      initializedRef.current = true;
    }
  }, [block.id]);

  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus();
      const sel = window.getSelection();
      if (sel && ref.current.childNodes.length > 0) {
        sel.selectAllChildren(ref.current);
        sel.collapseToEnd();
      }
    }
  }, [autoFocus]);

  const handleInput = useCallback(() => {
    if (ref.current) {
      const html = DOMPurify.sanitize(ref.current.innerHTML, PURIFY_CONFIG);
      onUpdate(block.id, html);
    }
  }, [block.id, onUpdate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const sel = window.getSelection();
        if (!sel || !ref.current) {
          onNewBlockBelow(block.id);
          return;
        }

        const range = sel.getRangeAt(0);
        range.deleteContents();

        const beforeRange = document.createRange();
        beforeRange.setStart(ref.current, 0);
        beforeRange.setEnd(range.startContainer, range.startOffset);
        const beforeFrag = beforeRange.cloneContents();
        const beforeDiv = document.createElement("div");
        beforeDiv.appendChild(beforeFrag);

        const afterRange = document.createRange();
        afterRange.setStart(range.endContainer, range.endOffset);
        afterRange.setEndAfter(ref.current.lastChild || ref.current);
        const afterFrag = afterRange.cloneContents();
        const afterDiv = document.createElement("div");
        afterDiv.appendChild(afterFrag);

        const beforeHtml = DOMPurify.sanitize(beforeDiv.innerHTML, PURIFY_CONFIG);
        const afterHtml = DOMPurify.sanitize(afterDiv.innerHTML, PURIFY_CONFIG);

        onSplit(block.id, beforeHtml, afterHtml);
      }

      if (e.key === "Backspace") {
        const sel = window.getSelection();
        if (!sel || !ref.current) return;
        const content = ref.current.textContent || "";
        if (content.length === 0) {
          e.preventDefault();
          onMergeUp(block.id);
        }
      }
    },
    [block.id, onSplit, onMergeUp, onNewBlockBelow]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const html = e.clipboardData.getData("text/html");
      const text = e.clipboardData.getData("text/plain");
      const clean = html
        ? DOMPurify.sanitize(html, PURIFY_CONFIG)
        : DOMPurify.sanitize(text, PURIFY_CONFIG);
      document.execCommand("insertHTML", false, clean);
      handleInput();
    },
    [handleInput]
  );

  return (
    <div
      style={{ position: "relative", marginBottom: 4 }}
      onMouseEnter={(e) => {
        const del = e.currentTarget.querySelector(".block-delete") as HTMLElement;
        if (del) del.style.opacity = "0.6";
      }}
      onMouseLeave={(e) => {
        const del = e.currentTarget.querySelector(".block-delete") as HTMLElement;
        if (del) del.style.opacity = "0";
      }}
    >
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onFocus={(e) => (e.currentTarget.style.outline = `2px solid ${C.rg}`)}
        onBlur={(e) => (e.currentTarget.style.outline = "none")}
        style={{
          ...getStyle(block),
          padding: "8px 12px",
          borderRadius: 8,
          outline: "none",
          transition: "outline-color 0.15s",
          minHeight: block.type === "heading" ? 40 : 32,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
        data-placeholder={getPlaceholder(block)}
      />
      <button
        onClick={() => onDelete(block.id)}
        className="block-delete"
        style={{
          position: "absolute",
          top: 4,
          right: -32,
          background: "transparent",
          border: "none",
          padding: 4,
          cursor: "pointer",
          color: C.tx4,
          opacity: 0,
          transition: "opacity 0.15s",
        }}
      >
        <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" />
        </svg>
      </button>
    </div>
  );
}
