"use client";

import React, { useState, useEffect, useCallback } from "react";
import { C } from "../lib/colors";
import { glass, glassBtn } from "../lib/styles";
import { I } from "../lib/icons";
import directus from "../lib/directus";
import type { ContextSuggestion } from "../lib/directus";
import { readItems, updateItem, deleteItem } from "@directus/sdk";

interface SuggestionDrawerProps {
  workspaceId: string;
  visible: boolean;
  onClose: () => void;
  onInsert: (content: string, sourceTitle: string) => void;
}

const SOURCE_LABELS: Record<string, string> = {
  research: "Research",
  kb: "Knowledge Base",
  youtube: "YouTube",
  web: "Web",
};

const SOURCE_COLORS: Record<string, string> = {
  research: "#8B5CF6",
  kb: C.rg,
  youtube: "#EF4444",
  web: C.green,
};

export default function SuggestionDrawer({
  workspaceId,
  visible,
  onClose,
  onInsert,
}: SuggestionDrawerProps) {
  const [suggestions, setSuggestions] = useState<ContextSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await directus.request(
        readItems("context_suggestions", {
          filter: {
            workspace_id: { _eq: workspaceId },
            status: { _neq: "dismissed" },
          },
          sort: ["-created_at"],
        })
      );
      setSuggestions(data as ContextSuggestion[]);
    } catch {
      // Directus may not have the collection yet
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (visible) fetchSuggestions();
  }, [visible, fetchSuggestions]);

  const handleAccept = async (s: ContextSuggestion) => {
    onInsert(s.content, s.title);
    try {
      await directus.request(
        updateItem("context_suggestions", s.id, {
          status: "accepted",
          applied_at: new Date().toISOString(),
        })
      );
      setSuggestions((prev) => prev.filter((x) => x.id !== s.id));
    } catch {
      // Ignore update failures
    }
  };

  const handleDismiss = async (id: string) => {
    setSuggestions((prev) => prev.filter((x) => x.id !== id));
    try {
      await directus.request(
        updateItem("context_suggestions", id, { status: "dismissed" })
      );
    } catch {
      // Ignore
    }
  };

  const handleDelete = async (id: string) => {
    setSuggestions((prev) => prev.filter((x) => x.id !== id));
    try {
      await directus.request(deleteItem("context_suggestions", id));
    } catch {
      // Ignore
    }
  };

  const filtered =
    filter === "all"
      ? suggestions
      : suggestions.filter((s) => s.source_type === filter);

  const pendingCount = suggestions.filter((s) => s.status === "pending").length;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: 420,
        maxWidth: "90vw",
        zIndex: 100,
        transform: visible ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.3s cubic-bezier(.4,0,.2,1)",
        ...glass({ borderRadius: 0, background: "#0A0C10" }),
        borderLeft: `1px solid ${C.glassBrd}`,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: `1px solid ${C.glassBrd}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: C.rg, display: "flex" }}>{I.ctx}</span>
          <span
            style={{
              fontFamily: "'Clash Display'",
              fontSize: 18,
              fontWeight: 600,
              color: C.cr,
            }}
          >
            Suggestions
          </span>
          {pendingCount > 0 && (
            <span
              style={{
                background: `${C.rg}20`,
                color: C.rg,
                fontSize: 12,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 10,
              }}
            >
              {pendingCount}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: C.tx3,
            cursor: "pointer",
            padding: 4,
            display: "flex",
          }}
        >
          {I.x}
        </button>
      </div>

      {/* Filter bar */}
      <div
        style={{
          padding: "10px 20px",
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          borderBottom: `1px solid ${C.glassBrd}`,
          flexShrink: 0,
        }}
      >
        {["all", "research", "kb", "youtube", "web"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              ...glassBtn({
                padding: "4px 12px",
                fontSize: 13,
                borderRadius: "8px",
                background: filter === f ? `${C.rg}14` : "transparent",
                color: filter === f ? C.cr : C.tx3,
                border:
                  filter === f
                    ? `1px solid ${C.rg}40`
                    : `1px solid ${C.glassBrd}`,
              }),
            }}
          >
            {f === "all" ? "All" : SOURCE_LABELS[f] || f}
          </button>
        ))}
      </div>

      {/* Suggestions list */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {loading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 40,
              gap: 10,
            }}
          >
            <span className="spin" style={{ color: C.rg, display: "flex" }}>
              {I.loader}
            </span>
            <span style={{ color: C.tx3, fontSize: 16 }}>Loading…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 40,
              gap: 12,
              opacity: 0.5,
            }}
          >
            <span style={{ color: C.tx3, display: "flex" }}>{I.ctx}</span>
            <span
              style={{
                color: C.tx3,
                fontSize: 16,
                textAlign: "center",
                fontFamily: "'Satoshi'",
              }}
            >
              No suggestions yet. Press the Context button in Canvas to find
              supporting material.
            </span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map((s) => (
              <div
                key={s.id}
                style={{
                  ...glass({ padding: "14px 16px" }),
                  borderLeft: `3px solid ${SOURCE_COLORS[s.source_type] || C.tx3}`,
                }}
              >
                {/* Source badge + title */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color:
                        SOURCE_COLORS[s.source_type] || C.tx3,
                      background: `${SOURCE_COLORS[s.source_type] || C.tx3}14`,
                      padding: "2px 8px",
                      borderRadius: 6,
                    }}
                  >
                    {SOURCE_LABELS[s.source_type] || s.source_type}
                  </span>
                  {s.status === "accepted" && (
                    <span
                      style={{
                        fontSize: 11,
                        color: C.green,
                        fontWeight: 600,
                      }}
                    >
                      Inserted
                    </span>
                  )}
                </div>

                <h4
                  style={{
                    fontFamily: "'Satoshi'",
                    fontSize: 16,
                    fontWeight: 600,
                    color: C.cr,
                    margin: "0 0 6px 0",
                  }}
                >
                  {s.title}
                </h4>

                <p
                  style={{
                    fontSize: 14,
                    color: C.tx2,
                    lineHeight: 1.5,
                    margin: "0 0 8px 0",
                  }}
                >
                  {s.content.length > 300
                    ? s.content.slice(0, 300) + "…"
                    : s.content}
                </p>

                {s.relevance_note && (
                  <p
                    style={{
                      fontSize: 13,
                      color: C.tx3,
                      fontStyle: "italic",
                      margin: "0 0 10px 0",
                    }}
                  >
                    {s.relevance_note}
                  </p>
                )}

                {/* Actions */}
                {s.status === "pending" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => handleAccept(s)}
                      style={{
                        padding: "5px 14px",
                        borderRadius: 8,
                        border: "none",
                        background: `linear-gradient(135deg, ${C.rg}, ${C.rg2})`,
                        color: C.ob1,
                        fontSize: 13,
                        fontWeight: 600,
                        fontFamily: "'Satoshi'",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {I.plus} Insert
                    </button>
                    <button
                      onClick={() => handleDismiss(s.id)}
                      style={{
                        padding: "5px 14px",
                        borderRadius: 8,
                        border: `1px solid ${C.glassBrd}`,
                        background: "transparent",
                        color: C.tx3,
                        fontSize: 13,
                        fontFamily: "'Satoshi'",
                        cursor: "pointer",
                      }}
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      style={{
                        padding: "5px 8px",
                        borderRadius: 8,
                        border: "none",
                        background: "transparent",
                        color: C.tx4,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {I.trash}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
