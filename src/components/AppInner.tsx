"use client";
import React, { useState, useEffect, useCallback } from "react";
import { C } from "../lib/colors";
import { glass } from "../lib/styles";
import { I } from "../lib/icons";
import { useAuth } from "../lib/auth";
import directus from "../lib/directus";
import type { Workspace, KBFile, WorkspaceItem, AIThread, AIMessage } from "../lib/directus";
import { readItems, createItem, aggregate, updateItem } from "@directus/sdk";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* ═══════════════════════════════════════════════════════════
   60 WATTS OF CLARITY — v6
   Spline-inspired 3D Luxury Tech Aesthetic
   Obsidian · Rose Gold · Soft Cream · AI: Profé
   ═══════════════════════════════════════════════════════════ */

type ViewTab = "home" | "profe" | "canvas" | "prototype" | "kb";

const NAV_ITEMS: { id: ViewTab; label: string; icon: React.ReactNode }[] = [
  { id: "home", label: "Home", icon: I.bulb },
  { id: "profe", label: "Profé Command", icon: I.spark },
  { id: "canvas", label: "Canvas", icon: I.board },
  { id: "prototype", label: "Prototype", icon: I.pen },
  { id: "kb", label: "Knowledge Base", icon: I.db },
];

const VIEW_LABELS: Record<ViewTab, string> = {
  home: "Home",
  profe: "Global Command Center",
  canvas: "Canvas",
  prototype: "Prototype Studio",
  kb: "Knowledge Base",
};

