"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";
import { C } from "../lib/colors";
import { glass } from "../lib/styles";
import { I } from "../lib/icons";
import type { CanvasBlock, KBFile } from "../lib/directus";
import { fetchCanvasContext, fetchKBContext } from "../lib/store";

// ── Types ──

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

type PanelState = "closed" | "minimized" | "open";

interface Props {
  workspaceId: string | null;
}

// ── Helpers ──

let _uid = 0;
function uid(): string {
  return `msg_${Date.now()}_${++_uid}`;
}

// Intent detection
const IMAGE_RE =
  /\b(image|picture|draw|sketch|show me|generate image)\b/i;
const PROTOTYPE_RE =
  /\b(prototype|design|build page|html|layout|landing|mockup)\b/i;

function detectIntent(text: string): "image" | "prototype" | "chat" {
  if (IMAGE_RE.test(text)) return "image";
  if (PROTOTYPE_RE.test(text)) return "prototype";
  return "chat";
}

function pollinationsUrl(prompt: string): string {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true`;
}

// ── Component ──

export default function ProfePanel({ workspaceId }: Props) {
  const [state, setState] = useState<PanelState>("closed");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  // Drag state
  const [pos, setPos] = useState({ x: -1, y: -1 });
  const dragRef = useRef<{ ox: number; oy: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize position once on open
  useEffect(() => {
    if (state === "open" && pos.x === -1) {
      setPos({
        x: window.innerWidth - 380 - 24,
        y: window.innerHeight - 520 - 24,
      });
    }
  }, [state, pos.x]);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  // ── Drag handlers ──
  const onDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (state !== "open") return;
      e.preventDefault();
      dragRef.current = { ox: e.clientX - pos.x, oy: e.clientY - pos.y };

      const onMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const nx = Math.max(0, Math.min(window.innerWidth - 380, ev.clientX - dragRef.current.ox));
        const ny = Math.max(0, Math.min(window.innerHeight - 100, ev.clientY - dragRef.current.oy));
        setPos({ x: nx, y: ny });
      };

      const onUp = () => {
        dragRef.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [state, pos]
  );

  // ── Build context ──
  const buildContext = useCallback(async (): Promise<{
    canvas_blocks?: string;
    kb_files?: string;
  }> => {
    const ctx: { canvas_blocks?: string; kb_files?: string } = {};
    if (!workspaceId) return ctx;
    try {
      const blocks = await fetchCanvasContext(workspaceId);
      if (blocks.length > 0) {
        ctx.canvas_blocks = blocks
          .map((b) => `[${b.type}] ${(b.content || "").slice(0, 100)}`)
          .join("; ");
      }
    } catch {
      /* Store unavailable */
    }

    try {
      const files = await fetchKBContext(workspaceId);
      if (files.length > 0) {
        ctx.kb_files = files.map((f) => f.file).join(", ");
      }
    } catch {
      /* Store unavailable */
    }

    return ctx;
  }, [workspaceId]);

  // ── Send message ──
  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: ChatMessage = { id: uid(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const intent = detectIntent(text);

      // Image intent — generate client-side via Pollinations
      if (intent === "image") {
        const url = pollinationsUrl(text);
        const assistantMsg: ChatMessage = {
          id: uid(),
          role: "assistant",
          content: `Here's what I generated for you:\n\n![Generated image](${url})\n\nI created this image based on your description. Let me know if you'd like any changes!`,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setSending(false);
        return;
      }

      // Build context
      const context = await buildContext();

      // Last 8 messages for history
      const recentMessages = [...messages, userMsg].slice(-8);
      const history = recentMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Augment message for prototype intent
      let finalMessage = text;
      if (intent === "prototype") {
        finalMessage = `${text}\n\nPlease wrap any HTML/CSS code in CODE_START and CODE_END markers.`;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...history, { role: "user", content: finalMessage }],
          context,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: uid(),
        role: "assistant",
        content: data.content || "I didn't get a response. Please try again.",
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorContent =
        err instanceof Error ? err.message : "Something went wrong.";
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          content: `I ran into an issue: ${errorContent}`,
        },
      ]);
    } finally {
      setSending(false);
    }
  }, [input, sending, messages, buildContext]);

  // ── Key handler ──
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  // ── Render: Closed (FAB) ──
  if (state === "closed") {
    return (
      <button
        onClick={() => setState("open")}
        className="profe-sparkle"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 52,
          height: 52,
          borderRadius: "50%",
          border: "none",
          cursor: "pointer",
          background: `linear-gradient(135deg, ${C.rg}, ${C.rg2})`,
          color: C.ob1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 4px 20px ${C.rgGlow}, 0 0 40px ${C.rgGlow}`,
          zIndex: 9999,
          transition: "transform 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        title="Open Profé AI assistant"
      >
        {I.spark}
      </button>
    );
  }

  // ── Render: Minimized (header bar) ──
  if (state === "minimized") {
    return (
      <div
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          ...glass({
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 16px",
            zIndex: 9999,
            cursor: "default",
          }),
        }}
      >
        <span
          style={{
            color: C.rg,
            fontFamily: "'Clash Display'",
            fontWeight: 600,
            fontSize: 16,
          }}
        >
          Prof&eacute;
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setState("open")}
          style={{
            background: "transparent",
            border: "none",
            color: C.tx3,
            cursor: "pointer",
            padding: 4,
            display: "flex",
          }}
          title="Expand"
        >
          {I.max}
        </button>
        <button
          onClick={() => setState("closed")}
          style={{
            background: "transparent",
            border: "none",
            color: C.tx3,
            cursor: "pointer",
            padding: 4,
            display: "flex",
          }}
          title="Close"
        >
          {I.x}
        </button>
      </div>
    );
  }

  // ── Render: Open (full panel) ──
  return (
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        left: pos.x === -1 ? undefined : pos.x,
        top: pos.y === -1 ? undefined : pos.y,
        right: pos.x === -1 ? 24 : undefined,
        bottom: pos.y === -1 ? 24 : undefined,
        width: 380,
        height: 480,
        display: "flex",
        flexDirection: "column",
        zIndex: 9999,
        ...glass({
          boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 60px ${C.rgGlow}`,
          overflow: "hidden",
        }),
      }}
    >
      {/* ── Header ── */}
      <div
        onMouseDown={onDragStart}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          borderBottom: `1px solid ${C.glassBrd}`,
          cursor: "grab",
          userSelect: "none",
          flexShrink: 0,
        }}
      >
        {/* Drag handle dots */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 3,
            opacity: 0.4,
          }}
        >
          <div style={{ display: "flex", gap: 3 }}>
            <div style={{ width: 3, height: 3, borderRadius: "50%", background: C.tx3 }} />
            <div style={{ width: 3, height: 3, borderRadius: "50%", background: C.tx3 }} />
          </div>
          <div style={{ display: "flex", gap: 3 }}>
            <div style={{ width: 3, height: 3, borderRadius: "50%", background: C.tx3 }} />
            <div style={{ width: 3, height: 3, borderRadius: "50%", background: C.tx3 }} />
          </div>
        </div>

        <span
          style={{
            color: C.rg,
            fontFamily: "'Clash Display'",
            fontWeight: 600,
            fontSize: 18,
          }}
        >
          Prof&eacute;
        </span>

        <div style={{ flex: 1 }} />

        <button
          onClick={() => setState("minimized")}
          style={{
            background: "transparent",
            border: "none",
            color: C.tx3,
            cursor: "pointer",
            padding: 4,
            display: "flex",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = C.tx2)}
          onMouseLeave={(e) => (e.currentTarget.style.color = C.tx3)}
          title="Minimize"
        >
          {I.min}
        </button>
        <button
          onClick={() => setState("closed")}
          style={{
            background: "transparent",
            border: "none",
            color: C.tx3,
            cursor: "pointer",
            padding: 4,
            display: "flex",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = C.red)}
          onMouseLeave={(e) => (e.currentTarget.style.color = C.tx3)}
          title="Close"
        >
          {I.x}
        </button>
      </div>

      {/* ── Chat messages ── */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "12px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {messages.length === 0 && !sending && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: 12,
              opacity: 0.5,
            }}
          >
            <div style={{ color: C.rg }}>{I.spark}</div>
            <p
              style={{
                fontFamily: "'Satoshi'",
                fontSize: 15,
                color: C.tx3,
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              Hi! I&apos;m Prof&eacute;, your AI assistant.
              <br />
              Ask me anything about your workspace.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              padding: "10px 14px",
              borderRadius: 14,
              background:
                msg.role === "user" ? C.glassB : C.glass,
              border: `1px solid ${C.glassBrd}`,
              fontFamily: "'Satoshi'",
              fontSize: 15,
              lineHeight: 1.55,
              color: msg.role === "user" ? C.cr : C.tx2,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {msg.content}
          </div>
        ))}

        {/* Typing indicator */}
        {sending && (
          <div
            style={{
              alignSelf: "flex-start",
              display: "flex",
              gap: 5,
              padding: "12px 16px",
              borderRadius: 14,
              background: C.glass,
              border: `1px solid ${C.glassBrd}`,
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: C.tx3,
                  animation: `profeSparkle 1.2s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* ── Input area ── */}
      <div
        style={{
          padding: "10px 14px",
          borderTop: `1px solid ${C.glassBrd}`,
          display: "flex",
          gap: 8,
          alignItems: "flex-end",
          flexShrink: 0,
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask Profé anything..."
          rows={1}
          style={{
            flex: 1,
            resize: "none",
            background: C.glass,
            border: `1px solid ${C.glassBrd}`,
            borderRadius: 12,
            padding: "10px 14px",
            fontFamily: "'Satoshi'",
            fontSize: 15,
            color: C.cr,
            outline: "none",
            lineHeight: 1.5,
            maxHeight: 100,
            overflow: "auto",
          }}
          onFocus={(e) =>
            (e.currentTarget.style.borderColor = `${C.rg}60`)
          }
          onBlur={(e) =>
            (e.currentTarget.style.borderColor = C.glassBrd)
          }
        />
        <button
          onClick={sendMessage}
          disabled={sending || !input.trim()}
          className="gradient-shift"
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            border: "none",
            cursor: sending || !input.trim() ? "default" : "pointer",
            background:
              sending || !input.trim()
                ? C.glass
                : `linear-gradient(135deg, ${C.rg}, ${C.rg2}, ${C.rg})`,
            color: sending || !input.trim() ? C.tx4 : C.ob1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "opacity 0.15s",
            opacity: sending || !input.trim() ? 0.5 : 1,
          }}
          title="Send message"
        >
          {I.send}
        </button>
      </div>
    </div>
  );
}
