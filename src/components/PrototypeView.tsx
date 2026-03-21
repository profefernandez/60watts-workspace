"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { C } from "../lib/colors";
import { glassBtn } from "../lib/styles";
import type { PrototypeMode } from "../lib/types";

interface Props {
  code?: string;
  onCodeChange?: (code: string) => void;
}

const STARTER = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; padding: 2rem; background: #1a1a1a; color: white; }
    h1 { color: #E8A87C; }
  </style>
</head>
<body>
  <h1>Prototype Studio</h1>
  <p>Start coding or ask Prof\u00e9 to generate a design.</p>
</body>
</html>`;

export default function PrototypeView({ code: externalCode, onCodeChange }: Props) {
  const [code, setCode] = useState(STARTER);
  const [mode, setMode] = useState<PrototypeMode>("split");
  const [editMode, setEditMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Step 6.3: Watch external code prop (from Profe)
  useEffect(() => {
    if (externalCode !== undefined && externalCode !== code) {
      setCode(externalCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalCode]);

  // Step 6.2: Debounced live preview
  const writeToIframe = useCallback((html: string) => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument;
      if (!doc) return;
      doc.open();
      doc.write(html);
      doc.close();
      if (editMode) {
        doc.body.contentEditable = "true";
      }
    } catch {
      // cross-origin or security error
    }
  }, [editMode]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      writeToIframe(code);
    }, 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [code, writeToIframe]);

  // Toggle contentEditable when editMode changes
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument;
      if (doc?.body) {
        doc.body.contentEditable = editMode ? "true" : "false";
      }
    } catch {
      // ignore
    }
  }, [editMode]);

  const handleCodeChange = (val: string) => {
    setCode(val);
    onCodeChange?.(val);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback: ignore
    }
  };

  const handleClear = () => {
    setCode(STARTER);
    onCodeChange?.(STARTER);
  };

  const showCode = mode === "split" || mode === "code";
  const showPreview = mode === "split" || mode === "preview";

  const modeBtn = (m: PrototypeMode, label: string) => (
    <button
      onClick={() => setMode(m)}
      style={{
        ...glassBtn(),
        padding: "6px 14px",
        fontSize: 14,
        background: mode === m ? `${C.rg}20` : C.glass,
        color: mode === m ? C.rg : C.tx2,
        border: `1px solid ${mode === m ? `${C.rg}40` : C.glassBrd}`,
      }}
      onMouseEnter={(e) => {
        if (mode !== m) e.currentTarget.style.background = C.glassB;
      }}
      onMouseLeave={(e) => {
        if (mode !== m) e.currentTarget.style.background = C.glass;
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* ── Toolbar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 0",
          marginBottom: 8,
          borderBottom: `1px solid ${C.glassBrd}`,
          flexWrap: "wrap",
        }}
      >
        {/* Mode toggles */}
        {modeBtn("split", "Split")}
        {modeBtn("code", "Code")}
        {modeBtn("preview", "Preview")}

        {/* Separator */}
        <div style={{ width: 1, height: 20, background: C.glassBrd, margin: "0 4px" }} />

        {/* Edit Mode toggle */}
        <button
          onClick={() => setEditMode(!editMode)}
          style={{
            ...glassBtn(),
            padding: "6px 14px",
            fontSize: 14,
            background: editMode ? `${C.green}20` : C.glass,
            color: editMode ? C.green : C.tx2,
            border: `1px solid ${editMode ? `${C.green}40` : C.glassBrd}`,
          }}
        >
          Edit Mode
        </button>

        {/* Copy */}
        <button
          onClick={handleCopy}
          style={{
            ...glassBtn(),
            padding: "6px 14px",
            fontSize: 14,
            color: copied ? C.green : C.tx2,
          }}
        >
          {copied ? "Copied!" : "Copy"}
        </button>

        {/* Clear */}
        <button
          onClick={handleClear}
          style={{
            ...glassBtn(),
            padding: "6px 14px",
            fontSize: 14,
            color: C.tx3,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = C.red;
            e.currentTarget.style.background = C.glassB;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = C.tx3;
            e.currentTarget.style.background = C.glass;
          }}
        >
          Clear
        </button>
      </div>

      {/* ── Split Pane Area ── */}
      <div style={{ flex: 1, display: "flex", gap: 0, minHeight: 0, overflow: "hidden" }}>
        {/* Code Editor Pane */}
        {showCode && (
          <div
            style={{
              flex: mode === "split" ? "0 0 50%" : 1,
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
              position: "relative",
            }}
          >
            <textarea
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              spellCheck={false}
              style={{
                flex: 1,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 15,
                lineHeight: 1.6,
                background: C.ob1,
                color: C.cr,
                border: "none",
                outline: "none",
                padding: 16,
                resize: "none",
                borderRadius: mode === "code" ? 8 : "8px 0 0 8px",
                tabSize: 2,
                whiteSpace: "pre",
                overflowWrap: "normal",
                overflowX: "auto",
                overflowY: "auto",
              }}
              onKeyDown={(e) => {
                // Tab support
                if (e.key === "Tab") {
                  e.preventDefault();
                  const ta = e.currentTarget;
                  const start = ta.selectionStart;
                  const end = ta.selectionEnd;
                  const val = ta.value;
                  const newVal = val.substring(0, start) + "  " + val.substring(end);
                  handleCodeChange(newVal);
                  requestAnimationFrame(() => {
                    ta.selectionStart = ta.selectionEnd = start + 2;
                  });
                }
              }}
            />
          </div>
        )}

        {/* Glass Divider */}
        {mode === "split" && (
          <div
            style={{
              width: 1,
              background: C.glassBrd,
              flexShrink: 0,
            }}
          />
        )}

        {/* Preview Pane */}
        {showPreview && (
          <div
            style={{
              flex: mode === "split" ? "0 0 calc(50% - 1px)" : 1,
              minWidth: 0,
              borderRadius: mode === "preview" ? 8 : "0 8px 8px 0",
              overflow: "hidden",
              background: "white",
            }}
          >
            <iframe
              ref={iframeRef}
              title="Prototype Preview"
              sandbox="allow-scripts allow-same-origin"
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                background: "white",
                borderRadius: mode === "preview" ? 8 : "0 8px 8px 0",
                display: "block",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
