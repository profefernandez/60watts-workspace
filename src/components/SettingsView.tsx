"use client";

import React, { useState, useEffect, useCallback } from "react";
import { C } from "../lib/colors";
import { glass } from "../lib/styles";

// ── Types ──

interface ProviderStatus {
  anthropic: boolean;
  launchlemonade: boolean;
  perplexity: boolean;
  youtube: boolean;
  pubmed: boolean;
}

type ProviderKey = keyof ProviderStatus;

interface ProviderConfig {
  key: ProviderKey;
  name: string;
  description: string;
  fields: FieldConfig[];
}

interface FieldConfig {
  name: string;
  label: string;
  type: "password" | "text";
  placeholder: string;
  bodyKey: string;
}

// ── Provider definitions ──

const PROVIDERS: ProviderConfig[] = [
  {
    key: "launchlemonade",
    name: "LaunchLemonade",
    description:
      "AI assistant platform. Requires an API key and Agent ID to connect your custom assistant.",
    fields: [
      {
        name: "api_key",
        label: "API Key",
        type: "password",
        placeholder: "Paste your API key",
        bodyKey: "api_key",
      },
      {
        name: "agent_id",
        label: "Agent ID",
        type: "text",
        placeholder: "Agent ID (e.g., agent_abc123)",
        bodyKey: "agent_id",
      },
    ],
  },
  {
    key: "anthropic",
    name: "Anthropic",
    description:
      "Powers Profé AI chat and research. Requires a Claude API key from console.anthropic.com.",
    fields: [
      {
        name: "api_key",
        label: "API Key",
        type: "password",
        placeholder: "Paste your Anthropic API key",
        bodyKey: "api_key",
      },
    ],
  },
  {
    key: "perplexity",
    name: "Perplexity",
    description:
      "Web-connected AI search. Requires an API key from perplexity.ai.",
    fields: [
      {
        name: "api_key",
        label: "API Key",
        type: "password",
        placeholder: "Paste your Perplexity API key",
        bodyKey: "api_key",
      },
    ],
  },
  {
    key: "youtube",
    name: "YouTube Data API",
    description:
      "Search and embed YouTube videos. Requires a Google Cloud API key with YouTube Data API v3 enabled.",
    fields: [
      {
        name: "api_key",
        label: "API Key",
        type: "password",
        placeholder: "Paste your YouTube Data API key",
        bodyKey: "api_key",
      },
    ],
  },
  {
    key: "pubmed",
    name: "PubMed / Custom Research",
    description:
      "PubMed is free — no API key required for basic searches. NCBI registered users get higher rate limits.",
    fields: [
      {
        name: "api_key",
        label: "API Key (optional)",
        type: "password",
        placeholder: "NCBI API key for higher rate limits",
        bodyKey: "api_key",
      },
      {
        name: "base_url",
        label: "Custom API Base URL (optional)",
        type: "text",
        placeholder: "https://custom-research-api.example.com",
        bodyKey: "base_url",
      },
    ],
  },
];

const DIRECTUS_URL =
  process.env.NEXT_PUBLIC_DIRECTUS_URL || "http://localhost:8055";

// ── Component ──

interface SettingsViewProps {
  workspaceId?: string;
}

