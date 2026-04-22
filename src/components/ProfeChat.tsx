"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { C } from "../lib/colors";
import { glass } from "../lib/styles";
import { I } from "../lib/icons";

interface ProfeChatProps {
  visible: boolean;
  onClose: () => void;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  error?: boolean;
}

function renderMarkdown(text: string): React.ReactNode[] {
  const blocks = text.split(/(```[\s\S]*?```)/g);
  const nodes: React.ReactNode[] = [];

  blocks.forEach((block, bi) => {
    if (block.startsWith("```") && block.endsWith("```")) {
      const inner = block.slice(3, -3);
      const nlIdx = inner.indexOf("\n");
      const code = nlIdx >= 0 ? inner.slice(nlIdx + 1) : inner;
      nodes.push(
        <pre
          key={`cb-${bi}`}
          style={{
            background: C.ob1,
            border: `1px solid ${C.glassBrd}`,
            borderRadius: 8,
            padding: "12px 14px",
            overflowX: "auto",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 14,
            lineHeight: 1.5,
            color: C.cr,
            margin: "8px 0",
          }}
        >
          {code}
        </pre>
      );
      return;
    }

    const lines = block.split("\n");
    let inList = false;
    const listItems: React.ReactNode[] = [];

    const flushList = () => {
      if (!inList) return;
      nodes.push(
        <ul
          key={`ul-${bi}-${nodes.length}`}
          style={{ margin: "6px 0", paddingLeft: 20 }}
        >
          {listItems.map((li, i) => (
            <li key={i} style={{ marginBottom: 3 }}>
              {li}
            </li>
          ))}
        </ul>
      );
      listItems.length = 0;
      inList = false;
    };

    lines.forEach((line, li) => {
      const bulletMatch = line.match(/^[\s]*[-*]\s+(.*)/);
      if (bulletMatch) {
        inList = true;
        listItems.push(inlineFormat(bulletMatch[1], `${bi}-${li}`));
        return;
      }
      flushList();
      if (line.trim() === "") {
        nodes.push(<br key={`br-${bi}-${li}`} />);
      } else {
        nodes.push(
          <span key={`ln-${bi}-${li}`} style={{ display: "block" }}>
            {inlineFormat(line, `${bi}-${li}`)}
          </span>
        );
      }
    });
    flushList();
  });

  return nodes;
}

function inlineFormat(text: string, keyBase: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const rx = /(\*\*(.+?)\*\*|`([^`]+)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let idx = 0;

  while ((m = rx.exec(text)) !== null) {
    if (m.index > last) {
      parts.push(text.slice(last, m.index));
    }
    if (m[2]) {
      parts.push(<strong key={`${keyBase}-b${idx}`}>{m[2]}</strong>);
    } else if (m[3]) {
      parts.push(
        <code
          key={`${keyBase}-c${idx}`}
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.9em",
            background: C.ob1,
            border: `1px solid ${C.glassBrd}`,
            borderRadius: 4,
            padding: "1px 5px",
          }}
        >
          {m[3]}
        </code>
      );
    }
    last = m.index + m[0].length;
    idx++;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

const panelStyle: CSSProperties = {
  ...glass({ background: "#080A0E" }),
  position: "fixed",
  right: 24,
  bottom: 24,
  width: 400,
  height: 560,
  maxHeight: "80vh",
  display: "flex",
  flexDirection: "column",
  zIndex: 9999,
  boxShadow: "0 16px 64px rgba(0,0,0,0.6)",
  transition: "transform 0.35s cubic-bezier(.4,0,.2,1), opacity 0.3s ease",
  overflow: "hidden",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "14px 18px",
  background: "#060810",
  borderBottom: `1px solid ${C.glassBrd}`,
  flexShrink: 0,
};

const messagesAreaStyle: CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const inputAreaStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  gap: 8,
  padding: "12px 14px",
  borderTop: `1px solid ${C.glassBrd}`,
  flexShrink: 0,
};

