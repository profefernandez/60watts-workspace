"use client";

import React, { useState, useCallback } from "react";
import { C } from "../lib/colors";
import { glass, glassBtn } from "../lib/styles";
import { I } from "../lib/icons";
import type { ResearchResult } from "../lib/types";

interface ResearchPanelProps {
  workspaceId: string;
  onInsertToCanvas?: (content: string, type: "text") => void;
}

const spinKeyframes = `@keyframes _rp_spin { to { transform: rotate(360deg) } }`;

export default function ResearchPanel({
  workspaceId: _workspaceId,
  onInsertToCanvas,
}: ResearchPanelProps) {
  const [query, setQuery] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [results, setResults] = useState<ResearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  void _workspaceId;

  const doSearch = useCallback(async () => {
    if (!apiKey.trim()) {
      setError("Add your API key above to search");
      return;
    }
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResults([]);
    setSearched(true);

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), apiKey: apiKey.trim(), provider: "anthropic" }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          setError("Invalid API key — check your key");
        } else {
          setError(data.error || `Request failed (${res.status})`);
        }
        return;
      }

      if (data.error) {
        setError(data.error);
        return;
      }

      setResults(data.results || []);
    } catch {
      setError("Network error — check your connection and try again");
    } finally {
      setLoading(false);
    }
  }, [query, apiKey]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      doSearch();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", height: "100%" }}>
      <style>{spinKeyframes}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ color: C.rg }}>{I.search}</span>
        <h2
          style={{
            fontFamily: "'Clash Display', sans-serif",
            fontSize: "26px",
            fontWeight: 600,
            color: C.cr,
            margin: 0,
          }}
        >
          Research
        </h2>
      </div>

      {/* API Key input */}
      <div style={glass({ padding: "14px 16px" })}>
        <label
          style={{
            display: "block",
            fontFamily: "'Satoshi', sans-serif",
            fontSize: "13px",
            fontWeight: 500,
            color: C.tx3,
            marginBottom: "8px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          API Key
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-ant-…"
          style={{
            width: "100%",
            padding: "10px 14px",
            background: C.ob1,
            border: `1px solid ${C.glassBrd}`,
            borderRadius: "10px",
            color: C.tx,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "14px",
            outline: "none",
            boxSizing: "border-box",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = C.rg;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = C.glassBrd;
          }}
        />
      </div>

      {/* Search input */}
      <div style={{ display: "flex", gap: "10px" }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            ...glass({ padding: "10px 14px" }),
          }}
        >
          <span style={{ color: C.tx3, flexShrink: 0 }}>{I.search}</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search for research, studies, data…"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              color: C.tx,
              fontFamily: "'Satoshi', sans-serif",
              fontSize: "16px",
              outline: "none",
            }}
          />
        </div>
        <button
          onClick={doSearch}
          disabled={loading || !query.trim()}
          style={{
            ...glassBtn({
              padding: "10px 18px",
              color: C.ob1,
              background: C.rg,
              border: "none",
              fontWeight: 600,
              opacity: loading || !query.trim() ? 0.5 : 1,
            }),
          }}
        >
          {loading ? (
            <span style={{ display: "inline-flex", animation: "_rp_spin 1s linear infinite" }}>
              {I.loader}
            </span>
          ) : (
            I.send
          )}
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div
          style={glass({
            padding: "14px 18px",
            borderColor: "rgba(232,93,93,0.3)",
            background: "rgba(232,93,93,0.08)",
          })}
        >
          <p
            style={{
              margin: 0,
              fontFamily: "'Satoshi', sans-serif",
              fontSize: "16px",
              color: C.red,
            }}
          >
            {error}
          </p>
        </div>
      )}

      {/* Results area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          paddingBottom: "12px",
        }}
      >
        {/* Loading state */}
        {loading && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "14px",
              padding: "48px 0",
            }}
          >
            <span
              style={{
                color: C.rg,
                display: "inline-flex",
                animation: "_rp_spin 1s linear infinite",
              }}
            >
              {I.loader}
            </span>
            <p
              style={{
                margin: 0,
                fontFamily: "'Satoshi', sans-serif",
                fontSize: "16px",
                color: C.tx3,
              }}
            >
              Searching…
            </p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !searched && results.length === 0 && !error && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
              padding: "60px 24px",
              textAlign: "center",
            }}
          >
            <span style={{ color: C.tx4, opacity: 0.6 }}>{I.search}</span>
            <p
              style={{
                margin: 0,
                fontFamily: "'Satoshi', sans-serif",
                fontSize: "18px",
                color: C.tx3,
                lineHeight: 1.6,
                maxWidth: "360px",
              }}
            >
              Search for research, studies, and information to support your writing
            </p>
          </div>
        )}

        {/* No results after search */}
        {!loading && searched && results.length === 0 && !error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "48px 0",
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: "'Satoshi', sans-serif",
                fontSize: "16px",
                color: C.tx3,
              }}
            >
              No results found. Try a different search.
            </p>
          </div>
        )}

        {/* Result cards */}
        {!loading &&
          results.map((r, i) => (
            <ResultCard key={i} result={r} onInsert={onInsertToCanvas} />
          ))}
      </div>
    </div>
  );
}

function ResultCard({
  result,
  onInsert,
}: {
  result: ResearchResult;
  onInsert?: (content: string, type: "text") => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={glass({
        padding: "18px 20px",
        transition: "border-color 0.25s ease",
        borderColor: hovered ? `${C.rg}44` : C.glassBrd,
      })}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <h3
        style={{
          margin: "0 0 8px",
          fontFamily: "'Clash Display', sans-serif",
          fontSize: "18px",
          fontWeight: 600,
          color: C.cr,
          lineHeight: 1.4,
        }}
      >
        {result.title}
      </h3>

      <p
        style={{
          margin: "0 0 12px",
          fontFamily: "'Satoshi', sans-serif",
          fontSize: "16px",
          color: C.tx2,
          lineHeight: 1.6,
        }}
      >
        {result.summary}
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        {result.source ? (
          <a
            href={result.source.startsWith("http") ? result.source : undefined}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: "'Satoshi', sans-serif",
              fontSize: "14px",
              color: C.rg,
              textDecoration: "none",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "60%",
            }}
          >
            {result.source}
          </a>
        ) : (
          <span />
        )}

        {onInsert && (
          <button
            onClick={() => onInsert(result.summary, "text")}
            style={glassBtn({
              fontSize: "13px",
              padding: "6px 12px",
              color: C.rg,
            })}
          >
            {I.plus}
            <span>Insert to Canvas</span>
          </button>
        )}
      </div>
    </div>
  );
}
