"use client";

import React, { useState, useEffect, useCallback } from "react";
import { C } from "../lib/colors";
import { glass } from "../lib/styles";

// ── Types ────────────────────────────────────────────────────────────────────

interface ProviderStatusInfo {
  connected: boolean;
  hint: string | null;
  extra_hint?: string | null;
  health: "healthy" | "degraded" | "down";
  health_message: string | null;
}

type ProviderKey = "anthropic" | "launchlemonade" | "ll_search" | "perplexity" | "youtube" | "pubmed" | "blotato";

// ── Agent team config ────────────────────────────────────────────────────────

const AGENT_ROLES = [
  { id: "profe", label: "Profé", role: "Chat", description: "Conversational AI — your main assistant" },
  { id: "scholar", label: "Scholar", role: "KB Librarian", description: "Manages the Knowledge Base, finds documents" },
  { id: "context", label: "Context", role: "Monitor", description: "Watches workspaces, flags conflicts and insights" },
  { id: "ludo", label: "Ludo", role: "Handoff", description: "Packages workspaces into shareable deliverables" },
] as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

function healthDot(info: ProviderStatusInfo | undefined): React.CSSProperties {
  const connected = info?.connected;
  const health = info?.health || "healthy";
  const color = !connected ? C.tx4 : health === "healthy" ? C.green : health === "degraded" ? "#F5A623" : C.red;
  return {
    width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0,
    boxShadow: connected && health === "healthy" ? `0 0 8px ${C.green}60` : "none",
  };
}

function statusText(info: ProviderStatusInfo | undefined): { text: string; color: string } {
  if (!info?.connected) return { text: "Not configured", color: C.tx4 };
  if (info.health === "healthy") return { text: "Connected", color: C.green };
  if (info.health === "degraded") return { text: "Slow", color: "#F5A623" };
  return { text: info.health_message || "Unreachable", color: C.red };
}

// ── Styles ───────────────────────────────────────────────────────────────────

const sectionTitle: React.CSSProperties = {
  fontFamily: "'Clash Display'", fontSize: 24, fontWeight: 700, color: C.cr,
  margin: 0, marginBottom: 4, letterSpacing: "-0.02em",
};

const sectionDesc: React.CSSProperties = {
  fontSize: 16, color: C.tx3, margin: 0, marginBottom: 24, fontFamily: "'Satoshi'", lineHeight: 1.5,
};

const sectionDivider: React.CSSProperties = {
  borderTop: `1px solid ${C.glassBrd}`, margin: "40px 0",
};

const cardStyle = glass({ padding: "24px" });

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", background: C.ob1,
  border: `1px solid ${C.ob6}`, borderRadius: 10, color: C.tx,
  fontSize: 15, fontFamily: "'JetBrains Mono'", outline: "none",
  boxSizing: "border-box", transition: "border-color 0.2s",
};

const saveBtnStyle: React.CSSProperties = {
  padding: "10px 24px", background: `linear-gradient(135deg, ${C.rg}, ${C.rg2})`,
  border: "none", borderRadius: 10, color: C.ob1, fontSize: 15, fontWeight: 600,
  fontFamily: "'Satoshi'", cursor: "pointer", transition: "all 0.2s",
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: "8px 18px", background: "transparent", border: `1px solid ${C.glassBrd}`,
  borderRadius: 10, color: C.tx3, fontSize: 14, fontFamily: "'Satoshi'", cursor: "pointer",
};

const disconnectBtnStyle: React.CSSProperties = {
  padding: "8px 18px", background: "transparent", border: "1px solid rgba(255,80,80,0.3)",
  borderRadius: 10, color: C.red, fontSize: 14, fontFamily: "'Satoshi'", cursor: "pointer",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 14, color: C.tx3, marginBottom: 6, fontFamily: "'Satoshi'", fontWeight: 500,
};

const hintStyle: React.CSSProperties = {
  fontSize: 14, color: C.tx3, fontFamily: "'JetBrains Mono'",
};

// ── Component ────────────────────────────────────────────────────────────────

interface SettingsViewProps { workspaceId?: string; }

