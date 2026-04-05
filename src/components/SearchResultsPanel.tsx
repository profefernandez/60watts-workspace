import React, { useState } from "react";
import { useDrag } from "@/components/canvas/useDrag";
import SearchCard from "./SearchCard";
import type { SearchCardData } from "@/lib/types";

interface SearchResultsPanelProps {
  results: SearchCardData[];
  error?: string;
  onClose: () => void;
  onVisitSource: (url: string) => void;
  onAddToCanvas: (card: SearchCardData) => void;
}

export default function SearchResultsPanel({
  results,
  error,
  onClose,
  onVisitSource,
  onAddToCanvas,
}: SearchResultsPanelProps) {
  const [pos, setPos] = useState({ x: window.innerWidth - 380, y: 80 });
  const [minimized, setMinimized] = useState(false);

  const { onPointerDown } = useDrag({
    getInitial: () => pos,
    onDrag: (x, y) => setPos({ x, y }),
  });

  return (
    <div
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: 340,
        background:
          "linear-gradient(165deg, rgba(18,22,35,0.97), rgba(12,14,24,0.98))",
        border: "1px solid rgba(100,120,200,0.15)",
        borderRadius: 14,
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(100,120,200,0.08)",
        backdropFilter: "blur(20px)",
        overflow: "hidden",
        zIndex: 1000,
        fontFamily: "Satoshi, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: minimized
            ? "none"
            : "1px solid rgba(100,120,200,0.1)",
          userSelect: "none",
        }}
      >
        <div
          onPointerDown={onPointerDown}
          style={{ display: "flex", alignItems: "center", gap: 8, cursor: "grab", flex: 1 }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#7B93DB",
              boxShadow: "0 0 8px rgba(123,147,219,0.4)",
            }}
          />
          <span
            style={{ color: "#B8C8F0", fontSize: 13, fontWeight: 600 }}
          >
            Search Results
          </span>
          <span
            style={{ color: "rgba(184,200,240,0.4)", fontSize: 11 }}
          >
            · {results.length} result{results.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={() => setMinimized(!minimized)}
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: "rgba(100,120,200,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              border: "none",
              color: "rgba(184,200,240,0.5)",
              fontSize: 14,
            }}
          >
            {minimized ? "+" : "−"}
          </button>
          <button
            onClick={onClose}
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: "rgba(100,120,200,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              border: "none",
              color: "rgba(184,200,240,0.5)",
              fontSize: 12,
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {!minimized && (
        <div
          style={{
            padding: 10,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            maxHeight: 400,
            overflowY: "auto",
          }}
        >
          {error && (
            <div
              style={{
                color: "#E85D5D",
                fontSize: 12,
                padding: "8px 12px",
                background: "rgba(232,93,93,0.1)",
                borderRadius: 8,
              }}
            >
              {error}
            </div>
          )}
          {results.map((card) => (
            <SearchCard
              key={card.id}
              card={card}
              mode="panel"
              onVisitSource={onVisitSource}
              onDragToCanvas={onAddToCanvas}
            />
          ))}
          {results.length === 0 && !error && (
            <div
              style={{
                color: "rgba(184,200,240,0.4)",
                fontSize: 12,
                textAlign: "center",
                padding: 20,
              }}
            >
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
