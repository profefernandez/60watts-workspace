"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { C } from "../lib/colors";
import { glass, glassBtn } from "../lib/styles";
import { I } from "../lib/icons";
import type { PrototypeMode } from "../lib/types";

interface PrototypeStudioProps {
  workspaceId: string;
}

const DEFAULT_CODE = `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: 'Segoe UI', sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: #f0f0f0;
    }
    .card {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.1);
      text-align: center;
    }
    h1 { color: #333; margin: 0 0 0.5rem; }
    p { color: #666; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Hello, Prototype!</h1>
    <p>Edit the code to see changes live.</p>
  </div>
</body>
</html>`;

const storageKey = (id: string) => `proto-${id}`;

export default function PrototypeStudio({ workspaceId }: PrototypeStudioProps) {
  const [mode, setMode] = useState<PrototypeMode>("split");
  const [code, setCode] = useState(DEFAULT_CODE);
  const [debouncedCode, setDebouncedCode] = useState(DEFAULT_CODE);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey(workspaceId));
      if (saved) {
        setCode(saved);
        setDebouncedCode(saved);
      }
    } catch {
      /* localStorage unavailable */
    }
  }, [workspaceId]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(workspaceId), code);
    } catch {
      /* localStorage unavailable */
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedCode(code), 300);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [code, workspaceId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const ta = e.currentTarget;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const next = code.substring(0, start) + "  " + code.substring(end);
        setCode(next);
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + 2;
        });
      }
    },
    [code],
  );

  const handleClear = useCallback(() => {
    setCode(DEFAULT_CODE);
    setDebouncedCode(DEFAULT_CODE);
  }, []);

  const showEditor = mode === "code" || mode === "split";
  const showPreview = mode === "preview" || mode === "split";

  const modeBtn = (m: PrototypeMode, label: string, icon: React.ReactNode) => (
    <button
      onClick={() => setMode(m)}
      style={glassBtn(
        mode === m
          ? { background: C.rg, color: C.ob1, borderColor: C.rg }
          : {},
      )}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: C.ob2,
        fontFamily: "Satoshi, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "20px 24px 0",
          flexShrink: 0,
        }}
      >
        <h2
          style={{
            margin: "0 0 16px",
            fontSize: "26px",
            fontWeight: 700,
            fontFamily: "'Clash Display', sans-serif",
            color: C.cr,
            letterSpacing: "-0.02em",
          }}
        >
          Prototype Studio
        </h2>

        {/* Toolbar */}
        <div
          style={glass({
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 12px",
            marginBottom: "16px",
          })}
        >
          {modeBtn("code", "Code", I.file)}
          {modeBtn("preview", "Preview", I.eye)}
          {modeBtn("split", "Split", I.board)}

          <div style={{ flex: 1 }} />

          <button onClick={handleClear} style={glassBtn()}>
            {I.trash}
            Clear
          </button>
        </div>
      </div>

      {/* Editor + Preview area */}
      <div
        style={{
          display: "flex",
          flex: 1,
          gap: "12px",
          padding: "0 24px 24px",
          minHeight: 0,
        }}
      >
        {/* Code editor */}
        {showEditor && (
          <div
            style={{
              flex: mode === "split" ? "0 0 50%" : 1,
              display: "flex",
              flexDirection: "column",
              background: C.ob1,
              border: `1px solid ${C.glassBrd}`,
              borderRadius: "12px",
              overflow: "hidden",
              minWidth: 0,
            }}
          >
            <div
              style={{
                padding: "10px 16px",
                fontSize: "13px",
                fontWeight: 600,
                color: C.tx3,
                fontFamily: "Satoshi, sans-serif",
                borderBottom: `1px solid ${C.glassBrd}`,
                flexShrink: 0,
              }}
            >
              HTML / CSS / JS
            </div>
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              style={{
                flex: 1,
                width: "100%",
                padding: "16px",
                margin: 0,
                border: "none",
                outline: "none",
                resize: "none",
                background: C.ob1,
                color: C.cr,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "14px",
                lineHeight: 1.6,
                tabSize: 2,
                whiteSpace: "pre",
                overflowWrap: "normal",
                overflowX: "auto",
                boxSizing: "border-box",
              }}
            />
          </div>
        )}

        {/* Live preview */}
        {showPreview && (
          <div
            style={{
              flex: mode === "split" ? "0 0 calc(50% - 12px)" : 1,
              display: "flex",
              flexDirection: "column",
              border: `1px solid ${C.glassBrd}`,
              borderRadius: "12px",
              overflow: "hidden",
              minWidth: 0,
            }}
          >
            <div
              style={{
                padding: "10px 16px",
                fontSize: "13px",
                fontWeight: 600,
                color: C.tx3,
                fontFamily: "Satoshi, sans-serif",
                borderBottom: `1px solid ${C.glassBrd}`,
                background: C.ob1,
                flexShrink: 0,
              }}
            >
              Preview
            </div>
            <iframe
              srcDoc={debouncedCode}
              sandbox="allow-scripts"
              title="Prototype Preview"
              style={{
                flex: 1,
                width: "100%",
                border: "none",
                background: "#ffffff",
                borderRadius: "0 0 12px 12px",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
