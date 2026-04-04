"use client";
import React, { useState, useEffect } from "react";
import { C } from "../../lib/colors";
import { glass } from "../../lib/styles";

interface Props {
  onInsert: (youtubeUrl: string) => void;
  onClose: () => void;
  initialUrl?: string;
}

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

export default function YouTubeModal({ onInsert, onClose, initialUrl }: Props) {
  const [url, setUrl] = useState(initialUrl || "");
  const [videoId, setVideoId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setVideoId(extractYouTubeId(url));
    }, 400);
    return () => clearTimeout(t);
  }, [url]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          ...glass(),
          background: "rgba(20,22,28,0.96)",
          width: 480,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: `1px solid ${C.glassBrd}`,
          }}
        >
          <span style={{ fontSize: 17, fontWeight: 600, color: C.cr, fontFamily: "'Satoshi'" }}>
            {initialUrl ? "Replace YouTube Video" : "Insert YouTube Video"}
          </span>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: C.tx4, cursor: "pointer", fontSize: 14 }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: 24 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              autoFocus
              style={{
                flex: 1,
                background: C.glass,
                border: `1px solid ${C.glassBrd}`,
                borderRadius: 10,
                padding: "12px 14px",
                fontSize: 14,
                color: C.cr,
                fontFamily: "'Satoshi'",
                outline: "none",
              }}
            />
            <button
              onClick={() => { if (videoId) onInsert(url); }}
              style={{
                background: videoId ? "rgba(232,168,124,0.15)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${videoId ? "rgba(232,168,124,0.3)" : C.glassBrd}`,
                borderRadius: 10,
                padding: "12px 16px",
                fontSize: 14,
                color: videoId ? C.rg : C.tx4,
                fontWeight: 600,
                cursor: videoId ? "pointer" : "default",
                fontFamily: "'Satoshi'",
              }}
            >
              Insert
            </button>
          </div>

          {videoId && (
            <div style={{ borderRadius: 10, overflow: "hidden", background: "#111" }}>
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                style={{ width: "100%", aspectRatio: "16/9", border: "none", display: "block" }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          )}

          {url && !videoId && (
            <div style={{ textAlign: "center", color: C.tx4, fontSize: 14, padding: 24, fontFamily: "'Satoshi'" }}>
              Paste a valid YouTube URL to see a preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
