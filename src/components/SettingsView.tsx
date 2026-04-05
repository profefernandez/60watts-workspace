"use client";

import React, { useState, useEffect, useCallback } from "react";
import { C } from "../lib/colors";
import { glass } from "../lib/styles";

interface ProviderStatusInfo {
  connected: boolean;
  hint: string | null;
  extra_hint?: string | null;
  health: "healthy" | "degraded" | "down";
  health_message: string | null;
}

type ProviderKey = "anthropic" | "launchlemonade" | "ll_search" | "perplexity" | "youtube" | "pubmed";

interface ProviderConfig {
  key: ProviderKey;
  name: string;
  description: string;
  agentIdOnly?: boolean;
  fields: { name: string; label: string; type: "password"; placeholder: string; bodyKey: string }[];
}

const PROVIDERS: ProviderConfig[] = [
  {
    key: "launchlemonade", name: "LaunchLemonade",
    description: "AI assistant platform. Requires an API key and Agent ID to connect your custom assistant.",
    fields: [
      { name: "api_key", label: "API Key", type: "password", placeholder: "Paste your API key", bodyKey: "api_key" },
      { name: "agent_id", label: "Agent ID", type: "password", placeholder: "Agent ID (e.g., agent_abc123)", bodyKey: "agent_id" },
    ],
  },
  {
    key: "ll_search", name: "Context Search (Perplexity)",
    description: "Search Agent ID for Perplexity-powered web search. Reuses your LaunchLemonade API key — only the Search Agent ID is needed here.",
    agentIdOnly: true,
    fields: [
      { name: "agent_id", label: "Search Agent ID", type: "password", placeholder: "Search Agent ID (e.g., agent_search_abc123)", bodyKey: "agent_id" },
    ],
  },
  {
    key: "anthropic", name: "Anthropic",
    description: "Powers Profé AI chat and research. Requires a Claude API key from console.anthropic.com.",
    fields: [{ name: "api_key", label: "API Key", type: "password", placeholder: "Paste your Anthropic API key", bodyKey: "api_key" }],
  },
  {
    key: "perplexity", name: "Perplexity",
    description: "Web-connected AI search. Requires an API key from perplexity.ai.",
    fields: [{ name: "api_key", label: "API Key", type: "password", placeholder: "Paste your Perplexity API key", bodyKey: "api_key" }],
  },
  {
    key: "youtube", name: "YouTube Data API",
    description: "Search and embed YouTube videos. Requires a Google Cloud API key with YouTube Data API v3 enabled.",
    fields: [{ name: "api_key", label: "API Key", type: "password", placeholder: "Paste your YouTube Data API key", bodyKey: "api_key" }],
  },
  {
    key: "pubmed", name: "PubMed / Custom Research",
    description: "PubMed is free — no API key required for basic searches. NCBI registered users get higher rate limits.",
    fields: [{ name: "api_key", label: "API Key (optional)", type: "password", placeholder: "NCBI API key for higher rate limits", bodyKey: "api_key" }],
  },
];

function healthColor(health: string): string {
  if (health === "healthy") return C.green;
  if (health === "degraded") return "#F5A623";
  return C.red;
}

function healthLabel(info: ProviderStatusInfo | undefined): { text: string; color: string } {
  if (!info || !info.connected) return { text: "Not configured", color: C.tx4 };
  if (info.health === "healthy") return { text: "Connected", color: C.green };
  if (info.health === "degraded") return { text: "Slow responses", color: "#F5A623" };
  return { text: info.health_message || "Unreachable", color: C.red };
}

interface SettingsViewProps { workspaceId?: string; }

