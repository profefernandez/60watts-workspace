"use client";
import React, { useState, useEffect, useCallback } from "react";
import { C } from "../lib/colors";
import { glass } from "../lib/styles";
import { I } from "../lib/icons";
import { useAuth } from "../lib/auth";
import directus from "../lib/directus";
import type { Workspace } from "../lib/directus";
import { readItems, createItem, aggregate } from "@directus/sdk";
import CanvasEditor from "./CanvasEditor";
import KnowledgeBase from "./KnowledgeBase";
import ProfeChat from "./ProfeChat";

/* ═══════════════════════════════════════════════════════════
   60 WATTS OF CLARITY — v6
   Spline-inspired 3D Luxury Tech Aesthetic
   Obsidian · Rose Gold · Soft Cream · AI: Profé
   ═══════════════════════════════════════════════════════════ */

type ViewTab = "home" | "canvas" | "prototype" | "kb";

const NAV_ITEMS: { id: ViewTab; label: string; icon: React.ReactNode }[] = [
  { id: "home", label: "Home", icon: I.bulb },
  { id: "canvas", label: "Canvas", icon: I.board },
  { id: "prototype", label: "Prototype", icon: I.pen },
  { id: "kb", label: "Knowledge Base", icon: I.db },
];

const VIEW_LABELS: Record<ViewTab, string> = {
  home: "Home",
  canvas: "Canvas",
  prototype: "Prototype Studio",
  kb: "Knowledge Base",
};

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