export default function SettingsView({ workspaceId }: SettingsViewProps) {
  const [statuses, setStatuses] = useState<ProviderStatus>({
    anthropic: false,
    launchlemonade: false,
    perplexity: false,
    youtube: false,
    pubmed: false,
  });
  const [editing, setEditing] = useState<Record<ProviderKey, boolean>>({
    anthropic: false,
    launchlemonade: false,
    perplexity: false,
    youtube: false,
    pubmed: false,
  });
  const [fieldValues, setFieldValues] = useState<
    Record<string, string>
  >({});
  const [saving, setSaving] = useState<ProviderKey | null>(null);
  const [message, setMessage] = useState<{
    provider: ProviderKey;
    text: string;
    isError: boolean;
  } | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  // Suppress unused var warning — workspaceId reserved for future workspace-level settings
  void workspaceId;

  // ── Fetch provider statuses ──
  const fetchStatus = useCallback(async () => {
    try {
      setStatusLoading(true);
      const res = await fetch(`${DIRECTUS_URL}/workspace/settings/status`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setStatuses(data.providers);
      }
    } catch {
      // Silently fail — statuses will show as unconfigured
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // ── Clear message after delay ──
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(t);
  }, [message]);

  // ── Handle field change ──
  const handleFieldChange = (provider: ProviderKey, field: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [`${provider}_${field}`]: value }));
  };

  // ── Handle save ──
  const handleSave = async (provider: ProviderConfig) => {
    const apiKey = fieldValues[`${provider.key}_api_key`];
    if (!apiKey && provider.key !== "pubmed") {
      setMessage({ provider: provider.key, text: "API key is required.", isError: true });
      return;
    }

    setSaving(provider.key);

    const body: Record<string, string> = { provider: provider.key };
    for (const field of provider.fields) {
      const val = fieldValues[`${provider.key}_${field.name}`];
      if (val) {
        body[field.bodyKey] = val;
      }
    }

    // For pubmed without an API key, skip
    if (!body.api_key) {
      setSaving(null);
      setMessage({ provider: provider.key, text: "No key to save.", isError: true });
      return;
    }

    try {
      const res = await fetch(`${DIRECTUS_URL}/workspace/settings/api-key`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        // Clear field values after successful save
        const clearedFields: Record<string, string> = {};
        for (const field of provider.fields) {
          clearedFields[`${provider.key}_${field.name}`] = "";
        }
        setFieldValues((prev) => ({ ...prev, ...clearedFields }));

        setStatuses((prev) => ({ ...prev, [provider.key]: true }));
        setEditing((prev) => ({ ...prev, [provider.key]: false }));
        setMessage({ provider: provider.key, text: "Connected successfully.", isError: false });
      } else {
        const err = await res.json().catch(() => ({ error: "Save failed." }));
        setMessage({ provider: provider.key, text: err.error || "Save failed.", isError: true });
      }
    } catch {
      setMessage({ provider: provider.key, text: "Network error. Please try again.", isError: true });
    } finally {
      setSaving(null);
    }
  };

  // ── Handle "Change Key" ──
  const handleChangeKey = (providerKey: ProviderKey) => {
    setEditing((prev) => ({ ...prev, [providerKey]: true }));
  };

  const isConnected = (providerKey: ProviderKey) => statuses[providerKey];
  const showFields = (providerKey: ProviderKey) =>
    !isConnected(providerKey) || editing[providerKey];

  return (
    <div
      style={{
        padding: "32px",
        maxWidth: 720,
        margin: "0 auto",
        fontFamily: "'Satoshi'",
        color: C.tx,
      }}
    >
      {/* Header */}
      <h1
        style={{
          fontFamily: "'Clash Display'",
          fontSize: 28,
          fontWeight: 600,
          color: C.cr,
          marginBottom: 8,
        }}
      >
        Settings
      </h1>
      <p
        style={{
          fontSize: 16,
          color: C.tx3,
          marginBottom: 32,
          fontFamily: "'Satoshi'",
        }}
      >
        Manage your API keys and provider connections. Keys are stored securely
        and never displayed after saving.
      </p>

      {/* Loading state */}
      {statusLoading && (
        <div
          style={{
            textAlign: "center",
            padding: 40,
            color: C.tx3,
            fontSize: 16,
            fontFamily: "'Satoshi'",
          }}
        >
          Loading provider status...
        </div>
      )}

      {/* Provider cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {PROVIDERS.map((provider) => {
          const connected = isConnected(provider.key);
          const showForm = showFields(provider.key);
          const providerMessage =
            message && message.provider === provider.key ? message : null;
          const isSaving = saving === provider.key;

          return (
            <div
              key={provider.key}
              style={{
                ...glass({ padding: "24px" }),
              }}
            >
              {/* Provider header row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: showForm ? 20 : 0,
                }}
              >
                <div>
                  <h2
                    style={{
                      fontFamily: "'Clash Display'",
                      fontSize: 20,
                      fontWeight: 600,
                      color: C.cr,
                      margin: 0,
                      marginBottom: 4,
                    }}
                  >
                    {provider.name}
                  </h2>
                  <p
                    style={{
                      fontSize: 14,
                      color: C.tx3,
                      margin: 0,
                      fontFamily: "'Satoshi'",
                      lineHeight: 1.5,
                    }}
                  >
                    {provider.description}
                  </p>
                </div>

                {/* Status indicator */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexShrink: 0,
                    marginLeft: 16,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: connected ? C.green : C.tx4,
                      boxShadow: connected
                        ? `0 0 8px ${C.green}60`
                        : "none",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 14,
                      color: connected ? C.green : C.tx4,
                      fontFamily: "'Satoshi'",
                      fontWeight: 500,
                    }}
                  >
                    {connected ? "Connected" : "Not configured"}
                  </span>
                </div>
              </div>

              {/* Fields */}
              {showForm && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                  }}
                >
                  {provider.key === "launchlemonade" && (
                    <p
                      style={{
                        fontSize: 13,
                        color: C.tx4,
                        margin: 0,
                        fontFamily: "'Satoshi'",
                        fontStyle: "italic",
                      }}
                    >
                      Agent IDs are workspace-specific
                    </p>
                  )}

                  {provider.fields.map((field) => (
                    <div key={field.name}>
                      <label
                        style={{
                          display: "block",
                          fontSize: 13,
                          color: C.tx3,
                          marginBottom: 6,
                          fontFamily: "'Satoshi'",
                          fontWeight: 500,
                        }}
                      >
                        {field.label}
                      </label>
                      <input
                        type={field.type}
                        placeholder={field.placeholder}
                        value={
                          fieldValues[`${provider.key}_${field.name}`] || ""
                        }
                        onChange={(e) =>
                          handleFieldChange(
                            provider.key,
                            field.name,
                            e.target.value
                          )
                        }
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          background: C.ob1,
                          border: `1px solid ${C.ob6}`,
                          borderRadius: 10,
                          color: C.tx,
                          fontSize: 15,
                          fontFamily: "'JetBrains Mono'",
                          outline: "none",
                          boxSizing: "border-box",
                          transition: "border-color 0.2s",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = C.rg;
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = C.ob6;
                        }}
                      />
                    </div>
                  ))}

                  {/* Action row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginTop: 4,
                    }}
                  >
                    <button
                      onClick={() => handleSave(provider)}
                      disabled={isSaving}
                      style={{
                        padding: "10px 24px",
                        background: `linear-gradient(135deg, ${C.rg}, ${C.rg2})`,
                        border: "none",
                        borderRadius: 10,
                        color: C.ob1,
                        fontSize: 15,
                        fontWeight: 600,
                        fontFamily: "'Satoshi'",
                        cursor: isSaving ? "wait" : "pointer",
                        opacity: isSaving ? 0.7 : 1,
                        transition: "all 0.2s",
                      }}
                    >
                      {isSaving ? "Saving..." : "Save"}
                    </button>

                    {connected && editing[provider.key] && (
                      <button
                        onClick={() =>
                          setEditing((prev) => ({
                            ...prev,
                            [provider.key]: false,
                          }))
                        }
                        style={{
                          padding: "10px 20px",
                          background: "transparent",
                          border: `1px solid ${C.glassBrd}`,
                          borderRadius: 10,
                          color: C.tx3,
                          fontSize: 15,
                          fontFamily: "'Satoshi'",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                      >
                        Cancel
                      </button>
                    )}

                    {/* Message */}
                    {providerMessage && (
                      <span
                        style={{
                          fontSize: 14,
                          color: providerMessage.isError ? C.red : C.green,
                          fontFamily: "'Satoshi'",
                          fontWeight: 500,
                        }}
                      >
                        {providerMessage.text}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Change Key button when connected and not editing */}
              {connected && !editing[provider.key] && (
                <div style={{ marginTop: 16 }}>
                  <button
                    onClick={() => handleChangeKey(provider.key)}
                    style={{
                      padding: "8px 18px",
                      background: "transparent",
                      border: `1px solid ${C.glassBrd}`,
                      borderRadius: 10,
                      color: C.tx3,
                      fontSize: 14,
                      fontFamily: "'Satoshi'",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    Change Key
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