export default function SettingsView({ workspaceId }: SettingsViewProps) {
  const [statuses, setStatuses] = useState<Record<ProviderKey, ProviderStatusInfo>>({
    anthropic: { connected: false, hint: null, health: "healthy", health_message: null },
    launchlemonade: { connected: false, hint: null, health: "healthy", health_message: null },
    ll_search: { connected: false, hint: null, health: "healthy", health_message: null },
    perplexity: { connected: false, hint: null, health: "healthy", health_message: null },
    youtube: { connected: false, hint: null, health: "healthy", health_message: null },
    pubmed: { connected: false, hint: null, health: "healthy", health_message: null },
  });
  const [editing, setEditing] = useState<Record<ProviderKey, boolean>>({
    anthropic: false, launchlemonade: false, ll_search: false, perplexity: false, youtube: false, pubmed: false,
  });
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<ProviderKey | null>(null);
  const [message, setMessage] = useState<{ provider: ProviderKey; text: string; isError: boolean } | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [extractionStyle, setExtractionStyle] = useState<"light" | "full">("light");
  const [sourceBrowser, setSourceBrowser] = useState<"embedded" | "external">("embedded");

  void workspaceId;

  const fetchStatus = useCallback(async () => {
    try {
      setStatusLoading(true);
      const res = await fetch("/api/settings/status", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setStatuses(data.providers);
      }
    } catch { /* silently fail */ } finally { setStatusLoading(false); }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);
  useEffect(() => { const i = setInterval(fetchStatus, 30_000); return () => clearInterval(i); }, [fetchStatus]);
  useEffect(() => { if (!message) return; const t = setTimeout(() => setMessage(null), 4000); return () => clearTimeout(t); }, [message]);

  useEffect(() => {
    const es = localStorage.getItem("60w_extraction_style");
    const sb = localStorage.getItem("60w_source_browser");
    if (es === "light" || es === "full") setExtractionStyle(es);
    if (sb === "embedded" || sb === "external") setSourceBrowser(sb);
  }, []);

  const handleExtractionStyle = (val: "light" | "full") => {
    setExtractionStyle(val);
    localStorage.setItem("60w_extraction_style", val);
  };

  const handleSourceBrowser = (val: "embedded" | "external") => {
    setSourceBrowser(val);
    localStorage.setItem("60w_source_browser", val);
  };

  const handleFieldChange = (provider: ProviderKey, field: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [`${provider}_${field}`]: value }));
  };

  const handleSave = async (provider: ProviderConfig) => {
    const apiKey = fieldValues[`${provider.key}_api_key`];
    const agentId = fieldValues[`${provider.key}_agent_id`];
    if (provider.agentIdOnly) {
      if (!agentId) { setMessage({ provider: provider.key, text: "Search Agent ID is required.", isError: true }); return; }
    } else if (!apiKey && provider.key !== "pubmed") {
      setMessage({ provider: provider.key, text: "API key is required.", isError: true }); return;
    }
    setSaving(provider.key);
    const body: Record<string, string> = { provider: provider.key };
    for (const field of provider.fields) {
      const val = fieldValues[`${provider.key}_${field.name}`];
      if (val) body[field.bodyKey] = val;
    }
    if (!body.api_key && !body.agent_id) { setSaving(null); setMessage({ provider: provider.key, text: "No value to save.", isError: true }); return; }

    try {
      const res = await fetch("/api/settings/keys", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        const cleared: Record<string, string> = {};
        for (const field of provider.fields) cleared[`${provider.key}_${field.name}`] = "";
        setFieldValues((prev) => ({ ...prev, ...cleared }));
        setStatuses((prev) => ({ ...prev, [provider.key]: { connected: true, hint: data.key_hint, extra_hint: data.extra_hint, health: "healthy", health_message: null } }));
        setEditing((prev) => ({ ...prev, [provider.key]: false }));
        setMessage({ provider: provider.key, text: "Connected successfully.", isError: false });
      } else {
        const err = await res.json().catch(() => ({ error: "Save failed." }));
        setMessage({ provider: provider.key, text: err.error || "Save failed.", isError: true });
      }
    } catch { setMessage({ provider: provider.key, text: "Network error. Please try again.", isError: true }); }
    finally { setSaving(null); }
  };

  const handleDisconnect = async (providerKey: ProviderKey) => {
    try {
      const res = await fetch("/api/settings/keys", {
        method: "DELETE", credentials: "include",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: providerKey }),
      });
      if (res.ok) {
        setStatuses((prev) => ({ ...prev, [providerKey]: { connected: false, hint: null, health: "healthy", health_message: null } }));
        setEditing((prev) => ({ ...prev, [providerKey]: false }));
        setMessage({ provider: providerKey, text: "Disconnected.", isError: false });
      }
    } catch { setMessage({ provider: providerKey, text: "Failed to disconnect.", isError: true }); }
  };

  const showFields = (pk: ProviderKey) => !statuses[pk]?.connected || editing[pk];

  return (
    <div style={{ padding: "32px", maxWidth: 720, margin: "0 auto", fontFamily: "'Satoshi'", color: C.tx }}>
      <h1 style={{ fontFamily: "'Clash Display'", fontSize: 28, fontWeight: 600, color: C.cr, marginBottom: 8 }}>Settings</h1>
      <p style={{ fontSize: 16, color: C.tx3, marginBottom: 32, fontFamily: "'Satoshi'" }}>
        Manage your API keys and provider connections. Keys are encrypted and never displayed after saving.
      </p>

      {statusLoading && (
        <div style={{ textAlign: "center", padding: 40, color: C.tx3, fontSize: 16, fontFamily: "'Satoshi'" }}>Loading provider status...</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {PROVIDERS.map((provider) => {
          const info = statuses[provider.key];
          const showForm = showFields(provider.key);
          const providerMessage = message && message.provider === provider.key ? message : null;
          const isSaving = saving === provider.key;
          const label = healthLabel(info);

          return (
            <div key={provider.key} style={{ ...glass({ padding: "24px" }) }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: showForm ? 20 : 0 }}>
                <div>
                  <h2 style={{ fontFamily: "'Clash Display'", fontSize: 20, fontWeight: 600, color: C.cr, margin: 0, marginBottom: 4 }}>{provider.name}</h2>
                  <p style={{ fontSize: 14, color: C.tx3, margin: 0, fontFamily: "'Satoshi'", lineHeight: 1.5 }}>{provider.description}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 16 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: info?.connected ? healthColor(info.health) : C.tx4,
                    boxShadow: info?.connected && info.health === "healthy" ? `0 0 8px ${C.green}60` : "none",
                  }} />
                  <span style={{ fontSize: 14, color: label.color, fontFamily: "'Satoshi'", fontWeight: 500 }}>{label.text}</span>
                </div>
              </div>

              {info?.connected && !editing[provider.key] && (
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                  {!provider.agentIdOnly && info.hint && (
                    <div style={{ fontSize: 14, color: C.tx3, fontFamily: "'JetBrains Mono'" }}>
                      API Key: <span style={{ color: C.tx4 }}>{info.hint}</span>
                    </div>
                  )}
                  {provider.agentIdOnly && info.extra_hint && (
                    <div style={{ fontSize: 14, color: C.tx3, fontFamily: "'JetBrains Mono'" }}>
                      Search Agent ID: <span style={{ color: C.tx4 }}>{info?.extra_hint}</span>
                    </div>
                  )}
                  {!provider.agentIdOnly && info.extra_hint && (
                    <div style={{ fontSize: 14, color: C.tx3, fontFamily: "'JetBrains Mono'" }}>
                      Agent ID: <span style={{ color: C.tx4 }}>{info?.extra_hint}</span>
                    </div>
                  )}
                </div>
              )}

              {showForm && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {provider.key === "launchlemonade" && (
                    <p style={{ fontSize: 13, color: C.tx4, margin: 0, fontFamily: "'Satoshi'", fontStyle: "italic" }}>Agent IDs are workspace-specific</p>
                  )}
                  {provider.fields.map((field) => (
                    <div key={field.name}>
                      <label style={{ display: "block", fontSize: 13, color: C.tx3, marginBottom: 6, fontFamily: "'Satoshi'", fontWeight: 500 }}>{field.label}</label>
                      <input
                        type="password"
                        placeholder={field.placeholder}
                        value={fieldValues[`${provider.key}_${field.name}`] || ""}
                        onChange={(e) => handleFieldChange(provider.key, field.name, e.target.value)}
                        autoComplete="new-password"
                        data-1p-ignore="true"
                        onCopy={(e) => e.preventDefault()}
                        style={{
                          width: "100%", padding: "10px 14px", background: C.ob1,
                          border: `1px solid ${C.ob6}`, borderRadius: 10, color: C.tx,
                          fontSize: 15, fontFamily: "'JetBrains Mono'", outline: "none",
                          boxSizing: "border-box", transition: "border-color 0.2s",
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = C.rg; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = C.ob6; }}
                      />
                    </div>
                  ))}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
                    <button onClick={() => handleSave(provider)} disabled={isSaving} style={{
                      padding: "10px 24px", background: `linear-gradient(135deg, ${C.rg}, ${C.rg2})`,
                      border: "none", borderRadius: 10, color: C.ob1, fontSize: 15, fontWeight: 600,
                      fontFamily: "'Satoshi'", cursor: isSaving ? "wait" : "pointer",
                      opacity: isSaving ? 0.7 : 1, transition: "all 0.2s",
                    }}>
                      {isSaving ? "Saving..." : "Save"}
                    </button>
                    {info?.connected && editing[provider.key] && (
                      <button onClick={() => setEditing((prev) => ({ ...prev, [provider.key]: false }))} style={{
                        padding: "10px 20px", background: "transparent", border: `1px solid ${C.glassBrd}`,
                        borderRadius: 10, color: C.tx3, fontSize: 15, fontFamily: "'Satoshi'", cursor: "pointer", transition: "all 0.2s",
                      }}>Cancel</button>
                    )}
                    {providerMessage && (
                      <span style={{ fontSize: 14, color: providerMessage.isError ? C.red : C.green, fontFamily: "'Satoshi'", fontWeight: 500 }}>{providerMessage.text}</span>
                    )}
                  </div>
                </div>
              )}

              {info?.connected && !editing[provider.key] && (
                <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                  <button onClick={() => setEditing((prev) => ({ ...prev, [provider.key]: true }))} style={{
                    padding: "8px 18px", background: "transparent", border: `1px solid ${C.glassBrd}`,
                    borderRadius: 10, color: C.tx3, fontSize: 14, fontFamily: "'Satoshi'", cursor: "pointer", transition: "all 0.2s",
                  }}>{provider.agentIdOnly ? "Change Agent ID" : "Change Key"}</button>
                  <button onClick={() => handleDisconnect(provider.key)} style={{
                    padding: "8px 18px", background: "transparent", border: "1px solid rgba(255,80,80,0.3)",
                    borderRadius: 10, color: C.red, fontSize: 14, fontFamily: "'Satoshi'", cursor: "pointer", transition: "all 0.2s",
                  }}>Disconnect</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Local Preferences ── */}
      <div style={{ marginTop: 40 }}>
        <h2 style={{ fontFamily: "'Clash Display'", fontSize: 22, fontWeight: 600, color: C.cr, marginBottom: 8 }}>Preferences</h2>
        <p style={{ fontSize: 15, color: C.tx3, marginBottom: 24, fontFamily: "'Satoshi'" }}>
          Local settings stored in your browser. No account required.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Extraction Style */}
          <div style={{ ...glass({ padding: "20px 24px" }), display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ fontFamily: "'Satoshi'", fontSize: 16, fontWeight: 600, color: C.tx, marginBottom: 4 }}>Extraction Style</div>
              <div style={{ fontFamily: "'Satoshi'", fontSize: 14, color: C.tx3 }}>How much the AI rewrites content pulled from sources</div>
            </div>
            <div style={{ display: "flex", gap: 0, borderRadius: 10, overflow: "hidden", border: `1px solid ${C.glassBrd}`, flexShrink: 0 }}>
              {(["light", "full"] as const).map((val, idx) => (
                <button
                  key={val}
                  onClick={() => handleExtractionStyle(val)}
                  style={{
                    padding: "9px 20px",
                    fontFamily: "'Satoshi'", fontSize: 14, fontWeight: extractionStyle === val ? 600 : 400,
                    cursor: "pointer", border: "none", transition: "all 0.2s",
                    borderRight: idx === 0 ? `1px solid ${C.glassBrd}` : "none",
                    background: extractionStyle === val ? `linear-gradient(135deg, ${C.rg}, ${C.rg2})` : "transparent",
                    color: extractionStyle === val ? C.ob1 : C.tx3,
                  }}
                >
                  {val === "light" ? "Light Touch" : "Full Rewrite"}
                </button>
              ))}
            </div>
          </div>

          {/* Source Browser */}
          <div style={{ ...glass({ padding: "20px 24px" }), display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ fontFamily: "'Satoshi'", fontSize: 16, fontWeight: 600, color: C.tx, marginBottom: 4 }}>Source Browser</div>
              <div style={{ fontFamily: "'Satoshi'", fontSize: 14, color: C.tx3 }}>Where source links open when reviewing search results</div>
            </div>
            <div style={{ display: "flex", gap: 0, borderRadius: 10, overflow: "hidden", border: `1px solid ${C.glassBrd}`, flexShrink: 0 }}>
              {(["embedded", "external"] as const).map((val, idx) => (
                <button
                  key={val}
                  onClick={() => handleSourceBrowser(val)}
                  style={{
                    padding: "9px 20px",
                    fontFamily: "'Satoshi'", fontSize: 14, fontWeight: sourceBrowser === val ? 600 : 400,
                    cursor: "pointer", border: "none", transition: "all 0.2s",
                    borderRight: idx === 0 ? `1px solid ${C.glassBrd}` : "none",
                    background: sourceBrowser === val ? `linear-gradient(135deg, ${C.rg}, ${C.rg2})` : "transparent",
                    color: sourceBrowser === val ? C.ob1 : C.tx3,
                  }}
                >
                  {val === "embedded" ? "Embedded" : "External"}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