export default function ProfeChat({ visible, onClose }: ProfeChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [lastFailedMsg, setLastFailedMsg] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (visible && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 350);
    }
  }, [visible]);

  const resizeTextarea = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const lineHeight = 22;
    const maxH = lineHeight * 4 + 16;
    ta.style.height = `${Math.min(ta.scrollHeight, maxH)}px`;
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setInput("");
      setLastFailedMsg(null);
      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
      setLoading(true);

      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      try {
        const payload: Record<string, string> = { message: trimmed };
        if (conversationId) payload.conversationId = conversationId;

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => null);
          const errMsg =
            errBody?.error || `Request failed (${res.status})`;
          throw new Error(errMsg);
        }

        const data = await res.json();
        if (data.conversationId) setConversationId(data.conversationId);

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.content },
        ]);
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Something went wrong";
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: msg, error: true },
        ]);
        setLastFailedMsg(trimmed);
      } finally {
        setLoading(false);
      }
    },
    [loading, conversationId]
  );

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleRetry = () => {
    if (lastFailedMsg) {
      setMessages((prev) => prev.slice(0, -1));
      sendMessage(lastFailedMsg);
    }
  };

  return (
    <div
      style={{
        ...panelStyle,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="profe-sparkle" style={{ color: C.rg, display: "flex" }}>
            {I.spark}
          </span>
          <span
            style={{
              fontFamily: "'Clash Display', sans-serif",
              fontSize: 18,
              fontWeight: 600,
              color: C.cr,
              letterSpacing: "0.02em",
            }}
          >
            Profé
          </span>
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
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = C.cr)}
          onMouseLeave={(e) => (e.currentTarget.style.color = C.tx3)}
          aria-label="Close Profé"
        >
          {I.x}
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={messagesAreaStyle}>
        {messages.length === 0 && !loading && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flex: 1,
              gap: 12,
              opacity: 0.5,
            }}
          >
            <span style={{ color: C.rg, display: "flex" }}>{I.spark}</span>
            <span
              style={{
                fontFamily: "'Satoshi', sans-serif",
                fontSize: 16,
                color: C.tx3,
                textAlign: "center",
              }}
            >
              Ask Profé anything to get started.
            </span>
          </div>
        )}

        {messages.map((msg, i) => {
          const isUser = msg.role === "user";
          const isError = !!msg.error;
          const isLastError = isError && i === messages.length - 1;

          return (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: isUser ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "85%",
                  padding: "10px 14px",
                  borderRadius: 12,
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: 16,
                  lineHeight: 1.55,
                  ...(isError
                    ? {
                        background: `${C.red}14`,
                        borderLeft: `3px solid ${C.red}`,
                        color: "#F0A0A0",
                      }
                    : isUser
                      ? {
                          background: `${C.rg}14`,
                          borderLeft: `3px solid ${C.rg}`,
                          color: C.cr,
                        }
                      : {
                          background: C.ob2,
                          color: C.tx2,
                        }),
                }}
              >
                {isUser ? msg.content : renderMarkdown(msg.content)}
                {isLastError && lastFailedMsg && (
                  <button
                    onClick={handleRetry}
                    style={{
                      display: "block",
                      marginTop: 8,
                      padding: "4px 12px",
                      background: `${C.red}20`,
                      border: `1px solid ${C.red}40`,
                      borderRadius: 8,
                      color: "#F0A0A0",
                      fontSize: 13,
                      cursor: "pointer",
                      fontFamily: "'Satoshi', sans-serif",
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = `${C.red}30`)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = `${C.red}20`)
                    }
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                background: C.ob2,
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: C.tx3,
              }}
            >
              <span className="spin" style={{ display: "flex" }}>
                {I.loader}
              </span>
              <span
                style={{
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: 14,
                  color: C.tx3,
                }}
              >
                Thinking…
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={inputAreaStyle}>
        <div
          style={{
            flex: 1,
            background: C.ob1,
            border: `1px solid ${C.glassBrd}`,
            borderRadius: 12,
            display: "flex",
            alignItems: "flex-end",
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              resizeTextarea();
            }}
            onKeyDown={handleKey}
            placeholder="Ask Profé anything..."
            rows={1}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: C.cr,
              fontFamily: "'Satoshi', sans-serif",
              fontSize: 16,
              lineHeight: "22px",
              padding: "10px 14px",
              resize: "none",
              maxHeight: 22 * 4 + 16,
            }}
          />
        </div>
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            border: "none",
            background:
              loading || !input.trim()
                ? C.ob4
                : `linear-gradient(135deg, ${C.rg}, ${C.rg2})`,
            color: loading || !input.trim() ? C.tx4 : C.ob1,
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "all 0.2s",
          }}
          aria-label="Send message"
        >
          {I.send}
        </button>
      </div>
    </div>
  );
}
