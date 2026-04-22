"use client";

import React, { useState, useCallback } from "react";
import { C } from "../lib/colors";
import { glass, glassBtn } from "../lib/styles";
import { I } from "../lib/icons";
import type { YouTubeResult } from "../lib/types";

interface YouTubePanelProps {
  workspaceId: string;
  onInsertToCanvas?: (videoId: string) => void;
}

export default function YouTubePanel({
  workspaceId: _workspaceId,
  onInsertToCanvas,
}: YouTubePanelProps) {
  void _workspaceId;
  const [apiKey, setApiKey] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<YouTubeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const search = useCallback(async () => {
    const q = query.trim();
    if (!q || !apiKey.trim()) return;

    setLoading(true);
    setError("");
    setResults([]);

    try {
      const res = await fetch("/api/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, apiKey: apiKey.trim(), provider: "anthropic" }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResults(data.results ?? []);
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }, [query, apiKey]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") search();
  };

  return (
    <div style={{ padding: 24, height: "100%", overflowY: "auto" }}>
      {/* Header */}
      <h2
        style={{
          fontFamily: "'Clash Display', sans-serif",
          fontSize: 26,
          fontWeight: 600,
          color: C.cr,
          margin: 0,
          marginBottom: 20,
        }}
      >
        YouTube Search
      </h2>

      {/* API key input */}
      <div style={{ marginBottom: 16 }}>
        <label
          style={{
            fontFamily: "'Satoshi', sans-serif",
            fontSize: 13,
            color: C.tx3,
            display: "block",
            marginBottom: 6,
          }}
        >
          Anthropic API Key
        </label>
        <input
          type="password"
          placeholder="sk-ant-..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 14px",
            background: C.ob1,
            border: `1px solid ${C.ob6}`,
            borderRadius: 12,
            color: C.tx,
            fontSize: 15,
            fontFamily: "'Satoshi', sans-serif",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Search bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 10,
            ...glass({ padding: "8px 14px" }),
          }}
        >
          <span style={{ color: C.tx3, display: "flex", flexShrink: 0 }}>{I.search}</span>
          <input
            type="text"
            placeholder="Search YouTube videos..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              color: C.tx,
              fontSize: 16,
              fontFamily: "'Satoshi', sans-serif",
              outline: "none",
            }}
          />
        </div>
        <button
          onClick={search}
          disabled={loading || !query.trim() || !apiKey.trim()}
          style={{
            ...glassBtn({
              background: C.rg,
              color: C.ob1,
              fontWeight: 600,
              borderColor: "transparent",
              opacity: loading || !query.trim() || !apiKey.trim() ? 0.5 : 1,
              cursor:
                loading || !query.trim() || !apiKey.trim()
                  ? "not-allowed"
                  : "pointer",
            }),
          }}
        >
          Search
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            ...glass({ padding: "12px 16px", marginBottom: 20 }),
            borderColor: C.red,
            color: C.red,
            fontFamily: "'Satoshi', sans-serif",
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: 40,
            color: C.tx3,
            fontFamily: "'Satoshi', sans-serif",
            fontSize: 15,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              animation: "yt-spin 1s linear infinite",
              color: C.rg,
            }}
          >
            {I.loader}
          </span>
          Searching YouTube...
          <style>{`@keyframes yt-spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* Empty state */}
      {!loading && results.length === 0 && !error && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 20px",
            textAlign: "center",
          }}
        >
          <span style={{ color: C.tx4, marginBottom: 16, opacity: 0.6 }}>
            {I.yt}
          </span>
          <p
            style={{
              fontFamily: "'Satoshi', sans-serif",
              fontSize: 16,
              color: C.tx3,
              margin: 0,
              maxWidth: 320,
              lineHeight: 1.5,
            }}
          >
            Search YouTube for videos to support your research
          </p>
        </div>
      )}

      {/* Results grid */}
      {results.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {results.map((v) => (
            <div key={v.videoId} style={glass({ overflow: "hidden" })}>
              {/* Thumbnail */}
              <img
                src={`https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`}
                alt={v.title}
                width={320}
                height={180}
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                  objectFit: "cover",
                  borderRadius: "16px 16px 0 0",
                }}
              />

              <div style={{ padding: "14px 16px 16px" }}>
                {/* Title */}
                <h3
                  style={{
                    fontFamily: "'Satoshi', sans-serif",
                    fontSize: 16,
                    fontWeight: 700,
                    color: C.cr,
                    margin: "0 0 4px",
                    lineHeight: 1.35,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {v.title}
                </h3>

                {/* Channel */}
                <p
                  style={{
                    fontFamily: "'Satoshi', sans-serif",
                    fontSize: 14,
                    color: C.tx3,
                    margin: "0 0 8px",
                  }}
                >
                  {v.channelName}
                </p>

                {/* Description */}
                {v.description && (
                  <p
                    style={{
                      fontFamily: "'Satoshi', sans-serif",
                      fontSize: 14,
                      color: C.tx2,
                      margin: "0 0 14px",
                      lineHeight: 1.45,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {v.description}
                  </p>
                )}

                {/* Actions */}
                <div style={{ display: "flex", gap: 8 }}>
                  {onInsertToCanvas && (
                    <button
                      onClick={() => onInsertToCanvas(v.videoId)}
                      style={glassBtn({
                        flex: 1,
                        justifyContent: "center",
                        fontSize: 13,
                        padding: "7px 12px",
                        color: C.rg,
                        borderColor: `${C.rg}33`,
                      })}
                    >
                      {I.plus}
                      Insert to Canvas
                    </button>
                  )}
                  <a
                    href={`https://youtube.com/watch?v=${v.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      ...glassBtn({
                        flex: onInsertToCanvas ? 0 : 1,
                        justifyContent: "center",
                        fontSize: 13,
                        padding: "7px 12px",
                        textDecoration: "none",
                      }),
                    }}
                  >
                    {I.play}
                    Watch
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
