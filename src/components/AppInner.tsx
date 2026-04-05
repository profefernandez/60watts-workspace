"use client";
import React, { useState, useEffect, useCallback } from "react";
import { C } from "../lib/colors";
import { glass } from "../lib/styles";
import { I } from "../lib/icons";
import { useAuth } from "../lib/auth";
import type { Workspace } from "../lib/directus";
import {
  fetchWorkspaces as storeFetchWorkspaces,
  createWorkspace,
  updateWorkspace,
  getWorkspaceFileCounts,
} from "../lib/store";
import CanvasView from "./CanvasView";
import KBView from "./KBView";
import PrototypeView from "./PrototypeView";
import WorkspaceSurface from "./WorkspaceSurface";
import ProfePanel from "./ProfePanel";
import ResearchModal from "./ResearchModal";
import YouTubeModal from "./YouTubeModal";
import SettingsView from "./SettingsView";
import SearchBar from "./SearchBar";
import SearchResultsPanel from "./SearchResultsPanel";
import SourceBrowser from "./SourceBrowser";
import type { SearchCardData } from "@/lib/types";

/* ═══════════════════════════════════════════════════════════
   60 WATTS OF CLARITY — v6
   Spline-inspired 3D Luxury Tech Aesthetic
   Obsidian · Rose Gold · Soft Cream · AI: Profé
   ═══════════════════════════════════════════════════════════ */

type ViewTab = "home" | "workspace" | "kb" | "research" | "videos" | "settings";

const VIEW_LABELS: Record<string, string> = {
  home: "Home",
  workspace: "",
  kb: "Knowledge Base",
  research: "Research",
  videos: "Video Library",
  settings: "Settings",
};