// ── Create Workspace Modal ──
function CreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, desc: string) => void }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); if (name.trim()) onCreate(name.trim(), desc.trim()); }}
        style={{ ...glass(), padding: "32px", width: 420, maxWidth: "90vw", display: "flex", flexDirection: "column", gap: 20 }}
      >
        <h2 style={{ fontFamily: "'Clash Display'", fontSize: 24, fontWeight: 700, color: C.cr, margin: 0 }}>New Workspace</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 14, color: C.tx2, fontWeight: 500 }}>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required style={{ padding: "12px 16px", borderRadius: 10, border: `1px solid ${C.glassBrd}`, background: C.ob1, color: C.cr, fontSize: 16, fontFamily: "'Satoshi'", outline: "none" }} placeholder="My Research Project" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 14, color: C.tx2, fontWeight: 500 }}>Description</label>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} style={{ padding: "12px 16px", borderRadius: 10, border: `1px solid ${C.glassBrd}`, background: C.ob1, color: C.cr, fontSize: 16, fontFamily: "'Satoshi'", outline: "none", resize: "vertical" }} placeholder="Optional description…" />
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={{ padding: "10px 20px", borderRadius: 10, border: `1px solid ${C.glassBrd}`, background: "transparent", color: C.tx2, fontSize: 15, fontFamily: "'Satoshi'", cursor: "pointer" }}>Cancel</button>
          <button type="submit" style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${C.rg}, ${C.rg2})`, color: C.ob1, fontSize: 15, fontWeight: 700, fontFamily: "'Satoshi'", cursor: "pointer" }}>Create</button>
        </div>
      </form>
    </div>
  );
}

// ── Sortable Workspace Card ──
function SortableWorkspaceCard({ ws, activeWs, fileCount, onOpen }: { ws: Workspace, activeWs: Workspace | null, fileCount: number, onOpen: (ws: Workspace) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ws.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 2 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <button
        onClick={() => onOpen(ws)}
        style={{
          ...glass(),
          width: "100%",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          minHeight: 180,
          cursor: isDragging ? "grabbing" : "grab",
          textAlign: "left",
          border: activeWs?.id === ws.id ? `1px solid ${C.rg}40` : `1px solid ${C.glassBrd}`,
          transition: transition ? "none" : "all 0.2s",
        }}
      >
        <h3 style={{ fontFamily: "'Clash Display'", fontSize: 20, fontWeight: 600, color: C.cr, margin: 0 }}>
          {ws.name}
        </h3>
        {ws.description && <p style={{ fontSize: 14, color: C.tx3, margin: 0, lineHeight: 1.5, flex: 1 }}>{ws.description}</p>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", width: "100%" }}>
          <span style={{ fontSize: 13, color: C.tx4 }}>{fileCount} files</span>
          <span style={{ fontSize: 13, color: C.tx4 }}>
            {ws.date_updated ? new Date(ws.date_updated).toLocaleDateString() : (ws.date_created ? new Date(ws.date_created).toLocaleDateString() : "")}
          </span>
        </div>
      </button>
    </div>
  );
}

// ── Combined UI Type for Pinned Files ──
type UIFile = KBFile & { wsItemId: string };

// ── Sortable File Card ──
function SortableFileCard({ f }: { f: UIFile }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: f.wsItemId });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 2 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div style={{ ...glass(), padding: 20, display: "flex", flexDirection: "column", gap: 12, cursor: isDragging ? "grabbing" : "grab", transition: transition ? "none" : "all 0.2s" }}>
        <div style={{ color: C.rg }}>{I.file}</div>
        <div style={{ fontWeight: 600, color: C.cr, wordBreak: "break-all", fontSize: 16, fontFamily: "'Satoshi'" }}>{f.name}</div>
        <div style={{ display: "flex", justifyContent: "space-between", color: C.tx4, fontSize: 13, marginTop: "auto" }}>
          <span style={{ textTransform: "uppercase" }}>{f.type.split("/")[1] || f.type}</span>
          <span>{f.uploadedAt ? new Date(f.uploadedAt).toLocaleDateString() : (f.date_created ? new Date(f.date_created).toLocaleDateString() : "")}</span>
        </div>
      </div>
    </div>
  );
}

export default function AppInner() {
  const { user, logout } = useAuth();
  const [view, setView] = useState<ViewTab>("home");
  const [collapsed, setCollapsed] = useState(false);
  const sideW = collapsed ? 60 : 230;

  // Workspace state
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWs, setActiveWs] = useState<Workspace | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [fileCounts, setFileCounts] = useState<Record<string, number>>({});
  const [kbFiles, setKbFiles] = useState<UIFile[]>([]);
  const [activeThread, setActiveThread] = useState<AIThread | null>(null);
  const [chatMessages, setChatMessages] = useState<AIMessage[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Global Profé state
  const [globalThreads, setGlobalThreads] = useState<AIThread[]>([]);
  const [activeGlobalThread, setActiveGlobalThread] = useState<AIThread | null>(null);
  const [globalMessages, setGlobalMessages] = useState<AIMessage[]>([]);
  const [globalInput, setGlobalInput] = useState("");
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);

  const fetchWorkspaces = useCallback(async () => {
    if (!user?.id) return;
    try {
      const items = await directus.request(
        readItems("workspaces", {
          sort: ["sort"],
          filter: {
            status: { _neq: "archived" },
          },
        })
      );
      setWorkspaces(items as Workspace[]);
      // Fetch file counts per workspace
      const counts: Record<string, number> = {};
      for (const ws of items as Workspace[]) {
        try {
          const result = await directus.request(aggregate("workspace_items", { aggregate: { count: "*" }, query: { filter: { workspace_id: { _eq: ws.id }, item_type: { _eq: "kb_files" } } } }));
          counts[ws.id] = Number(result[0]?.count ?? 0);
        } catch {
          counts[ws.id] = 0;
        }
      }
      setFileCounts(counts);
    } catch {
      // Directus may not be connected yet
    }
  }, [user?.id]);

  useEffect(() => { fetchWorkspaces(); }, [fetchWorkspaces]);

  const fetchKbFiles = useCallback(async () => {
    if (!activeWs?.id) return;
    try {
      // Step 1: Fetch pinning items to preserve workspace-specific sorting
      const wsItems = await directus.request(
        readItems("workspace_items", {
          filter: { workspace_id: { _eq: activeWs.id }, item_type: { _eq: "kb_files" } },
          sort: ["sort"],
        })
      );

      if (wsItems.length > 0) {
        // Step 2: Resolve against global kb_files
        const fileIds = wsItems.map((wi) => wi.item_id);
        const files = await directus.request(readItems("kb_files", { filter: { id: { _in: fileIds } } }));

        // Map files to maintain wsItems sort order and include wsItemId for DND updates
        const uiFiles = wsItems.map((wi) => {
          const f = (files as KBFile[]).find((file) => file.id === wi.item_id);
          return f ? { ...f, wsItemId: wi.id } : null;
        }).filter(Boolean) as UIFile[];

        setKbFiles(uiFiles);
      } else {
        setKbFiles([]);
      }
    } catch (err) {
      console.error("Failed to fetch KB files:", err);
    }
  }, [activeWs?.id]);

  useEffect(() => {
    if (view === "kb" && activeWs) {
      fetchKbFiles();
    }
  }, [view, activeWs, fetchKbFiles]);

  const fetchChatHistory = useCallback(async () => {
    if (!activeWs?.id) return;
    try {
      // 1. Fetch the most recently updated thread for this workspace
      const threads = await directus.request(
        readItems("ai_threads", {
          filter: { workspace_id: { _eq: activeWs.id } },
          sort: ["-date_updated"],
          limit: 1,
        })
      );

      if (threads && threads.length > 0) {
        const thread = threads[0] as AIThread;
        setActiveThread(thread);

        // 2. Fetch the ordered messages for this thread
        const msgs = await directus.request(
          readItems("ai_messages", {
            filter: { thread_id: { _eq: thread.id } },
            sort: ["sort"],
          })
        );
        setChatMessages(msgs as AIMessage[]);
      } else {
        setActiveThread(null);
        setChatMessages([]);
      }
    } catch (err) {
      console.error("Failed to fetch chat history:", err);
    }
  }, [activeWs?.id]);

  useEffect(() => {
    if (activeWs) {
      fetchChatHistory();
    }
  }, [activeWs, fetchChatHistory]);

  const fetchGlobalChatHistory = useCallback(async () => {
    if (!user?.id) return;
    try {
      // 1. Fetch global threads (workspace_id is null)
      const threads = await directus.request(
        readItems("ai_threads", {
          filter: {
            workspace_id: { _null: true },
            thread_type: { _eq: "global_manager" }
          },
          sort: ["-date_updated"],
        })
      );
      setGlobalThreads(threads as AIThread[]);

      if (threads && threads.length > 0) {
        const thread = threads[0] as AIThread;
        setActiveGlobalThread(thread);

        // 2. Fetch the ordered messages for this global thread
        const msgs = await directus.request(
          readItems("ai_messages", {
            filter: { thread_id: { _eq: thread.id } },
            sort: ["sort"],
          })
        );
        setGlobalMessages(msgs as AIMessage[]);
      } else {
        setActiveGlobalThread(null);
        setGlobalMessages([]);
      }
    } catch (err) {
      console.error("Failed to fetch global chat history:", err);
    }
  }, [user?.id]);

  useEffect(() => {
    if (view === "profe") {
      fetchGlobalChatHistory();
    }
  }, [view, fetchGlobalChatHistory]);

  // ── Chat Handlers ──

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !activeWs?.id || !user?.id) return;
    const text = chatInput.trim();
    setChatInput("");
    setIsChatLoading(true);

    try {
      let threadId = activeThread?.id;
      if (!threadId) {
        const newThread = await directus.request(createItem("ai_threads", {
          workspace_id: activeWs.id,
          title: text.slice(0, 40),
          thread_type: "profe_general",
          status: "active",
        }));
        threadId = newThread.id;
        setActiveThread(newThread as AIThread);
      }

      const userMsg = await directus.request(createItem("ai_messages", {
        thread_id: threadId, role: "user", content: text, sort: chatMessages.length + 1,
      }));
      const updatedMessages = [...chatMessages, userMsg as AIMessage];
      setChatMessages(updatedMessages);

      const apiMessages = updatedMessages.map((m) => ({ role: m.role, content: m.content }));
      const response = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json"        body: JSON.stringify({ messages: apiMessages, agentId: activeThread?.agent_id, threadId }),
      });

      if (!response.ok) throw new Error("API failed");
      const data = await response.json();

      const aiMsg = await directus.request(createItem("ai_messages", {
        thread_id: threadId, role: "assistant", content: data.content || "No response.",
        sort: updatedMessages.length + 1, model_used: "launchlemonade",
      }));
      setChatMessages((prev) => [...prev, aiMsg as AIMessage]);

      await directus.request(updateItem("ai_threads", threadId, { last_message_at: new Date().toISOString() }));
    } catch (err) {
      console.error("Local Chat error:", err);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleSendGlobalMessage = async () => {
    if (!globalInput.trim() || !user?.id) return;
    const text = globalInput.trim();
    setGlobalInput("");
    setIsGlobalLoading(true);

    try {
      let threadId = activeGlobalThread?.id;
      if (!threadId) {
        const newThread = await directus.request(createItem("ai_threads", {
          workspace_id: null,
          title: text.slice(0, 40),
          thread_type: "global_manager",
          status: "active",
        }));
        threadId = newThread.id;
        setActiveGlobalThread(newThread as AIThread);
        setGlobalThreads((prev) => [newThread as AIThread, ...prev]);
      }

      const userMsg = await directus.request(createItem("ai_messages", {
        thread_id: threadId, role: "user", content: text, sort: globalMessages.length + 1,
      }));
      const updatedMessages = [...globalMessages, userMsg as AIMessage];
      setGlobalMessages(updatedMessages);

      const apiMessages = updatedMessages.map((m) => ({ role: m.role, content: m.content }));
      const response = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, agentId: activeGlobalThread?.agent_id, threadId }),
      });

      if (!response.ok) throw new Error("API failed");
      const data = await response.json();

      const aiMsg = await directus.request(createItem("ai_messages", {
        thread_id: threadId, role: "assistant", content: data.content || "No response.",
        sort: updatedMessages.length + 1, model_used: "launchlemonade",
      }));
      setGlobalMessages((prev) => [...prev, aiMsg as AIMessage]);

      await directus.request(updateItem("ai_threads", threadId, { last_message_at: new Date().toISOString() }));
    } catch (err) {
      console.error("Global Chat error:", err);
    } finally {
      setIsGlobalLoading(false);
    }
  };

  const handleCreate = async (name: string, description: string) => {
    try {
      const nextSort = workspaces.length + 1;
      await directus.request(createItem("workspaces", { name, description, sort: nextSort }));
      setShowCreate(false);
      fetchWorkspaces();
    } catch (err) {
      console.error("Failed to create workspace:", err);
    }
  };

  const openWorkspace = (ws: Workspace) => {
    setActiveWs(ws);
    setView("canvas");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    alert(`Upload stubbed for: ${file.name}`);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setWorkspaces((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const newArray = arrayMove(items, oldIndex, newIndex);

        // Fire and forget individual updates to keep UI snappy
        const updates = newArray.map((item, index) => ({ id: item.id, sort: index + 1 }));
        Promise.all(updates.map(u => directus.request(updateItem("workspaces", u.id, { sort: u.sort }))))
          .catch(err => console.error("Failed to update sort order", err));

        return newArray;
      });
    }
  };

  const handleFileDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setKbFiles((items) => {
        const oldIndex = items.findIndex((i) => i.wsItemId === active.id);
        const newIndex = items.findIndex((i) => i.wsItemId === over.id);
        const newArray = arrayMove(items, oldIndex, newIndex);

        // Fire and forget individual updates to keep UI snappy
        const updates = newArray.map((item, index) => ({ id: item.wsItemId, sort: index + 1 }));
        Promise.all(updates.map(u => directus.request(updateItem("workspace_items", u.id, { sort: u.sort }))))
          .catch(err => console.error("Failed to update file sort order", err));

        return newArray;
      });
    }
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        fontFamily: "'Satoshi'",
        overflow: "hidden",
        color: C.tx,
        position: "relative",
      }}
    >
      {/* ── Layer 0: Background + Ambient Orbs ── */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          background: `radial-gradient(ellipse at center, ${C.ob2} 0%, ${C.ob1} 70%)`,
        }}
      >
        {/* Rose gold orb */}
        <div
          className="orb"
          style={{
            width: 400,
            height: 400,
            background: `radial-gradient(circle, ${C.rg}18, transparent 70%)`,
            top: "15%",
            left: "10%",
            animationDuration: "8s",
          }}
        />
        {/* Violet orb */}
        <div
          className="orb"
          style={{
            width: 350,
            height: 350,
            background: "radial-gradient(circle, rgba(138,100,200,0.12), transparent 70%)",
            top: "55%",
            right: "15%",
            animationDuration: "10s",
            animationDelay: "-3s",
          }}
        />
        {/* Amber orb */}
        <div
          className="orb"
          style={{
            width: 300,
            height: 300,
            background: "radial-gradient(circle, rgba(232,180,100,0.10), transparent 70%)",
            bottom: "10%",
            left: "40%",
            animationDuration: "12s",
            animationDelay: "-6s",
          }}
        />
      </div>

      {/* ── Layer 1: Sidebar ── */}
      <nav
        style={{
          ...glass(),
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          width: sideW,
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          borderRadius: 0,
          borderRight: `1px solid ${C.glassBrd}`,
          borderLeft: "none",
          borderTop: "none",
          borderBottom: "none",
          transition: "width 0.25s cubic-bezier(.4,0,.2,1)",
          overflow: "hidden",
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: collapsed ? "20px 12px" : "20px 20px",
            borderBottom: `1px solid ${C.glassBrd}`,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            className="logo-glow"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: `linear-gradient(135deg, ${C.rg}, ${C.rg2})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {I.bulb}
          </div>
          {!collapsed && (
            <span
              style={{
                fontFamily: "'Clash Display'",
                fontSize: 16,
                fontWeight: 700,
                color: C.cr,
                whiteSpace: "nowrap",
                letterSpacing: "-0.02em",
              }}
            >
              60 Watts
            </span>
          )}
        </div>

        {/* Workspace section */}
        {!collapsed && (
          <div
            style={{
              padding: "16px 20px 8px",
              fontSize: 11,
              fontWeight: 600,
              color: C.tx4,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Workspace
          </div>
        )}
        <div style={{ flex: 1, padding: collapsed ? "8px 6px" : "4px 12px" }}>
          {NAV_ITEMS.map((item) => {
            const active = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  padding: collapsed ? "12px 14px" : "10px 12px",
                  border: "none",
                  borderRadius: 10,
                  background: active ? `${C.rg}14` : "transparent",
                  borderLeft: active ? `3px solid ${C.rg}` : "3px solid transparent",
                  color: active ? C.cr : C.tx3,
                  cursor: "pointer",
                  fontFamily: "'Satoshi'",
                  fontSize: 15,
                  fontWeight: active ? 600 : 400,
                  transition: "all 0.15s",
                  marginBottom: 4,
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ flexShrink: 0, color: active ? C.rg : C.tx3 }}>
                  {item.icon}
                </span>
                {!collapsed && item.label}
              </button>
            );
          })}
        </div>

        {/* Collapse toggle */}
        <div style={{ padding: "12px", borderTop: `1px solid ${C.glassBrd}` }}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              padding: "8px",
              border: "none",
              borderRadius: 8,
              background: "transparent",
              color: C.tx4,
              cursor: "pointer",
              transition: "color 0.15s",
            }}
          >
            <svg
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: collapsed ? "rotate(180deg)" : "none",
                transition: "transform 0.25s",
              }}
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>
      </nav>

      {/* ── Layer 2: Main Content Area ── */}
      <main
        style={{
          marginLeft: sideW,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          zIndex: 1,
          transition: "margin-left 0.25s cubic-bezier(.4,0,.2,1)",
          position: "relative",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            ...glass({ borderRadius: 0 }),
            padding: "12px 24px",
            borderBottom: `1px solid ${C.glassBrd}`,
            borderLeft: "none",
            borderRight: "none",
            borderTop: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontFamily: "'Clash Display'",
              fontSize: 18,
              fontWeight: 600,
              color: C.cr,
            }}
          >
            {VIEW_LABELS[view]}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {activeWs && <span style={{ fontSize: 13, color: C.tx3 }}>{activeWs.name}</span>}
            <button
              onClick={logout}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                border: `1px solid ${C.glassBrd}`,
                background: "transparent",
                color: C.tx4,
                fontSize: 13,
                fontFamily: "'Satoshi'",
                cursor: "pointer",
              }}
            >
              Sign out
            </button>
          </div>
        </div>

        {/* View content */}
        <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
          {view === "home" ? (
            /* ── Home: Workspace Grid ── */
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <div>
                  <h1 style={{ fontFamily: "'Clash Display'", fontSize: 32, fontWeight: 700, color: C.cr, letterSpacing: "-0.03em", margin: 0 }}>
                    Workspaces
                  </h1>
                  <p style={{ fontSize: 16, color: C.tx3, marginTop: 4 }}>
                    {activeWs ? `Active: ${activeWs.name}` : "Select or create a workspace"}
                  </p>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
                {/* Create card */}
                <button
                  onClick={() => setShowCreate(true)}
                  style={{
                    ...glass(),
                    padding: 32,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 12,
                    minHeight: 180,
                    cursor: "pointer",
                    border: `1px dashed ${C.glassBrd}`,
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{ color: C.rg, opacity: 0.7 }}>{I.plus}</div>
                  <span style={{ fontSize: 16, color: C.tx3, fontFamily: "'Satoshi'" }}>Create Workspace</span>
                </button>
                {/* Workspace cards */}
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={workspaces.map(w => w.id)} strategy={rectSortingStrategy}>
                    {workspaces.map((ws) => (
                      <SortableWorkspaceCard key={ws.id} ws={ws} activeWs={activeWs} fileCount={fileCounts[ws.id] ?? 0} onOpen={openWorkspace} />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          ) : view === "profe" ? (
            /* ── Global Profé Command Center ── */
            <div style={{ display: "flex", gap: 24, height: "100%" }}>
              {/* Left Column: Command History */}
              <div style={{ width: 300, display: "flex", flexDirection: "column", gap: 16 }}>
                <button style={{ ...glass(), width: "100%", padding: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: C.rg, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
                  {I.plus} <span style={{ fontFamily: "'Satoshi'" }}>New Command</span>
                </button>
                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
                  {globalThreads.length === 0 ? (
                    <div style={{ color: C.tx4, fontSize: 13, textAlign: "center", marginTop: 20 }}>No command history found.</div>
                  ) : (
                    globalThreads.map(thread => (
                      <button key={thread.id} onClick={() => setActiveGlobalThread(thread)} style={{ ...glass(), padding: 16, textAlign: "left", cursor: "pointer", border: activeGlobalThread?.id === thread.id ? `1px solid ${C.rg}60` : `1px solid ${C.glassBrd}` }}>
                        <div style={{ fontWeight: 600, color: C.cr, fontSize: 15, fontFamily: "'Satoshi'", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{thread.title || "New Session"}</div>
                        <div style={{ fontSize: 12, color: C.tx4 }}>{thread.date_updated ? new Date(thread.date_updated).toLocaleDateString() : ""}</div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column: Active Command Interface */}
              <div style={{ ...glass(), flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.glassBrd}`, background: "rgba(0,0,0,0.2)", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ color: C.rg, width: 32, height: 32, borderRadius: 8, background: `${C.rg}1A`, display: "flex", alignItems: "center", justifyContent: "center" }}>{I.spark}</div>
                  <div>
                    <h2 style={{ fontFamily: "'Clash Display'", fontSize: 20, fontWeight: 600, color: C.cr, margin: 0 }}>Global Orchestrator</h2>
                    <p style={{ fontSize: 13, color: C.tx3, margin: 0 }}>Cross-workspace commands & team management</p>
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                  {globalMessages.length === 0 ? (
                    <div style={{ margin: "auto", textAlign: "center", color: C.tx3, fontSize: 15, maxWidth: 400 }}>
                      <div style={{ color: C.rg, opacity: 0.5, marginBottom: 12, display: "flex", justifyContent: "center" }}><div style={{ transform: "scale(1.5)" }}>{I.spark}</div></div>
                      I am your Global Profé. Ask me to search across all workspaces, summarize global research, or orchestrate specific workspace agents.
                    </div>
                  ) : (
                    globalMessages.map(msg => (
                      <div key={msg.id} style={{ alignSelf: msg.role === "user" ? "flex-end" : "flex-start", background: msg.role === "user" ? `${C.rg}1A` : C.glass, border: `1px solid ${msg.role === "user" ? `${C.rg}40` : C.glassBrd}`, padding: "16px 20px", borderRadius: 16, maxWidth: "80%", fontSize: 15, color: C.cr, lineHeight: 1.6 }}>
                        {msg.content}
                      </div>
                    ))
                  )}
                </div>

                <div style={{ padding: 24, borderTop: `1px solid ${C.glassBrd}`, background: "rgba(0,0,0,0.2)" }}>
                  <div style={{ ...glass(), padding: "12px 16px", display: "flex", gap: 12, alignItems: "center", background: C.ob2 }}>
                    <input 
                      value={globalInput}
                      onChange={(e) => setGlobalInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSendGlobalMessage(); }}
                      placeholder="Ask the Global Profé to manage your workspaces..." 
                      style={{ flex: 1, background: "transparent", border: "none", color: C.cr, outline: "none", fontSize: 16, fontFamily: "'Satoshi'" }} 
                    />
                    <button onClick={handleSendGlobalMessage} disabled={isGlobalLoading} style={{ background: `linear-gradient(135deg, ${C.rg}, ${C.rg2})`, border: "none", color: C.ob1, padding: "8px 16px", borderRadius: 8, cursor: isGlobalLoading ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 8, fontWeight: 600, fontFamily: "'Satoshi'", opacity: isGlobalLoading ? 0.7 : 1 }}>
                      {isGlobalLoading ? "Thinking..." : <>{I.send} Send</>}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : view === "kb" && activeWs ? (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <h1 style={{ fontFamily: "'Clash Display'", fontSize: 32, fontWeight: 700, color: C.cr, margin: 0 }}>
                    Knowledge Base
                  </h1>
                  <p style={{ fontSize: 16, color: C.tx3, marginTop: 4 }}>
                    Files for {activeWs.name}
                  </p>
                </div>
                <label style={{ ...glass(), padding: "10px 20px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: C.rg, fontWeight: 600, transition: "background 0.2s" }}>
                  {I.upload}
                  <span style={{ fontSize: 15, fontFamily: "'Satoshi'" }}>Upload File</span>
                  <input type="file" style={{ display: "none" }} onChange={handleFileUpload} />
                </label>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 }}>
                {kbFiles.length === 0 ? (
                  <div style={{ gridColumn: "1 / -1", textAlign: "center", color: C.tx3, padding: 40, ...glass() }}>
                    No files found in this workspace yet.
                  </div>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleFileDragEnd}>
                    <SortableContext items={kbFiles.map(f => f.wsItemId)} strategy={rectSortingStrategy}>
                      {kbFiles.map(f => (
                        <SortableFileCard key={f.wsItemId} f={f} />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </div>
          ) : (
            /* ── Other views: placeholder ── */
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, height: "100%" }}>
              <h1 style={{ fontFamily: "'Clash Display'", fontSize: 40, fontWeight: 700, color: C.cr, letterSpacing: "-0.03em" }}>
                {VIEW_LABELS[view]}
              </h1>
              <p style={{ fontSize: 18, color: C.tx3 }}>
                {activeWs ? `Workspace: ${activeWs.name}` : "Select a workspace from Home"}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* ── Layer 3: Floating Panels ── */}
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}

      {/* Profé Floating Chat Toggle */}
      {activeWs && (
        <button
          onClick={() => setShowChat(!showChat)}
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 100,
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${C.rg}, ${C.rg2})`,
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 24px rgba(232,168,124,0.3)",
            color: C.ob1,
          }}
        >
          {I.spark}
        </button>
      )}

      {/* Profé Floating Chat Panel */}
      {activeWs && showChat && (
        <div
          style={{
            ...glass(),
            position: "fixed",
            bottom: 96,
            right: 24,
            width: 380,
            height: 600,
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 10px 40px rgba(0,0,0,0.5)"
          }}
        >
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.glassBrd}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ color: C.rg }}>{I.spark}</div>
              <span style={{ fontFamily: "'Clash Display'", fontSize: 16, fontWeight: 600, color: C.cr }}>Profé AI</span>
            </div>
            <button onClick={() => setShowChat(false)} style={{ background: "transparent", border: "none", color: C.tx3, cursor: "pointer", display: "flex" }}>{I.x}</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            {chatMessages.length === 0 ? (
              <div style={{ margin: "auto", textAlign: "center", color: C.tx3, fontSize: 14 }}>
                No messages yet. Start a conversation!
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div key={msg.id} style={{ alignSelf: msg.role === "user" ? "flex-end" : "flex-start", background: msg.role === "user" ? `${C.rg}1A` : C.glass, border: `1px solid ${msg.role === "user" ? `${C.rg}40` : C.glassBrd}`, padding: "12px 16px", borderRadius: 12, maxWidth: "85%", fontSize: 14, color: C.cr, lineHeight: 1.5 }}>
                  {msg.content}
                </div>
              ))
            )}
          </div>
          <div style={{ padding: 16, borderTop: `1px solid ${C.glassBrd}`, background: "rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", gap: 8, background: C.ob2, borderRadius: 8, padding: 8, border: `1px solid ${C.glassBrd}` }}>
              <input 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSendMessage(); }}
                placeholder="Ask Profé..." style={{ flex: 1, background: "transparent", border: "none", color: C.cr, outline: "none", fontSize: 14, fontFamily: "'Satoshi'" }} 
              />
              <button onClick={handleSendMessage} disabled={isChatLoading} style={{ background: "transparent", border: "none", color: C.rg, cursor: isChatLoading ? "wait" : "pointer", display: "flex", alignItems: "center", opacity: isChatLoading ? 0.5 : 1 }}>{isChatLoading ? "..." : I.send}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