export default function SettingsView({ workspaceId }: SettingsViewProps) {
  void workspaceId;

  // Provider statuses
  const [statuses, setStatuses] = useState<Record<ProviderKey, ProviderStatusInfo>>({
    anthropic: { connected: false, hint: null, health: "healthy", health_message: null },
    launchlemonade: { connected: false, hint: null, health: "healthy", health_message: null },
    ll_search: { connected: false, hint: null, health: "healthy", health_message: null },
    perplexity: { connected: false, hint: null, health: "healthy", health_message: null },
    youtube: { connected: false, hint: null, health: "healthy", health_message: null },
    pubmed: { connected: false, hint: null, health: "healthy", health_message: null },
    blotato: { connected: false, hint: null, health: "healthy", health_message: null },
  });

  // Field values for all inputs
  const [fields, setFields] = useState<Record<string, string>>({});
  // Which providers are in edit mode
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  // Saving state
  const [saving, setSaving] = useState<string | null>(null);
  // Toast message
  const [message, setMessage] = useState<{ key: string; text: string; isError: boolean } | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  // Agent IDs (localStorage for now)
  const [agentIds, setAgentIds] = useState<Record<string, string>>({});
  // Preferences
  const [extractionStyle, setExtractionStyle] = useState<"light" | "full">("light");
  const [sourceBrowser, setSourceBrowser] = useState<"embedded" | "external">("embedded");

  // ── Fetch status ─────────────────────────────────────────────────────────

  const fetchStatus = useCallback(async () => {
    try {
      setStatusLoading(true);
      const res = await fetch("/api/settings/status", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setStatuses((prev) => ({ ...prev, ...data.providers }));
      }
    } catch {} finally { setStatusLoading(false); }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);
  useEffect(() => { const i = setInterval(fetchStatus, 30_000); return () => clearInterval(i); }, [fetchStatus]);
  useEffect(() => { if (!message) return; const t = setTimeout(() => setMessage(null), 4000); return () => clearTimeout(t); }, [message]);

  // Load local prefs + agent IDs
  useEffect(() => {
    const es = localStorage.getItem("60w_extraction_style");
    const sb = localStorage.getItem("60w_source_browser");
    if (es === "light" || es === "full") setExtractionStyle(es);
    if (sb === "embedded" || sb === "external") setSourceBrowser(sb);

    // Load saved agent IDs
    const saved = localStorage.getItem("60w_agent_ids");
    if (saved) try { setAgentIds(JSON.parse(saved)); } catch {}
  }, []);

  // ── Save / disconnect handlers ───────────────────────────────────────────

  const handleSave = async (providerKey: string, bodyFields: Record<string, string>) => {
    setSaving(providerKey);
    const body: Record<string, string> = { provider: providerKey, ...bodyFields };
    try {
      const res = await fetch("/api/settings/keys", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setStatuses((prev) => ({
          ...prev,
          [providerKey]: { connected: true, hint: data.key_hint, extra_hint: data.extra_hint, health: "healthy", health_message: null },
        }));
        setEditing((prev) => ({ ...prev, [providerKey]: false }));
        // Clear input fields
        const cleared: Record<string, string> = {};
        Object.keys(fields).filter((k) => k.startsWith(providerKey)).forEach((k) => { cleared[k] = ""; });
        setFields((prev) => ({ ...prev, ...cleared }));
        setMessage({ key: providerKey, text: "Connected successfully.", isError: false });
      } else {
        const err = await res.json().catch(() => ({ error: "Save failed." }));
        setMessage({ key: providerKey, text: err.error || "Save failed.", isError: true });
      }
    } catch { setMessage({ key: providerKey, text: "Network error.", isError: true }); }
    finally { setSaving(null); }
  };

  const handleDisconnect = async (providerKey: string) => {
    try {
      const res = await fetch("/api/settings/keys", {
        method: "DELETE", credentials: "include",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: providerKey }),
      });
      if (res.ok) {
        setStatuses((prev) => ({
          ...prev,
          [providerKey]: { connected: false, hint: null, health: "healthy", health_message: null },
        }));
        setEditing((prev) => ({ ...prev, [providerKey]: false }));
        setMessage({ key: providerKey, text: "Disconnected.", isError: false });
      }
    } catch { setMessage({ key: providerKey, text: "Failed to disconnect.", isError: true }); }
  };

  const handleAgentIdSave = (agentKey: string, value: string) => {
    const updated = { ...agentIds, [agentKey]: value };
    setAgentIds(updated);
    localStorage.setItem("60w_agent_ids", JSON.stringify(updated));
    setMessage({ key: `agent_${agentKey}`, text: "Agent ID saved.", isError: false });
  };

  const setField = (key: string, val: string) => setFields((prev) => ({ ...prev, [key]: val }));

  // ── Render helpers ───────────────────────────────────────────────────────

  const renderStatus = (providerKey: ProviderKey) => {
    const info = statuses[providerKey];
    const s = statusText(info);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <div style={healthDot(info)} />
        <span style={{ fontSize: 14, color: s.color, fontFamily: "'Satoshi'", fontWeight: 500 }}>{s.text}</span>
      </div>
    );
  };

  const renderMessage = (key: string) => {
    if (!message || message.key !== key) return null;
    return <span style={{ fontSize: 14, color: message.isError ? C.red : C.green, fontFamily: "'Satoshi'", fontWeight: 500 }}>{message.text}</span>;
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: "32px", maxWidth: 800, margin: "0 auto", fontFamily: "'Satoshi'", color: C.tx }}>

      <h1 style={{ fontFamily: "'Clash Display'", fontSize: 32, fontWeight: 700, color: C.cr, marginBottom: 8, letterSpacing: "-0.02em" }}>
        Settings
      </h1>
      <p style={{ fontSize: 18, color: C.tx3, marginBottom: 40, fontFamily: "'Satoshi'" }}>
        Manage your platform, AI team, and preferences.
      </p>

      {statusLoading && (
        <div style={{ textAlign: "center", padding: 40, color: C.tx3, fontSize: 16 }}>Loading provider status...</div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 1: Platform API
          ════════════════════════════════════════════════════════════════════ */}
      <section>
        <h2 style={sectionTitle}>Platform API</h2>
        <p style={sectionDesc}>
          Connect LaunchLemonade to power the AI team. One API key, multiple agents.
        </p>

        {/* LaunchLemonade API Key */}
        <div style={{ ...cardStyle, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <h3 style={{ fontFamily: "'Clash Display'", fontSize: 20, fontWeight: 600, color: C.cr, margin: 0, marginBottom: 4 }}>
                LaunchLemonade
              </h3>
              <p style={{ fontSize: 14, color: C.tx3, margin: 0, lineHeight: 1.5 }}>
                AI assistant platform. One API key connects all your agents.
              </p>
            </div>
            {renderStatus("launchlemonade")}
          </div>

          {statuses.launchlemonade?.connected && !editing.launchlemonade ? (
            <>
              {statuses.launchlemonade.hint && (
                <div style={{ ...hintStyle, marginBottom: 12 }}>
                  API Key: <span style={{ color: C.tx4 }}>{statuses.launchlemonade.hint}</span>
                </div>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setEditing((p) => ({ ...p, launchlemonade: true }))} style={secondaryBtnStyle}>Change Key</button>
                <button onClick={() => handleDisconnect("launchlemonade")} style={disconnectBtnStyle}>Disconnect</button>
              </div>
              {renderMessage("launchlemonade")}
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>API Key</label>
                <input
                  type="password" placeholder="Paste your LaunchLemonade API key"
                  value={fields.ll_key || ""} onChange={(e) => setField("ll_key", e.target.value)}
                  autoComplete="new-password" data-1p-ignore="true" onCopy={(e) => e.preventDefault()}
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = C.rg; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = C.ob6; }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  onClick={() => {
                    if (!fields.ll_key) { setMessage({ key: "launchlemonade", text: "API key is required.", isError: true }); return; }
                    handleSave("launchlemonade", { api_key: fields.ll_key });
                  }}
                  disabled={saving === "launchlemonade"}
                  style={{ ...saveBtnStyle, opacity: saving === "launchlemonade" ? 0.7 : 1 }}
                >
                  {saving === "launchlemonade" ? "Saving..." : "Connect"}
                </button>
                {statuses.launchlemonade?.connected && (
                  <button onClick={() => setEditing((p) => ({ ...p, launchlemonade: false }))} style={secondaryBtnStyle}>Cancel</button>
                )}
                {renderMessage("launchlemonade")}
              </div>
            </div>
          )}
        </div>

        {/* AI Team — Agent Assignments */}
        <div style={cardStyle}>
          <h3 style={{ fontFamily: "'Clash Display'", fontSize: 20, fontWeight: 600, color: C.cr, margin: 0, marginBottom: 4 }}>
            AI Team
          </h3>
          <p style={{ fontSize: 14, color: C.tx3, margin: 0, marginBottom: 20, lineHeight: 1.5 }}>
            Assign LaunchLemonade agent IDs to each team member. Each agent has a specific role.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {AGENT_ROLES.map((agent) => (
              <div
                key={agent.id}
                style={{
                  display: "flex", alignItems: "center", gap: 16, padding: "16px 20px",
                  background: "rgba(255,255,255,0.02)", borderRadius: 12,
                  border: `1px solid ${C.glassBrd}`,
                }}
              >
                {/* Agent info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontFamily: "'Clash Display'", fontSize: 16, fontWeight: 600, color: C.cr }}>
                      {agent.label}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: C.rg, textTransform: "uppercase",
                      letterSpacing: "0.06em", padding: "2px 8px", borderRadius: 6,
                      background: "rgba(232,168,124,0.1)",
                    }}>
                      {agent.role}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: C.tx4, lineHeight: 1.4 }}>{agent.description}</div>
                </div>

                {/* Agent ID input */}
                <div style={{ width: 220, flexShrink: 0 }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      type="text"
                      placeholder="lemonade_id"
                      value={fields[`agent_${agent.id}`] ?? agentIds[agent.id] ?? ""}
                      onChange={(e) => setField(`agent_${agent.id}`, e.target.value)}
                      style={{
                        ...inputStyle, fontSize: 13, padding: "8px 10px",
                        fontFamily: "'JetBrains Mono'",
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = C.rg; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = C.ob6; }}
                    />
                    <button
                      onClick={() => {
                        const val = fields[`agent_${agent.id}`] ?? agentIds[agent.id] ?? "";
                        if (val.trim()) handleAgentIdSave(agent.id, val.trim());
                      }}
                      style={{
                        padding: "8px 12px", borderRadius: 8, border: "none",
                        background: `rgba(232,168,124,0.15)`, color: C.rg,
                        fontSize: 12, fontWeight: 600, fontFamily: "'Satoshi'",
                        cursor: "pointer", whiteSpace: "nowrap",
                      }}
                    >
                      Save
                    </button>
                  </div>
                  {/* Status dot */}
                  <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: agentIds[agent.id] ? C.green : C.tx4,
                    }} />
                    <span style={{ fontSize: 11, color: agentIds[agent.id] ? C.green : C.tx4 }}>
                      {agentIds[agent.id] ? "Configured" : "Not set"}
                    </span>
                  </div>
                  {renderMessage(`agent_${agent.id}`)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div style={sectionDivider} />

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 2: Image Generation
          ════════════════════════════════════════════════════════════════════ */}
      <section>
        <h2 style={sectionTitle}>Image Generation</h2>
        <p style={sectionDesc}>
          Connect an image generation service for the Design Studio.
        </p>

        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <h3 style={{ fontFamily: "'Clash Display'", fontSize: 20, fontWeight: 600, color: C.cr, margin: 0, marginBottom: 4 }}>
                Blotato
              </h3>
              <p style={{ fontSize: 14, color: C.tx3, margin: 0, lineHeight: 1.5 }}>
                AI image generation for the Design Studio. Generate images from prompts directly on the canvas.
              </p>
            </div>
            {renderStatus("blotato")}
          </div>

          {statuses.blotato?.connected && !editing.blotato ? (
            <>
              {statuses.blotato.hint && (
                <div style={{ ...hintStyle, marginBottom: 12 }}>
                  API Key: <span style={{ color: C.tx4 }}>{statuses.blotato.hint}</span>
                </div>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setEditing((p) => ({ ...p, blotato: true }))} style={secondaryBtnStyle}>Change Key</button>
                <button onClick={() => handleDisconnect("blotato")} style={disconnectBtnStyle}>Disconnect</button>
              </div>
              {renderMessage("blotato")}
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>API Key</label>
                <input
                  type="password" placeholder="Paste your Blotato API key"
                  value={fields.blotato_key || ""} onChange={(e) => setField("blotato_key", e.target.value)}
                  autoComplete="new-password" data-1p-ignore="true" onCopy={(e) => e.preventDefault()}
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = C.rg; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = C.ob6; }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  onClick={() => {
                    if (!fields.blotato_key) { setMessage({ key: "blotato", text: "API key is required.", isError: true }); return; }
                    handleSave("blotato", { api_key: fields.blotato_key });
                  }}
                  disabled={saving === "blotato"}
                  style={{ ...saveBtnStyle, opacity: saving === "blotato" ? 0.7 : 1 }}
                >
                  {saving === "blotato" ? "Saving..." : "Connect"}
                </button>
                {statuses.blotato?.connected && (
                  <button onClick={() => setEditing((p) => ({ ...p, blotato: false }))} style={secondaryBtnStyle}>Cancel</button>
                )}
                {renderMessage("blotato")}
              </div>
            </div>
          )}
        </div>
      </section>

      <div style={sectionDivider} />

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 3: Research & Search
          ════════════════════════════════════════════════════════════════════ */}
      <section>
        <h2 style={sectionTitle}>Research & Search</h2>
        <p style={sectionDesc}>
          API keys for research, web search, and video search capabilities.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Anthropic */}
          {renderProviderCard("anthropic", "Anthropic", "Powers Profé AI chat and research via Claude.", "api_key", "API Key", "Paste your Anthropic API key")}

          {/* Perplexity */}
          {renderProviderCard("perplexity", "Perplexity", "Web-connected AI search for the Research panel.", "api_key", "API Key", "Paste your Perplexity API key")}

          {/* YouTube */}
          {renderProviderCard("youtube", "YouTube Data API", "Search and embed YouTube videos in the Video Library.", "api_key", "API Key", "Paste your YouTube Data API key")}

          {/* PubMed */}
          <div style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div>
                <h3 style={{ fontFamily: "'Clash Display'", fontSize: 20, fontWeight: 600, color: C.cr, margin: 0, marginBottom: 4 }}>PubMed</h3>
                <p style={{ fontSize: 14, color: C.tx3, margin: 0, lineHeight: 1.5 }}>
                  Free by default. NCBI API key is optional for higher rate limits.
                </p>
              </div>
              {renderStatus("pubmed")}
            </div>
            {!editing.pubmed && !statuses.pubmed?.connected ? (
              <button onClick={() => setEditing((p) => ({ ...p, pubmed: true }))} style={{ ...secondaryBtnStyle, marginTop: 8, fontSize: 13 }}>
                Add API key (optional)
              </button>
            ) : editing.pubmed ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12 }}>
                <div>
                  <label style={labelStyle}>API Key (optional)</label>
                  <input
                    type="password" placeholder="NCBI API key for higher rate limits"
                    value={fields.pubmed_key || ""} onChange={(e) => setField("pubmed_key", e.target.value)}
                    autoComplete="new-password" data-1p-ignore="true" onCopy={(e) => e.preventDefault()}
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = C.rg; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = C.ob6; }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button
                    onClick={() => handleSave("pubmed", { api_key: fields.pubmed_key || "" })}
                    disabled={saving === "pubmed"}
                    style={{ ...saveBtnStyle, opacity: saving === "pubmed" ? 0.7 : 1 }}
                  >
                    {saving === "pubmed" ? "Saving..." : "Save"}
                  </button>
                  <button onClick={() => setEditing((p) => ({ ...p, pubmed: false }))} style={secondaryBtnStyle}>Cancel</button>
                  {renderMessage("pubmed")}
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                <button onClick={() => setEditing((p) => ({ ...p, pubmed: true }))} style={secondaryBtnStyle}>Change Key</button>
                <button onClick={() => handleDisconnect("pubmed")} style={disconnectBtnStyle}>Disconnect</button>
              </div>
            )}
          </div>
        </div>
      </section>

      <div style={sectionDivider} />

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 4: Preferences
          ════════════════════════════════════════════════════════════════════ */}
      <section>
        <h2 style={sectionTitle}>Preferences</h2>
        <p style={sectionDesc}>
          Local settings stored in your browser.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Extraction Style */}
          <div style={{ ...cardStyle, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.tx, marginBottom: 4 }}>Extraction Style</div>
              <div style={{ fontSize: 14, color: C.tx3 }}>How much the AI rewrites content pulled from sources</div>
            </div>
            <div style={{ display: "flex", gap: 0, borderRadius: 10, overflow: "hidden", border: `1px solid ${C.glassBrd}`, flexShrink: 0 }}>
              {(["light", "full"] as const).map((val, idx) => (
                <button
                  key={val}
                  onClick={() => { setExtractionStyle(val); localStorage.setItem("60w_extraction_style", val); }}
                  style={{
                    padding: "9px 20px", fontFamily: "'Satoshi'", fontSize: 14,
                    fontWeight: extractionStyle === val ? 600 : 400,
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
          <div style={{ ...cardStyle, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.tx, marginBottom: 4 }}>Source Browser</div>
              <div style={{ fontSize: 14, color: C.tx3 }}>Where source links open when reviewing search results</div>
            </div>
            <div style={{ display: "flex", gap: 0, borderRadius: 10, overflow: "hidden", border: `1px solid ${C.glassBrd}`, flexShrink: 0 }}>
              {(["embedded", "external"] as const).map((val, idx) => (
                <button
                  key={val}
                  onClick={() => { setSourceBrowser(val); localStorage.setItem("60w_source_browser", val); }}
                  style={{
                    padding: "9px 20px", fontFamily: "'Satoshi'", fontSize: 14,
                    fontWeight: sourceBrowser === val ? 600 : 400,
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
      </section>

      <div style={{ height: 60 }} />
    </div>
  );

  // ── Reusable provider card (for Research & Search section) ────────────────

  function renderProviderCard(
    providerKey: ProviderKey,
    name: string,
    description: string,
    fieldKey: string,
    fieldLabel: string,
    placeholder: string
  ) {
    const info = statuses[providerKey];
    const isEditing = editing[providerKey];
    const isSaving = saving === providerKey;

    return (
      <div key={providerKey} style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: info?.connected && !isEditing ? 0 : 16 }}>
          <div>
            <h3 style={{ fontFamily: "'Clash Display'", fontSize: 20, fontWeight: 600, color: C.cr, margin: 0, marginBottom: 4 }}>{name}</h3>
            <p style={{ fontSize: 14, color: C.tx3, margin: 0, lineHeight: 1.5 }}>{description}</p>
          </div>
          {renderStatus(providerKey)}
        </div>

        {info?.connected && !isEditing ? (
          <>
            {info.hint && (
              <div style={{ ...hintStyle, marginTop: 12, marginBottom: 12 }}>
                {fieldLabel}: <span style={{ color: C.tx4 }}>{info.hint}</span>
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: info.hint ? 0 : 12 }}>
              <button onClick={() => setEditing((p) => ({ ...p, [providerKey]: true }))} style={secondaryBtnStyle}>Change Key</button>
              <button onClick={() => handleDisconnect(providerKey)} style={disconnectBtnStyle}>Disconnect</button>
            </div>
            {renderMessage(providerKey)}
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>{fieldLabel}</label>
              <input
                type="password" placeholder={placeholder}
                value={fields[`${providerKey}_${fieldKey}`] || ""}
                onChange={(e) => setField(`${providerKey}_${fieldKey}`, e.target.value)}
                autoComplete="new-password" data-1p-ignore="true" onCopy={(e) => e.preventDefault()}
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = C.rg; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = C.ob6; }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                onClick={() => {
                  const val = fields[`${providerKey}_${fieldKey}`];
                  if (!val) { setMessage({ key: providerKey, text: `${fieldLabel} is required.`, isError: true }); return; }
                  handleSave(providerKey, { [fieldKey]: val });
                }}
                disabled={isSaving}
                style={{ ...saveBtnStyle, opacity: isSaving ? 0.7 : 1 }}
              >
                {isSaving ? "Saving..." : "Connect"}
              </button>
              {info?.connected && (
                <button onClick={() => setEditing((p) => ({ ...p, [providerKey]: false }))} style={secondaryBtnStyle}>Cancel</button>
              )}
              {renderMessage(providerKey)}
            </div>
          </div>
        )}
      </div>
    );
  }
}