// ── Workspace background image helpers (localStorage) ──
function getWsBg(wsId: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(`60w_ws_bg_${wsId}`);
}
function setWsBg(wsId: string, dataUrl: string) {
  localStorage.setItem(`60w_ws_bg_${wsId}`, dataUrl);
}

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
        <h2 style={{ fontFamily: "'Clash Display'", fontSize: 26, fontWeight: 700, color: C.cr, margin: 0 }}>New Workspace</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 16, color: C.tx2, fontWeight: 500 }}>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required style={{ padding: "12px 16px", borderRadius: 10, border: `1px solid ${C.glassBrd}`, background: C.ob1, color: C.cr, fontSize: 18, fontFamily: "'Satoshi'", outline: "none" }} placeholder="My Research Project" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 16, color: C.tx2, fontWeight: 500 }}>Description</label>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} style={{ padding: "12px 16px", borderRadius: 10, border: `1px solid ${C.glassBrd}`, background: C.ob1, color: C.cr, fontSize: 18, fontFamily: "'Satoshi'", outline: "none", resize: "vertical" }} placeholder="Optional description…" />
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={{ padding: "10px 20px", borderRadius: 10, border: `1px solid ${C.glassBrd}`, background: "transparent", color: C.tx2, fontSize: 16, fontFamily: "'Satoshi'", cursor: "pointer" }}>Cancel</button>
          <button type="submit" style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${C.rg}, ${C.rg2})`, color: C.ob1, fontSize: 16, fontWeight: 700, fontFamily: "'Satoshi'", cursor: "pointer" }}>Create</button>
        </div>
      </form>
    </div>
  );
}

// ── Edit Workspace Modal ──
function EditModal({ ws, onClose, onSave }: { ws: Workspace; onClose: () => void; onSave: (name: string, desc: string, bgImage: string | null) => void }) {
  const [name, setName] = useState(ws.name);
  const [desc, setDesc] = useState(ws.description || "");
  const [bgPreview, setBgPreview] = useState<string | null>(getWsBg(ws.id));

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setBgPreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSave(name.trim(), desc.trim(), bgPreview); }}
        style={{ ...glass(), padding: "32px", width: 480, maxWidth: "90vw", display: "flex", flexDirection: "column", gap: 20 }}
      >
        <h2 style={{ fontFamily: "'Clash Display'", fontSize: 26, fontWeight: 700, color: C.cr, margin: 0 }}>Edit Workspace</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 16, color: C.tx2, fontWeight: 500 }}>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required style={{ padding: "12px 16px", borderRadius: 10, border: `1px solid ${C.glassBrd}`, background: C.ob1, color: C.cr, fontSize: 18, fontFamily: "'Satoshi'", outline: "none" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 16, color: C.tx2, fontWeight: 500 }}>Description</label>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} style={{ padding: "12px 16px", borderRadius: 10, border: `1px solid ${C.glassBrd}`, background: C.ob1, color: C.cr, fontSize: 18, fontFamily: "'Satoshi'", outline: "none", resize: "vertical" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 16, color: C.tx2, fontWeight: 500 }}>Background Image</label>
          {bgPreview && (
            <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", height: 120, marginBottom: 8 }}>
              <img src={bgPreview} alt="Background preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <button
                type="button"
                onClick={() => setBgPreview(null)}
                style={{ position: "absolute", top: 6, right: 6, width: 28, height: 28, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                &times;
              </button>
            </div>
          )}
          <label
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "12px 16px", borderRadius: 10, border: `1px dashed ${C.glassBrd}`,
              background: "rgba(255,255,255,0.02)", color: C.tx3, fontSize: 16,
              fontFamily: "'Satoshi'", cursor: "pointer", transition: "all 0.15s",
            }}
          >
            <span style={{ color: C.rg }}>{I.img}</span>
            {bgPreview ? "Change image" : "Upload image"}
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
          </label>
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={{ padding: "10px 20px", borderRadius: 10, border: `1px solid ${C.glassBrd}`, background: "transparent", color: C.tx2, fontSize: 16, fontFamily: "'Satoshi'", cursor: "pointer" }}>Cancel</button>
          <button type="submit" style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${C.rg}, ${C.rg2})`, color: C.ob1, fontSize: 16, fontWeight: 700, fontFamily: "'Satoshi'", cursor: "pointer" }}>Save</button>
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

  // Workspace state
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWs, setActiveWs] = useState<Workspace | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [fileCounts, setFileCounts] = useState<Record<string, number>>({});
  const [editingWs, setEditingWs] = useState<Workspace | null>(null);
  const [wsBgImages, setWsBgImages] = useState<Record<string, string>>({});
  const [showResearch, setShowResearch] = useState(false);
  const [showYouTube, setShowYouTube] = useState(false);
  const [protoCode, setProtoCode] = useState<string | undefined>();
  const [searchResults, setSearchResults] = useState<SearchCardData[]>([]);
  const [searchError, setSearchError] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [sourceBrowserUrl, setSourceBrowserUrl] = useState<string | null>(null);

  const fetchWorkspaces = useCallback(async () => {
    try {
      const items = await storeFetchWorkspaces();
      setWorkspaces(items);
      const counts = await getWorkspaceFileCounts(items);
      setFileCounts(counts);
    } catch {
      // Store unavailable
    }
  }, []);

  useEffect(() => { fetchWorkspaces(); }, [fetchWorkspaces]);

  // Load background images for all workspaces
  useEffect(() => {
    const bgs: Record<string, string> = {};
    workspaces.forEach((ws) => {
      const bg = getWsBg(ws.id);
      if (bg) bgs[ws.id] = bg;
    });
    setWsBgImages(bgs);
  }, [workspaces]);

  const handleCreate = async (name: string, description: string) => {
    try {
      await createWorkspace({ name, description, user_id: user?.id });
      setShowCreate(false);
      fetchWorkspaces();
    } catch (err) {
      console.error("Failed to create workspace:", err);
    }
  };

  const handleEditSave = async (name: string, description: string, bgImage: string | null) => {
    if (!editingWs) return;
    try {
      await updateWorkspace(editingWs.id, { name, description });
      if (bgImage) {
        setWsBg(editingWs.id, bgImage);
        setWsBgImages((prev) => ({ ...prev, [editingWs.id]: bgImage }));
      } else {
        localStorage.removeItem(`60w_ws_bg_${editingWs.id}`);
        setWsBgImages((prev) => {
          const next = { ...prev };
          delete next[editingWs.id];
          return next;
        });
      }
      setEditingWs(null);
      fetchWorkspaces();
    } catch (err) {
      console.error("Failed to update workspace:", err);
    }
  };

  const openWorkspace = (ws: Workspace) => {
    setActiveWs(ws);
    setView("workspace");
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

        {/* Workspaces section */}
        {!collapsed && (
          <div
            style={{
              padding: "16px 20px 8px",
              fontSize: 13,
              fontWeight: 600,
              color: C.tx4,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Workspaces
          </div>
        )}
        <div style={{ padding: collapsed ? "4px 6px" : "4px 12px", overflow: "auto" }}>
          {/* Home button */}
          {(() => {
            const active = view === "home";
            return (
              <button
                onClick={() => setView("home")}
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
                  fontSize: 17,
                  fontWeight: active ? 600 : 400,
                  transition: "all 0.15s",
                  marginBottom: 4,
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ flexShrink: 0, color: active ? C.rg : C.tx3 }}>
                  {I.bulb}
                </span>
                {!collapsed && "Home"}
              </button>
            );
          })()}

          {/* Workspace list */}
          {workspaces.map((ws) => {
            const active = view === "workspace" && activeWs?.id === ws.id;
            return (
              <button
                key={ws.id}
                onClick={() => openWorkspace(ws)}
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
                  fontSize: 17,
                  fontWeight: active ? 600 : 400,
                  transition: "all 0.15s",
                  marginBottom: 4,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: active ? C.rg : C.tx4,
                    display: "inline-block",
                  }}
                />
                {!collapsed && ws.name}
              </button>
            );
          })}

          {/* New Workspace button */}
          <button
            onClick={() => setShowCreate(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              width: "100%",
              padding: collapsed ? "12px 14px" : "10px 12px",
              border: "none",
              borderRadius: 10,
              background: "transparent",
              borderLeft: "3px solid transparent",
              color: C.tx4,
              cursor: "pointer",
              fontFamily: "'Satoshi'",
              fontSize: 15,
              fontWeight: 400,
              transition: "all 0.15s",
              marginBottom: 4,
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ flexShrink: 0, color: C.tx4 }}>{I.plus}</span>
            {!collapsed && "New Workspace"}
          </button>
        </div>

        {/* Global section */}
        {!collapsed && (
          <div style={{ padding: "12px 20px 8px", fontSize: 13, fontWeight: 600, color: C.tx4, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Global
          </div>
        )}
        <div style={{ padding: collapsed ? "4px 6px" : "4px 12px" }}>
          {[
            { id: "kb", label: "Knowledge Base", icon: I.db, action: () => setView("kb") },
            { id: "research", label: "Research", icon: I.search, action: () => setShowResearch(true) },
            { id: "videos", label: "Video Library", icon: I.yt, action: () => setShowYouTube(true) },
          ].map((item) => {
            const active = view === item.id;
            return (
              <button
                key={item.id}
                onClick={item.action}
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
                  fontSize: 17,
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

        {/* Bottom section: user profile + collapse */}
        <div style={{ marginTop: "auto", borderTop: `1px solid ${C.glassBrd}` }}>
          {/* User profile */}
          {!collapsed && (
            <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${C.rg}, ${C.rg2})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 700,
                  color: C.ob1,
                  fontFamily: "'Satoshi'",
                  flexShrink: 0,
                }}
              >
                {user?.first_name
                  ? [user.first_name, user.last_name]
                      .filter(Boolean)
                      .map((w) => w![0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)
                  : "?"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.cr, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {user?.first_name ? `${user.first_name}${user.last_name ? ` ${user.last_name}` : ""}` : "User"}
                </div>
                <button
                  onClick={() => setView("settings")}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    fontSize: 13,
                    color: C.tx4,
                    cursor: "pointer",
                    fontFamily: "'Satoshi'",
                    textDecoration: "underline",
                    textUnderlineOffset: 2,
                  }}
                >
                  Settings
                </button>
              </div>
            </div>
          )}

          {/* Collapse toggle */}
          <div style={{ padding: "12px" }}>
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
              fontSize: 22,
              fontWeight: 600,
              color: C.cr,
              flexShrink: 0,
            }}
          >
            {view === "workspace" && activeWs ? activeWs.name : VIEW_LABELS[view]}
          </span>
          <SearchBar
            onResults={(results) => {
              setSearchResults(results);
              setSearchError("");
              setShowSearchResults(true);
            }}
            onLoading={() => {}}
            onError={(err) => {
              setSearchError(err);
              setShowSearchResults(true);
            }}
            canvasBlocks={[]}
            kbFiles={[]}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
            {activeWs && <span style={{ fontSize: 16, color: C.tx3 }}>{activeWs.name}</span>}
            <button
              onClick={logout}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                border: `1px solid ${C.glassBrd}`,
                background: "transparent",
                color: C.tx4,
                fontSize: 15,
                fontFamily: "'Satoshi'",
                cursor: "pointer",
              }}
            >
              Sign out
            </button>
          </div>
        </div>

        {/* View content */}
        <div style={{ flex: 1, overflow: "auto", padding: sourceBrowserUrl ? 0 : 24 }}>
          {sourceBrowserUrl ? (
            <SourceBrowser
              url={sourceBrowserUrl}
              onBack={() => setSourceBrowserUrl(null)}
            />
          ) : view === "home" ? (
            /* ── Home: Workspace Grid ── */
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
                <div>
                  <h1 style={{ fontFamily: "'Clash Display'", fontSize: 38, fontWeight: 700, color: C.cr, letterSpacing: "-0.03em", margin: 0 }}>
                    Workspaces
                  </h1>
                  <p style={{ fontSize: 20, color: C.tx3, marginTop: 6 }}>
                    {activeWs ? `Active: ${activeWs.name}` : "Select or create a workspace"}
                  </p>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 24 }}>
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
                    gap: 14,
                    minHeight: 220,
                    cursor: "pointer",
                    border: `1px dashed ${C.glassBrd}`,
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{ color: C.rg, opacity: 0.7 }}>{I.plus}</div>
                  <span style={{ fontSize: 20, color: C.tx3, fontFamily: "'Satoshi'" }}>Create Workspace</span>
                </button>
                {/* Workspace cards */}
                {workspaces.map((ws) => {
                  const bg = wsBgImages[ws.id];
                  return (
                    <div
                      key={ws.id}
                      style={{
                        ...glass(),
                        position: "relative",
                        overflow: "hidden",
                        minHeight: 220,
                        display: "flex",
                        flexDirection: "column",
                        border: activeWs?.id === ws.id ? `1px solid ${C.rg}40` : `1px solid ${C.glassBrd}`,
                        transition: "all 0.2s",
                        cursor: "pointer",
                      }}
                      onClick={() => openWorkspace(ws)}
                    >
                      {/* Background image layer */}
                      {bg && (
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            backgroundImage: `url(${bg})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            opacity: 0.25,
                            zIndex: 0,
                          }}
                        />
                      )}
                      {/* Gradient overlay for readability */}
                      {bg && (
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            background: "linear-gradient(180deg, rgba(8,9,12,0.3) 0%, rgba(8,9,12,0.7) 100%)",
                            zIndex: 1,
                          }}
                        />
                      )}
                      {/* Content */}
                      <div style={{ position: "relative", zIndex: 2, padding: 28, display: "flex", flexDirection: "column", gap: 12, flex: 1, textAlign: "left" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                          <h3 style={{ fontFamily: "'Clash Display'", fontSize: 24, fontWeight: 600, color: C.cr, margin: 0, flex: 1 }}>
                            {ws.name}
                          </h3>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingWs(ws); }}
                            title="Edit workspace"
                            style={{
                              flexShrink: 0, width: 34, height: 34, borderRadius: 8,
                              border: `1px solid ${C.glassBrd}`, background: "rgba(255,255,255,0.04)",
                              color: C.tx3, cursor: "pointer", display: "flex",
                              alignItems: "center", justifyContent: "center",
                              transition: "all 0.15s",
                            }}
                          >
                            {I.pen}
                          </button>
                        </div>
                        {ws.description && (
                          <p style={{ fontSize: 18, color: C.tx3, margin: 0, lineHeight: 1.5, flex: 1 }}>
                            {ws.description}
                          </p>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
                          <span style={{ fontSize: 15, color: C.tx4 }}>
                            {fileCounts[ws.id] ?? 0} files
                          </span>
                          <span style={{ fontSize: 15, color: C.tx4 }}>
                            {ws.updated_at ? new Date(ws.updated_at).toLocaleDateString() : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : view === "workspace" && activeWs ? (
            /* ── Workspace Surface ── */
            <WorkspaceSurface
              workspaceId={activeWs.id}
              workspaceName={activeWs.name}
              onVisitSource={(url) => {
                const pref = localStorage.getItem("60w_source_browser") || "embedded";
                if (pref === "external") {
                  window.open(url, "_blank", "noopener,noreferrer");
                } else {
                  setSourceBrowserUrl(url);
                }
              }}
            />
          ) : view === "kb" ? (
            /* ── Knowledge Base View ── */
            <KBView workspaceId={activeWs?.id ?? "local"} />
          ) : view === "settings" ? (
            /* ── Settings ── */
            <SettingsView workspaceId={activeWs?.id} />
          ) : (
            /* ── Other views: placeholder ── */
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, height: "100%" }}>
              <h1 style={{ fontFamily: "'Clash Display'", fontSize: 44, fontWeight: 700, color: C.cr, letterSpacing: "-0.03em" }}>
                {VIEW_LABELS[view]}
              </h1>
              <p style={{ fontSize: 22, color: C.tx3 }}>
                {activeWs ? `Workspace: ${activeWs.name}` : "Select a workspace from Home"}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* ── Layer 3: Floating Panels ── */}
      {showSearchResults && (
        <SearchResultsPanel
          results={searchResults}
          error={searchError}
          onClose={() => setShowSearchResults(false)}
          onVisitSource={(url) => {
            const pref = localStorage.getItem("60w_source_browser") || "embedded";
            if (pref === "external") {
              window.open(url, "_blank", "noopener,noreferrer");
            } else {
              setSourceBrowserUrl(url);
            }
          }}
          onAddToCanvas={(card) => {
            // Signal CanvasView to add a search_card block via custom event
            window.dispatchEvent(new CustomEvent("60w:add-search-card", { detail: card }));
          }}
        />
      )}
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
      {editingWs && <EditModal ws={editingWs} onClose={() => setEditingWs(null)} onSave={handleEditSave} />}
      <ProfePanel workspaceId={activeWs?.id ?? null} />
      <ResearchModal
        open={showResearch}
        onClose={() => setShowResearch(false)}
        onAddToCanvas={(content) => {
          // TODO: create canvas block via Directus
          console.log("Add to canvas:", content);
          setShowResearch(false);
        }}
        onSendToProfe={(content) => {
          // TODO: inject into Profé chat
          console.log("Send to Profé:", content);
          setShowResearch(false);
        }}
      />
      <YouTubeModal
        open={showYouTube}
        onClose={() => setShowYouTube(false)}
        onEmbed={(videoUrl) => {
          // TODO: create youtube block in canvas
          console.log("Embed YouTube:", videoUrl);
          setShowYouTube(false);
        }}
      />
    </div>
  );
}
