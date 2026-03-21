"use client";
import React, { useState, useRef, useCallback } from "react";
import { C, I, glass, glassBtn } from "@/lib";
import type { CSSProperties } from "react";

interface YouTubeResultItem {
  title: string;
  channelName: string;
  videoId: string;
  description: string;
  thumbnail?: string;
}

interface YouTubeModalProps {
  open: boolean;
  onClose: () => void;
  onEmbed: (videoUrl: string) => void;
}

const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || "";

export default function YouTubeModal({
  open,
  onClose,
  onEmbed,
}: YouTubeModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<YouTubeResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const doSearch = useCallback(async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    setResults([]);

    try {
      let data: { results?: YouTubeResultItem[] } | null = null;

      // Try Directus endpoint first
      if (directusUrl) {
        try {
          const res = await fetch(`${directusUrl}/workspace/youtube/search`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ query }),
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
        const res = await fetch("/api/youtube", {
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
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, loading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") doSearch();
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
    ...glass({ borderRadius: "14px", padding: "16px" }),
    display: "flex",
    gap: "16px",
    alignItems: "flex-start",
  };

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
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span style={{ color: C.rg, display: "flex" }}>{I.yt}</span>
            YouTube
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

        {/* Search */}
        <div style={searchRow}>
          <span style={{ color: C.tx3, display: "flex" }}>{I.search}</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search YouTube videos..."
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
                {I.yt}
              </div>
              Search YouTube videos
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
              Searching YouTube...
            </div>
          )}

          {/* Result cards */}
          {results.map((r, i) => (
            <div key={i} style={card}>
              {/* Thumbnail */}
              <div
                style={{
                  flexShrink: 0,
                  width: "180px",
                  aspectRatio: "16/9",
                  borderRadius: "8px",
                  overflow: "hidden",
                  background: C.ob3,
                }}
              >
                {r.thumbnail ? (
                  <img
                    src={r.thumbnail}
                    alt={r.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <img
                    src={`https://img.youtube.com/vi/${r.videoId}/mqdefault.jpg`}
                    alt={r.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                )}
              </div>

              {/* Info */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  minWidth: 0,
                }}
              >
                <h4
                  style={{
                    margin: 0,
                    fontFamily: "'Satoshi', sans-serif",
                    fontSize: "16px",
                    fontWeight: 600,
                    color: C.cr,
                    lineHeight: 1.3,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {r.title}
                </h4>
                <span
                  style={{
                    fontSize: "14px",
                    color: C.tx3,
                    fontWeight: 400,
                  }}
                >
                  {r.channelName}
                </span>
                <button
                  onClick={() =>
                    onEmbed(`https://www.youtube.com/watch?v=${r.videoId}`)
                  }
                  style={glassBtn({
                    fontSize: "13px",
                    padding: "6px 14px",
                    color: C.rg,
                    marginTop: "4px",
                    alignSelf: "flex-start",
                  })}
                >
                  {I.play}
                  <span>Embed</span>
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
