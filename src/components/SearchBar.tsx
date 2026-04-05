import React, { useState, useCallback } from "react";
import type { SearchCardData, Block, KBFile } from "@/lib/types";

interface SearchBarProps {
  onResults: (results: SearchCardData[], isContext: boolean) => void;
  onLoading: (loading: boolean) => void;
  onError: (error: string) => void;
  canvasBlocks: Block[];
  kbFiles: KBFile[];
  disabled?: boolean;
}

export default function SearchBar({
  onResults,
  onLoading,
  onError,
  canvasBlocks,
  kbFiles,
  disabled,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const handleGo = useCallback(async () => {
    if (!query.trim() || searching) return;
    setSearching(true);
    onLoading(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error || "Search failed");
        return;
      }
      onResults(data.results || [], false);
    } catch {
      onError("Search failed — check your connection");
    } finally {
      setSearching(false);
      onLoading(false);
    }
  }, [query, searching, onResults, onLoading, onError]);

  const handleContextSearch = useCallback(async () => {
    if (searching) return;
    setSearching(true);
    onLoading(true);
    try {
      const res = await fetch("/api/context-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canvasBlocks, kbFiles }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error || "Context search failed");
        return;
      }
      onResults(data.results || [], true);
    } catch {
      onError("Context search failed — check your connection");
    } finally {
      setSearching(false);
      onLoading(false);
    }
  }, [searching, canvasBlocks, kbFiles, onResults, onLoading, onError]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleGo();
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flex: 1,
        maxWidth: 560,
        margin: "0 24px",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10,
          padding: "8px 14px",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(250,245,239,0.4)"
          strokeWidth="2"
          style={{ marginRight: 8, flexShrink: 0 }}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Search the web..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || searching}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#FAF5EF",
            fontSize: 13,
            fontFamily: "Satoshi, sans-serif",
          }}
        />
      </div>
      <button
        onClick={handleGo}
        disabled={disabled || searching || !query.trim()}
        style={{
          padding: "8px 16px",
          borderRadius: 10,
          border: "1px solid rgba(232,168,124,0.3)",
          background: "rgba(232,168,124,0.15)",
          color: "#E8A87C",
          fontSize: 13,
          fontWeight: 600,
          cursor: disabled || searching ? "not-allowed" : "pointer",
          whiteSpace: "nowrap",
          opacity: disabled || searching || !query.trim() ? 0.5 : 1,
          fontFamily: "Satoshi, sans-serif",
        }}
      >
        {searching ? "..." : "Go"}
      </button>
      <button
        onClick={handleContextSearch}
        disabled={disabled || searching}
        style={{
          padding: "8px 16px",
          borderRadius: 10,
          border: "1px solid rgba(199,125,186,0.3)",
          background: "rgba(199,125,186,0.12)",
          color: "#C77DBA",
          fontSize: 13,
          fontWeight: 600,
          cursor: disabled || searching ? "not-allowed" : "pointer",
          whiteSpace: "nowrap",
          opacity: disabled || searching ? 0.5 : 1,
          fontFamily: "Satoshi, sans-serif",
        }}
      >
        {searching ? "Analyzing..." : "Context Search"}
      </button>
    </div>
  );
}
