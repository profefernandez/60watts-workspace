import React from "react";
import type { SearchCardData } from "@/lib/types";

const SC = {
  bg: "rgba(18,22,35,0.9)",
  bgHover: "rgba(100,120,200,0.06)",
  border: "rgba(100,120,200,0.1)",
  borderProfe: "rgba(199,125,186,0.15)",
  accent: "#7B93DB",
  accentBg: "rgba(123,147,219,0.12)",
  text: "#B8C8F0",
  textMuted: "rgba(184,200,240,0.5)",
  textDim: "rgba(184,200,240,0.45)",
  profe: "#C77DBA",
  profeBg: "rgba(199,125,186,0.08)",
  profeMuted: "rgba(199,125,186,0.6)",
  profeBtnBg: "rgba(199,125,186,0.15)",
};

interface SearchCardProps {
  card: SearchCardData;
  mode: "panel" | "pinned";
  onVisitSource: (url: string) => void;
  onDragToCanvas?: (card: SearchCardData) => void;
  onExtract?: (card: SearchCardData) => void;
  onRemove?: (cardId: string) => void;
}

export default function SearchCard({
  card,
  mode,
  onVisitSource,
  onDragToCanvas,
  onExtract,
  onRemove,
}: SearchCardProps) {
  const isProfe = Boolean(card.relevance || card.suggested_location);
  const borderColor = isProfe ? SC.borderProfe : SC.border;

  const btnStyle = (color: string, bg: string): React.CSSProperties => ({
    padding: "3px 8px",
    borderRadius: 5,
    background: bg,
    color,
    fontSize: 10,
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
    fontFamily: "Satoshi, sans-serif",
  });

  return (
    <div
      style={{
        background: SC.bgHover,
        border: `1px solid ${borderColor}`,
        borderRadius: mode === "pinned" ? 12 : 10,
        padding: 12,
        cursor: mode === "panel" ? "grab" : "default",
        boxShadow: mode === "pinned" ? "0 4px 16px rgba(0,0,0,0.3)" : "none",
      }}
      draggable={mode === "panel"}
      onDragStart={(e) => {
        if (mode === "panel") {
          e.dataTransfer.setData(
            "application/x-search-card",
            JSON.stringify(card)
          );
        }
      }}
    >
      {isProfe && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: mode === "pinned" ? 8 : 4,
          }}
        >
          <div
            style={{
              width: mode === "pinned" ? 7 : 6,
              height: mode === "pinned" ? 7 : 6,
              borderRadius: "50%",
              background: SC.profe,
              boxShadow: "0 0 6px rgba(199,125,186,0.4)",
            }}
          />
          <span
            style={{
              color: SC.profeMuted,
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {mode === "pinned" ? "Profé Suggestion" : "Profé suggestion"}
          </span>
        </div>
      )}

      {!isProfe && mode === "pinned" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: SC.accent,
              boxShadow: "0 0 6px rgba(123,147,219,0.4)",
            }}
          />
          <span
            style={{
              color: "rgba(184,200,240,0.4)",
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Search Card
          </span>
        </div>
      )}

      <div
        style={{
          color: SC.text,
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 4,
          fontFamily: "Satoshi, sans-serif",
        }}
      >
        {card.title}
      </div>

      <div
        style={{
          color: SC.textDim,
          fontSize: 11,
          lineHeight: 1.5,
          marginBottom: card.relevance ? 6 : 8,
          fontFamily: "Satoshi, sans-serif",
        }}
      >
        {card.snippet}
      </div>

      {card.relevance && (
        <div
          style={{
            background: SC.profeBg,
            borderRadius: 6,
            padding: "5px 8px",
            marginBottom: 8,
          }}
        >
          <span
            style={{
              color: SC.profeMuted,
              fontSize: 10,
              lineHeight: 1.4,
              fontFamily: "Satoshi, sans-serif",
            }}
          >
            → {card.relevance}
            {card.suggested_location && ` — ${card.suggested_location}`}
          </span>
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            color: "rgba(123,147,219,0.5)",
            fontSize: 10,
            fontFamily: "Satoshi, sans-serif",
          }}
        >
          {card.source_domain}
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          {mode === "panel" && onDragToCanvas && (
            <button
              style={btnStyle(SC.accent, SC.accentBg)}
              onClick={() => onDragToCanvas(card)}
            >
              Add to Canvas
            </button>
          )}
          {mode === "pinned" && onExtract && (
            <button
              style={btnStyle(
                isProfe ? SC.profe : SC.accent,
                isProfe ? SC.profeBtnBg : SC.accentBg
              )}
              onClick={() => onExtract(card)}
            >
              Extract
            </button>
          )}
          <button
            style={btnStyle("rgba(184,200,240,0.4)", "rgba(255,255,255,0.04)")}
            onClick={() => onVisitSource(card.source_url)}
          >
            Visit Source
          </button>
          {mode === "pinned" && onRemove && (
            <button
              style={btnStyle(
                "rgba(184,200,240,0.4)",
                "rgba(255,255,255,0.04)"
              )}
              onClick={() => onRemove(card.id)}
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
