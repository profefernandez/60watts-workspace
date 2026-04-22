"use client";

import React, { useState, useEffect, useCallback } from "react";
import { C } from "../lib/colors";
import { glass, glassBtn } from "../lib/styles";
import { I } from "../lib/icons";

interface SettingsProps {
  user: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface SavedKeys {
  [provider: string]: string;
}

const PROVIDERS = [{ value: "anthropic", label: "Anthropic" }] as const;

const storageKey = (userId: string) => `api-keys-${userId}`;

const maskKey = (key: string) =>
  key.length > 4 ? "•".repeat(key.length - 4) + key.slice(-4) : "•••• ";

const sectionHeading: React.CSSProperties = {
  fontFamily: "'Clash Display', sans-serif",
  fontSize: 24,
  fontWeight: 600,
  color: C.cr,
  margin: 0,
  marginBottom: 16,
};

const label: React.CSSProperties = {
  fontFamily: "'Satoshi', sans-serif",
  fontSize: 14,
  fontWeight: 500,
  color: C.tx3,
  marginBottom: 4,
};

const valueText: React.CSSProperties = {
  fontFamily: "'Satoshi', sans-serif",
  fontSize: 16,
  color: C.cr,
  margin: 0,
};

const inputStyle: React.CSSProperties = {
  fontFamily: "'Satoshi', sans-serif",
  fontSize: 16,
  color: C.cr,
  background: C.ob1,
  border: `1px solid ${C.glassBrd}`,
  borderRadius: 10,
  padding: "10px 14px",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "none" as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238A8078' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 14px center",
  paddingRight: 36,
  cursor: "pointer",
};

export default function Settings({ user }: SettingsProps) {
  const [provider, setProvider] = useState("anthropic");
  const [keyInput, setKeyInput] = useState("");
  const [savedKeys, setSavedKeys] = useState<SavedKeys>({});
  const [activeTheme, setActiveTheme] = useState<"dark" | "light">("dark");

  const loadKeys = useCallback(() => {
    if (!user) return;
    try {
      const raw = localStorage.getItem(storageKey(user.id));
      if (raw) setSavedKeys(JSON.parse(raw));
    } catch {
      /* ignore corrupt data */
    }
  }, [user]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const persistKeys = (next: SavedKeys) => {
    if (!user) return;
    localStorage.setItem(storageKey(user.id), JSON.stringify(next));
    setSavedKeys(next);
  };

  const handleSaveKey = () => {
    if (!keyInput.trim() || !user) return;
    persistKeys({ ...savedKeys, [provider]: keyInput.trim() });
    setKeyInput("");
  };

  const handleDeleteKey = (p: string) => {
    const next = { ...savedKeys };
    delete next[p];
    persistKeys(next);
  };

  return (
    <div
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "40px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      {/* Page Header */}
      <h1
        style={{
          fontFamily: "'Clash Display', sans-serif",
          fontSize: 32,
          fontWeight: 700,
          color: C.cr,
          margin: 0,
        }}
      >
        Settings
      </h1>

      {/* ── Section 1: Profile ── */}
      <div style={glass({ padding: 24 })}>
        <h2 style={sectionHeading}>Profile</h2>
        {user ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <p style={label}>Email</p>
              <p style={valueText}>{user.email}</p>
            </div>
            <div style={{ display: "flex", gap: 24 }}>
              <div style={{ flex: 1 }}>
                <p style={label}>First Name</p>
                <p style={valueText}>{user.first_name ?? "—"}</p>
              </div>
              <div style={{ flex: 1 }}>
                <p style={label}>Last Name</p>
                <p style={valueText}>{user.last_name ?? "—"}</p>
              </div>
            </div>
          </div>
        ) : (
          <p style={{ ...valueText, color: C.tx3 }}>Not signed in</p>
        )}
      </div>

      {/* ── Section 2: API Keys ── */}
      <div style={glass({ padding: 24 })}>
        <h2 style={sectionHeading}>API Keys</h2>

        {/* Input row */}
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "flex-end",
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          <div style={{ flex: "0 0 160px" }}>
            <p style={{ ...label, marginBottom: 6 }}>Provider</p>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              style={selectStyle}
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <p style={{ ...label, marginBottom: 6 }}>API Key</p>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="sk-ant-..."
              style={inputStyle}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveKey();
              }}
            />
          </div>
          <button
            onClick={handleSaveKey}
            disabled={!keyInput.trim() || !user}
            style={glassBtn({
              background: C.rg,
              color: C.ob1,
              fontWeight: 600,
              opacity: !keyInput.trim() || !user ? 0.4 : 1,
              cursor: !keyInput.trim() || !user ? "not-allowed" : "pointer",
              border: "none",
              padding: "10px 20px",
              borderRadius: 10,
              whiteSpace: "nowrap",
            })}
          >
            Save Key
          </button>
        </div>

        {/* Saved keys list */}
        {Object.keys(savedKeys).length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Object.entries(savedKeys).map(([p, key]) => (
              <div
                key={p}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  background: C.ob2,
                  border: `1px solid ${C.glassBrd}`,
                  borderRadius: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    style={{
                      fontFamily: "'Satoshi', sans-serif",
                      fontSize: 14,
                      fontWeight: 600,
                      color: C.rg,
                      textTransform: "capitalize",
                    }}
                  >
                    {p}
                  </span>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 14,
                      color: C.tx3,
                      letterSpacing: 1,
                    }}
                  >
                    {maskKey(key)}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteKey(p)}
                  style={{
                    ...glassBtn({
                      padding: "4px 8px",
                      color: C.red,
                      borderColor: "transparent",
                      background: "transparent",
                    }),
                  }}
                  title="Delete key"
                >
                  {I.trash}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p
            style={{
              fontFamily: "'Satoshi', sans-serif",
              fontSize: 14,
              color: C.tx3,
              margin: 0,
            }}
          >
            No saved keys. Add a provider key above to use Research and YouTube
            features.
          </p>
        )}
      </div>

      {/* ── Section 3: Theme Toggle ── */}
      <div style={glass({ padding: 24 })}>
        <h2 style={sectionHeading}>Theme</h2>
        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          <button
            onClick={() => setActiveTheme("dark")}
            style={glassBtn({
              flex: 1,
              justifyContent: "center",
              padding: "10px 0",
              borderRadius: 10,
              border:
                activeTheme === "dark"
                  ? `2px solid ${C.rg}`
                  : `1px solid ${C.glassBrd}`,
              background: activeTheme === "dark" ? C.glassB : C.glass,
              color: activeTheme === "dark" ? C.cr : C.tx3,
              fontWeight: activeTheme === "dark" ? 600 : 500,
            })}
          >
            {I.moon}
            Dark
          </button>
          <button
            onClick={() => setActiveTheme("light")}
            style={glassBtn({
              flex: 1,
              justifyContent: "center",
              padding: "10px 0",
              borderRadius: 10,
              border:
                activeTheme === "light"
                  ? `2px solid ${C.rg}`
                  : `1px solid ${C.glassBrd}`,
              background: activeTheme === "light" ? C.glassB : C.glass,
              color: activeTheme === "light" ? C.cr : C.tx3,
              fontWeight: activeTheme === "light" ? 600 : 500,
            })}
          >
            {I.sun}
            Light
          </button>
        </div>
        <p
          style={{
            fontFamily: "'Satoshi', sans-serif",
            fontSize: 14,
            color: C.tx3,
            margin: 0,
            fontStyle: "italic",
          }}
        >
          Theme switching coming soon
        </p>
      </div>
    </div>
  );
}
