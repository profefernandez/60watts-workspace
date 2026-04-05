import React, { useState, useEffect, useRef, useCallback } from "react";
import { sanitizeUrl } from "@/lib";

interface SourceBrowserProps {
  url: string;
  onBack: () => void;
}

const LOAD_TIMEOUT_MS = 10000;

export default function SourceBrowser({ url, onBack }: SourceBrowserProps) {
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const safeUrl = sanitizeUrl(url);
  const isHttps = safeUrl.startsWith("https://");
  const displayUrl = safeUrl || url;
  const hostname = (() => {
    try {
      return new URL(displayUrl).hostname;
    } catch {
      return "";
    }
  })();

  useEffect(() => {
    if (!isHttps) {
      setBlocked(true);
      setLoading(false);
      return;
    }
    timerRef.current = setTimeout(() => {
      setBlocked(true);
      setLoading(false);
    }, LOAD_TIMEOUT_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isHttps]);

  const handleLoad = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setLoading(false);
  }, []);

  const handleError = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setBlocked(true);
    setLoading(false);
  }, []);

  const openExternal = () => window.open(displayUrl, "_blank", "noopener,noreferrer");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "rgba(8,9,12,0.95)",
        fontFamily: "Satoshi, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 16px",
          background: "rgba(18,22,35,0.95)",
          borderBottom: "1px solid rgba(100,120,200,0.12)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            background: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(100,120,200,0.1)",
            borderRadius: 8,
            padding: "6px 12px",
            overflow: "hidden",
          }}
        >
          {isHttps && (
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: "rgba(100,200,120,0.3)",
                marginRight: 8,
                flexShrink: 0,
              }}
            />
          )}
          <span
            style={{
              color: "rgba(184,200,240,0.5)",
              fontSize: 11,
              fontFamily: "JetBrains Mono, monospace",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {displayUrl}
          </span>
        </div>

        <div
          style={{
            padding: "4px 10px",
            borderRadius: 6,
            background: isHttps
              ? "rgba(100,200,120,0.1)"
              : "rgba(232,93,93,0.1)",
            border: `1px solid ${
              isHttps
                ? "rgba(100,200,120,0.15)"
                : "rgba(232,93,93,0.15)"
            }`,
          }}
        >
          <span
            style={{
              color: isHttps
                ? "rgba(100,200,120,0.7)"
                : "rgba(232,93,93,0.7)",
              fontSize: 10,
              fontWeight: 600,
            }}
          >
            {isHttps ? "Sandboxed" : "Not Secure"}
          </span>
        </div>

        <button
          onClick={openExternal}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            background: "rgba(100,120,200,0.1)",
            border: "1px solid rgba(100,120,200,0.15)",
            color: "#7B93DB",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
            fontFamily: "Satoshi, sans-serif",
          }}
        >
          Open External
        </button>

        <button
          onClick={onBack}
          style={{
            padding: "6px 14px",
            borderRadius: 8,
            background: "rgba(232,168,124,0.15)",
            border: "1px solid rgba(232,168,124,0.25)",
            color: "#E8A87C",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
            fontFamily: "Satoshi, sans-serif",
          }}
        >
          ← Back to Canvas
        </button>
      </div>

      <div style={{ flex: 1, position: "relative" }}>
        {loading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(8,9,12,0.9)",
              zIndex: 1,
            }}
          >
            <span style={{ color: "rgba(184,200,240,0.4)", fontSize: 13 }}>
              Loading {hostname}...
            </span>
          </div>
        )}

        {blocked ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: 16,
            }}
          >
            <span style={{ color: "#B8C8F0", fontSize: 14, fontWeight: 600 }}>
              This site can&apos;t be embedded
            </span>
            <span
              style={{
                color: "rgba(184,200,240,0.4)",
                fontSize: 12,
                maxWidth: 400,
                textAlign: "center",
              }}
            >
              {hostname} blocks embedding for security reasons.
              {!isHttps && " Only HTTPS sites can be embedded."}
            </span>
            <button
              onClick={openExternal}
              style={{
                padding: "8px 20px",
                borderRadius: 10,
                background: "rgba(123,147,219,0.15)",
                border: "1px solid rgba(123,147,219,0.25)",
                color: "#7B93DB",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "Satoshi, sans-serif",
              }}
            >
              Open in New Tab
            </button>
          </div>
        ) : (
          isHttps && (
            <iframe
              ref={iframeRef}
              src={safeUrl}
              sandbox="allow-scripts allow-same-origin"
              referrerPolicy="no-referrer"
              loading="lazy"
              onLoad={handleLoad}
              onError={handleError}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
              }}
            />
          )
        )}
      </div>
    </div>
  );
}