export default function AppInner() {
  const { user, logout } = useAuth();
  const [view, setView] = useState<ViewTab>("home");
  const [collapsed, setCollapsed] = useState(false);
  const sideW = collapsed ? 60 : 230;

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWs, setActiveWs] = useState<Workspace | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [fileCounts, setFileCounts] = useState<Record<string, number>>({});
  const [wsLoading, setWsLoading] = useState(true);
  const [wsError, setWsError] = useState<string | null>(null);
  const [showProfe, setShowProfe] = useState(false);

  const fetchWorkspaces = useCallback(async () => {
    setWsLoading(true);
    setWsError(null);
    try {
      const items = await directus.request(readItems("workspaces", { sort: ["-updated_at"] }));
      setWorkspaces(items as Workspace[]);
      const counts: Record<string, number> = {};
      for (const ws of items as Workspace[]) {
        try {
          const result = await directus.request(aggregate("kb_files", { aggregate: { count: "*" }, query: { filter: { workspace_id: { _eq: ws.id } } } }));
          counts[ws.id] = Number(result[0]?.count ?? 0);
        } catch {
          counts[ws.id] = 0;
        }
      }
      setFileCounts(counts);
    } catch {
      setWsError("Could not connect to the backend. Make sure Directus is running.");
    } finally {
      setWsLoading(false);
    }
  }, []);

  useEffect(() => { fetchWorkspaces(); }, [fetchWorkspaces]);

  const handleCreate = async (name: string, description: string) => {
    try {
      await directus.request(createItem("workspaces", { name, description, user_id: user?.id }));
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

  const renderViewContent = () => {
    if (view === "home") {
      return (
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

          {wsLoading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: 80 }}>
              <span className="spin" style={{ color: C.rg }}>{I.loader}</span>
              <span style={{ fontSize: 18, color: C.tx3 }}>Loading workspaces…</span>
            </div>
          ) : wsError ? (
            <div style={{ ...glass(), padding: 32, textAlign: "center", maxWidth: 480, margin: "40px auto" }}>
              <div style={{ fontSize: 20, color: C.red, marginBottom: 12 }}>{wsError}</div>
              <button
                onClick={fetchWorkspaces}
                style={{
                  padding: "10px 24px", borderRadius: 10, border: "none",
                  background: `linear-gradient(135deg, ${C.rg}, ${C.rg2})`,
                  color: C.ob1, fontSize: 15, fontWeight: 700, fontFamily: "'Satoshi'", cursor: "pointer",
                }}
              >
                Retry
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
              <button
                onClick={() => setShowCreate(true)}
                style={{
                  ...glass(), padding: 32, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 12, minHeight: 180,
                  cursor: "pointer", border: `1px dashed ${C.glassBrd}`, transition: "all 0.2s",
                }}
              >
                <div style={{ color: C.rg, opacity: 0.7 }}>{I.plus}</div>
                <span style={{ fontSize: 16, color: C.tx3, fontFamily: "'Satoshi'" }}>Create Workspace</span>
              </button>
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => openWorkspace(ws)}
                  style={{
                    ...glass(), padding: 24, display: "flex", flexDirection: "column", gap: 12,
                    minHeight: 180, cursor: "pointer", textAlign: "left",
                    border: activeWs?.id === ws.id ? `1px solid ${C.rg}40` : `1px solid ${C.glassBrd}`,
                    transition: "all 0.2s",
                  }}
                >
                  <h3 style={{ fontFamily: "'Clash Display'", fontSize: 20, fontWeight: 600, color: C.cr, margin: 0 }}>
                    {ws.name}
                  </h3>
                  {ws.description && (
                    <p style={{ fontSize: 14, color: C.tx3, margin: 0, lineHeight: 1.5, flex: 1 }}>
                      {ws.description}
                    </p>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
                    <span style={{ fontSize: 13, color: C.tx4 }}>{fileCounts[ws.id] ?? 0} files</span>
                    <span style={{ fontSize: 13, color: C.tx4 }}>
                      {ws.updated_at ? new Date(ws.updated_at).toLocaleDateString() : ""}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (!activeWs) {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, height: "100%" }}>
          <div style={{ color: C.rg, opacity: 0.5 }}>{I.bulb}</div>
          <h2 style={{ fontFamily: "'Clash Display'", fontSize: 28, fontWeight: 700, color: C.cr }}>
            Select a Workspace
          </h2>
          <p style={{ fontSize: 18, color: C.tx3 }}>Go to Home and choose or create a workspace first</p>
          <button
            onClick={() => setView("home")}
            style={{
              marginTop: 8, padding: "10px 24px", borderRadius: 10, border: "none",
              background: `linear-gradient(135deg, ${C.rg}, ${C.rg2})`,
              color: C.ob1, fontSize: 15, fontWeight: 700, fontFamily: "'Satoshi'", cursor: "pointer",
            }}
          >
            Go to Home
          </button>
        </div>
      );
    }

    if (view === "canvas") {
      return <CanvasEditor workspaceId={activeWs.id} />;
    }

    if (view === "kb") {
      return <KnowledgeBase workspaceId={activeWs.id} />;
    }

    // Prototype Studio placeholder
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, height: "100%" }}>
        <h1 style={{ fontFamily: "'Clash Display'", fontSize: 40, fontWeight: 700, color: C.cr, letterSpacing: "-0.03em" }}>
          {VIEW_LABELS[view]}
        </h1>
        <p style={{ fontSize: 18, color: C.tx3 }}>Coming soon</p>
      </div>
    );
  };

  return (
    <div
      style={{
        display: "flex", height: "100vh", width: "100vw",
        fontFamily: "'Satoshi'", overflow: "hidden", color: C.tx, position: "relative",
      }}
    >
      {/* ── Layer 0: Background + Ambient Orbs ── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, background: `radial-gradient(ellipse at center, ${C.ob2} 0%, ${C.ob1} 70%)` }}>
        <div className="orb" style={{ width: 400, height: 400, background: `radial-gradient(circle, ${C.rg}18, transparent 70%)`, top: "15%", left: "10%", animationDuration: "8s" }} />
        <div className="orb" style={{ width: 350, height: 350, background: "radial-gradient(circle, rgba(138,100,200,0.12), transparent 70%)", top: "55%", right: "15%", animationDuration: "10s", animationDelay: "-3s" }} />
        <div className="orb" style={{ width: 300, height: 300, background: "radial-gradient(circle, rgba(232,180,100,0.10), transparent 70%)", bottom: "10%", left: "40%", animationDuration: "12s", animationDelay: "-6s" }} />
      </div>

      {/* ── Layer 1: Sidebar ── */}
      <nav
        style={{
          ...glass(), position: "fixed", left: 0, top: 0, bottom: 0, width: sideW, zIndex: 10,
          display: "flex", flexDirection: "column", borderRadius: 0,
          borderRight: `1px solid ${C.glassBrd}`, borderLeft: "none", borderTop: "none", borderBottom: "none",
          transition: "width 0.25s cubic-bezier(.4,0,.2,1)", overflow: "hidden",
        }}
      >
        <div style={{ padding: collapsed ? "20px 12px" : "20px 20px", borderBottom: `1px solid ${C.glassBrd}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div className="logo-glow" style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${C.rg}, ${C.rg2})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {I.bulb}
          </div>
          {!collapsed && (
            <span style={{ fontFamily: "'Clash Display'", fontSize: 16, fontWeight: 700, color: C.cr, whiteSpace: "nowrap", letterSpacing: "-0.02em" }}>
              60 Watts
            </span>
          )}
        </div>

        {!collapsed && (
          <div style={{ padding: "16px 20px 8px", fontSize: 11, fontWeight: 600, color: C.tx4, textTransform: "uppercase", letterSpacing: "0.08em" }}>
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
                  display: "flex", alignItems: "center", gap: 12, width: "100%",
                  padding: collapsed ? "12px 14px" : "10px 12px",
                  border: "none", borderRadius: 10,
                  background: active ? `${C.rg}14` : "transparent",
                  borderLeft: active ? `3px solid ${C.rg}` : "3px solid transparent",
                  color: active ? C.cr : C.tx3, cursor: "pointer",
                  fontFamily: "'Satoshi'", fontSize: 15, fontWeight: active ? 600 : 400,
                  transition: "all 0.15s", marginBottom: 4, whiteSpace: "nowrap",
                }}
              >
                <span style={{ flexShrink: 0, color: active ? C.rg : C.tx3 }}>{item.icon}</span>
                {!collapsed && item.label}
              </button>
            );
          })}
        </div>

        <div style={{ padding: "12px", borderTop: `1px solid ${C.glassBrd}` }}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "100%", padding: "8px", border: "none", borderRadius: 8,
              background: "transparent", color: C.tx4, cursor: "pointer", transition: "color 0.15s",
            }}
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: collapsed ? "rotate(180deg)" : "none", transition: "transform 0.25s" }}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>
      </nav>

      {/* ── Layer 2: Main Content Area ── */}
      <main style={{ marginLeft: sideW, flex: 1, display: "flex", flexDirection: "column", zIndex: 1, transition: "margin-left 0.25s cubic-bezier(.4,0,.2,1)", position: "relative" }}>
        <div
          style={{
            ...glass({ borderRadius: 0 }), padding: "12px 24px",
            borderBottom: `1px solid ${C.glassBrd}`, borderLeft: "none", borderRight: "none", borderTop: "none",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}
        >
          <span style={{ fontFamily: "'Clash Display'", fontSize: 18, fontWeight: 600, color: C.cr }}>
            {VIEW_LABELS[view]}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {activeWs && <span style={{ fontSize: 13, color: C.tx3 }}>{activeWs.name}</span>}
            <button
              onClick={logout}
              style={{
                padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.glassBrd}`,
                background: "transparent", color: C.tx4, fontSize: 13, fontFamily: "'Satoshi'", cursor: "pointer",
              }}
            >
              Sign out
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
          {renderViewContent()}
        </div>
      </main>

      {/* ── Layer 3: Floating Panels ── */}
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}

      {/* Profé FAB */}
      <button
        onClick={() => setShowProfe(!showProfe)}
        className="profe-sparkle"
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 50,
          width: 56, height: 56, borderRadius: 16,
          background: `linear-gradient(135deg, ${C.rg}, ${C.rg2})`,
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 4px 24px ${C.rg}40`,
          transition: "transform 0.2s, box-shadow 0.2s",
        }}
      >
        <span style={{ color: C.ob1 }}>{I.spark}</span>
      </button>

      <ProfeChat visible={showProfe} onClose={() => setShowProfe(false)} />
    </div>
  );
}
