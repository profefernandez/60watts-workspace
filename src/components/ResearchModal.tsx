"use client";
import React, { useState, useRef, useCallback } from "react";
import { C, I, glass, glassBtn } from "@/lib";
import type { CSSProperties } from "react";

// ── Extended result type for PubMed fields ──
interface ExtendedResearchResult {
  title: string;
  summary: string;
  source: string;
  article?: string;
  authors?: string;
  journal?: string;
  pmid?: string;
}

type ResearchProvider = "anthropic" | "pubmed" | "custom";

interface ResearchModalProps {
  open: boolean;
  onClose: () => void;
  onAddToCanvas: (content: string) => void;
  onSendToProfe: (content: string) => void;
}

const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || "";

export default function ResearchModal({
  open,
  onClose,
  onAddToCanvas,
  onSendToProfe,
}: ResearchModalProps) {
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState<ResearchProvider>("anthropic");
  const [results, setResults] = useState<ExtendedResearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const doSearch = useCallback(async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    setResults([]);
    setExpandedIdx(null);

    try {
      let data: { results?: ExtendedResearchResult[] } | null = null;

      // Try Directus endpoint first
      if (directusUrl) {
        try {
          const res = await fetch(`${directusUrl}/workspace/research/search`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ query, provider }),
          });
          if (res.ok) {
            data = await res.json();
          }
        } catch {
          // Directus unavailable, fall through to Next.js route
        }
      }

      // Fallback to Next.js API route
      if (!data || !data.results) {
        const res = await fetch("/api/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        if (res.ok) {
          data = await res.json();
        }
      }

      setResults(data?.results || []);
    } catch {
      setResults([
        { title: "Error", summary: "Research request failed. Please try again.", source: "" },
      ]);
    } finally {
      setLoading(false);
    }
  }, [query, provider, loading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") doSearch();
  };

  const formatForCanvas = (r: ExtendedResearchResult) => {
    let text = `## ${r.title}\n\n${r.summary}`;
    if (r.authors) text += `\n\nAuthors: ${r.authors}`;
    if (r.journal) text += `\nJournal: ${r.journal}`;
    if (r.source) text += `\nSource: ${r.source}`;
    return text;
  };

  if (!open) return null;

  // ── Styles ──
  const overlay: CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 200,
    background: "rgba(0,0,0,0.7)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Satoshi', sans-serif",
  };

  const modal: CSSProperties = {
    ...glass(),
    width: "min(720px, 92vw)",
    maxHeight: "85vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
  };

  const header: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 24px 16px",
    borderBottom: `1px solid ${C.glassBrd}`,
  };

  const providerTabs: CSSProperties = {
    display: "flex",
    gap: "4px",
    padding: "12px 24px 0",
  };

  const providerTab = (active: boolean): CSSProperties => ({
    padding: "8px 16px",
    borderRadius: "10px 10px 0 0",
    background: active ? C.glassB : "transparent",
    border: active ? `1px solid ${C.glassBrd}` : "1px solid transparent",
    borderBottom: active ? "1px solid transparent" : `1px solid ${C.glassBrd}`,
    color: active ? C.rg : C.tx3,
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: active ? 600 : 400,
    fontFamily: "'Satoshi', sans-serif",
    transition: "all .2s",
  });

  const searchRow: CSSProperties = {
    display: "flex",
    gap: "10px",
    padding: "16px 24px",
    alignItems: "center",
  };

  const inputStyle: CSSProperties = {
    ...glass({ borderRadius: "12px", padding: "12px 16px" }),
    flex: 1,
    color: C.cr,
    fontSize: "16px",
    fontFamily: "'Satoshi', sans-serif",
    outline: "none",
    border: `1px solid ${C.glassBrd}`,
    background: C.glass,
  };

  const resultsArea: CSSProperties = {
    flex: 1,
    overflowY: "auto",
    padding: "8px 24px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  };

  const card: CSSProperties = {
    ...glass({ borderRadius: "14px", padding: "18px 20px" }),
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  };

  const providers: { key: ResearchProvider; label: string }[] = [
    { key: "anthropic", label: "Web Search" },
    { key: "pubmed", label: "PubMed" },
    { key: "custom", label: "Custom API" },
  ];

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={header}>
          <h2
            style={{
              margin: 0,
              fontFamily: "'Clash Display', sans-serif",
              fontSize: "26px",
              fontWeight: 600,
              color: C.cr,
            }}
          >
            Research
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: C.tx3,
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              transition: "color .2s",
            }}
            aria-label="Close"
          >
            {I.x}
          </button>
        </div>

        {/* Provider Tabs */}
        <div style={providerTabs}>
          {providers.map((p) => (
            <button
              key={p.key}
              style={providerTab(provider === p.key)}
              onClick={() => setProvider(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={searchRow}>
          <span style={{ color: C.tx3, display: "flex" }}>{I.search}</span>
          <input
            ref={inputRef}
            type="text"
            placeholder={
              provider === "pubmed"
                ? "Search PubMed articles..."
                : provider === "custom"
                  ? "Search custom API..."
                  : "Search the web..."
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={inputStyle}
          />
          <button
            onClick={doSearch}
            disabled={loading || !query.trim()}
            style={glassBtn({
              color: C.rg,
              opacity: loading || !query.trim() ? 0.5 : 1,
            })}
          >
            {loading ? (
              <span
                style={{
                  display: "inline-flex",
                  animation: "spin 1s linear infinite",
                }}
              >
                {I.loader}
              </span>
            ) : (
              I.send
            )}
          </button>
        </div>

        {/* Results */}
        <div style={resultsArea}>
          {/* Empty state */}
          {!loading && results.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "48px 20px",
                color: C.tx3,
                fontSize: "16px",
              }}
            >
              <div
                style={{
                  marginBottom: "12px",
                  opacity: 0.5,
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                {I.search}
              </div>
              Search across research databases
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div
              style={{
                textAlign: "center",
                padding: "48px 20px",
                color: C.tx3,
                fontSize: "16px",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  animation: "spin 1s linear infinite",
                  marginBottom: "12px",
                }}
              >
                {I.loader}
              </div>
              <br />
              Searching...
            </div>
          )}

          {/* Result cards */}
          {results.map((r, i) => (
            <div key={i} style={card}>
              {/* Title */}
              <h3
                style={{
                  margin: 0,
                  fontFamily: "'Clash Display', sans-serif",
                  fontSize: "18px",
                  fontWeight: 600,
                  color: C.cr,
                  lineHeight: 1.3,
                }}
              >
                {r.title}
              </h3>

              {/* PubMed metadata */}
              {r.pmid && (
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontSize: "13px",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      background: `${C.rg}18`,
                      color: C.rg,
                      fontWeight: 500,
                    }}
                  >
                    PMID: {r.pmid}
                  </span>
                  {r.journal && (
                    <span style={{ fontSize: "13px", color: C.tx3 }}>
                      {r.journal}
                    </span>
                  )}
                </div>
              )}

              {/* Authors (PubMed) */}
              {r.authors && (
                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    color: C.tx3,
                    fontStyle: "italic",
                  }}
                >
                  {r.authors}
                </p>
              )}

              {/* Summary */}
              <p
                style={{
                  margin: 0,
                  fontSize: "15px",
                  color: C.tx2,
                  lineHeight: 1.5,
                  display: "-webkit-box",
                  WebkitLineClamp: expandedIdx === i ? undefined : 4,
                  WebkitBoxOrient: "vertical",
                  overflow: expandedIdx === i ? "visible" : "hidden",
                }}
              >
                {r.summary}
              </p>

              {/* Expandable article content */}
              {r.article && (
                <button
                  onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                  style={{
                    background: "none",
                    border: "none",
                    color: C.rg,
                    cursor: "pointer",
                    fontSize: "14px",
                    padding: "4px 0",
                    textAlign: "left",
                    fontFamily: "'Satoshi', sans-serif",
                  }}
                >
                  {expandedIdx === i ? "Collapse" : "Read Full Article"}
                </button>
              )}

              {expandedIdx === i && r.article && (
                <div
                  style={{
                    fontSize: "14px",
                    color: C.tx2,
                    lineHeight: 1.6,
                    padding: "12px 16px",
                    borderRadius: "10px",
                    background: C.glass,
                    border: `1px solid ${C.glassBrd}`,
                    maxHeight: "300px",
                    overflowY: "auto",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {r.article}
                </div>
              )}

              {/* Source link */}
              {r.source && (
                <a
                  href={r.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: "13px",
                    color: C.tx3,
                    textDecoration: "none",
                    wordBreak: "break-all",
                    transition: "color .2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = C.rg)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = C.tx3)}
                >
                  {r.source}
                </a>
              )}

              {/* Action buttons */}
              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                <button
                  onClick={() => onAddToCanvas(formatForCanvas(r))}
                  style={glassBtn({ fontSize: "13px", padding: "6px 12px" })}
                  title="Add to Canvas"
                >
                  {I.plus}
                  <span>Canvas</span>
                </button>
                <button
                  onClick={() => onSendToProfe(formatForCanvas(r))}
                  style={glassBtn({
                    fontSize: "13px",
                    padding: "6px 12px",
                    color: C.rg,
                  })}
                  title="Send to Profe"
                >
                  {I.spark}
                  <span>Prof&eacute;</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
