"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { C } from "../../lib/colors";
import { glass } from "../../lib/styles";
import { fileCat } from "../../lib/helpers";
import { fetchAllKBImages, uploadKBFile } from "../../lib/store";

type Tab = "upload" | "url" | "recent";

interface KBImage {
  id: string;
  file: string;
  filename: string;
  mime_type: string;
  created_at: string;
  workspace_id: string;
}

interface Props {
  workspaceId: string;
  onInsert: (imageSource: string) => void;
  onClose: () => void;
  replaceMode?: boolean;
}

const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || "http://localhost:8055";

function getThumbUrl(file: string): string {
  if (file.startsWith("http")) return file;
  return `${directusUrl}/assets/${file}?width=200&height=200&fit=cover`;
}

export default function ImageGalleryModal({
  workspaceId,
  onInsert,
  onClose,
  replaceMode,
}: Props) {
  const [tab, setTab] = useState<Tab>("upload");
  const [url, setUrl] = useState("");
  const [urlPreview, setUrlPreview] = useState("");
  const [recentImages, setRecentImages] = useState<KBImage[]>([]);
  const [selectedRecent, setSelectedRecent] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAllKBImages()
      .then((imgs) =>
        setRecentImages(
          imgs.map((i) => ({
            id: i.id,
            file: i.file,
            filename: i.filename,
            mime_type: i.mime_type,
            created_at: i.created_at,
            workspace_id: i.workspace_id,
          }))
        )
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!url.startsWith("http")) {
      setUrlPreview("");
      return;
    }
    const t = setTimeout(() => setUrlPreview(url), 500);
    return () => clearTimeout(t);
  }, [url]);

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const category = fileCat(file.type);
        const result = await uploadKBFile(workspaceId, file, category);
        onInsert(result.file);
      } catch (err) {
        console.error("Upload failed:", err);
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [workspaceId, onInsert]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file || !file.type.startsWith("image/")) return;
      setUploading(true);
      try {
        const category = fileCat(file.type);
        const result = await uploadKBFile(workspaceId, file, category);
        onInsert(result.file);
      } catch (err) {
        console.error("Upload failed:", err);
      } finally {
        setUploading(false);
      }
    },
    [workspaceId, onInsert]
  );

  const filteredRecent = search
    ? recentImages.filter((i) =>
        i.filename.toLowerCase().includes(search.toLowerCase())
      )
    : recentImages;

  const tabStyle = (t: Tab): React.CSSProperties => ({
    flex: 1,
    textAlign: "center",
    padding: 11,
    fontSize: 14,
    fontFamily: "'Satoshi'",
    color: tab === t ? C.rg : C.tx4,
    borderBottom: tab === t ? `2px solid ${C.rg}` : "2px solid transparent",
    fontWeight: tab === t ? 600 : 400,
    cursor: "pointer",
    background: "transparent",
    border: "none",
  });

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
          width: 500,
          maxHeight: "80vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
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
            {replaceMode ? "Replace Image" : "Insert Image"}
          </span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: C.tx4, cursor: "pointer", fontSize: 14 }}>
            ✕
          </button>
        </div>

        <div style={{ display: "flex", borderBottom: `1px solid ${C.glassBrd}` }}>
          <button onClick={() => setTab("upload")} style={tabStyle("upload")}>Upload</button>
          <button onClick={() => setTab("url")} style={tabStyle("url")}>Paste URL</button>
          <button onClick={() => setTab("recent")} style={tabStyle("recent")}>Recent</button>
        </div>

        <div style={{ padding: 24, overflow: "auto", flex: 1 }}>
          {tab === "upload" && (
            <>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{ border: "2px dashed rgba(232,168,124,0.3)", borderRadius: 12, padding: 36, textAlign: "center", cursor: "pointer", transition: "border-color 0.15s" }}
              >
                <div style={{ fontSize: 36, marginBottom: 10 }}>{uploading ? "⏳" : "📷"}</div>
                <div style={{ fontSize: 16, color: C.cr, fontFamily: "'Satoshi'" }}>
                  {uploading ? "Uploading..." : "Drop image here or click to browse"}
                </div>
                <div style={{ fontSize: 13, color: C.tx4, marginTop: 6, fontFamily: "'Satoshi'" }}>
                  PNG, JPG, GIF, WebP up to 10MB
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: "none" }} />
              <div style={{ marginTop: 12, fontSize: 12, color: C.tx4, textAlign: "center", fontFamily: "'Satoshi'" }}>
                Images are saved to your Knowledge Base
              </div>
            </>
          )}

          {tab === "url" && (
            <>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/image.png"
                  style={{ flex: 1, background: C.glass, border: `1px solid ${C.glassBrd}`, borderRadius: 10, padding: "12px 14px", fontSize: 14, color: C.cr, fontFamily: "'Satoshi'", outline: "none" }}
                />
                <button
                  onClick={() => { if (url.startsWith("http")) onInsert(url); }}
                  style={{ background: "rgba(232,168,124,0.15)", border: "1px solid rgba(232,168,124,0.3)", borderRadius: 10, padding: "12px 16px", fontSize: 14, color: C.rg, fontWeight: 600, cursor: "pointer", fontFamily: "'Satoshi'" }}
                >
                  Insert
                </button>
              </div>
              {urlPreview && (
                <div style={{ marginTop: 16, borderRadius: 10, overflow: "hidden", border: `1px solid ${C.glassBrd}` }}>
                  <img src={urlPreview} alt="Preview" style={{ width: "100%", display: "block" }} onError={() => setUrlPreview("")} />
                </div>
              )}
            </>
          )}

          {tab === "recent" && (
            <>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search images..."
                style={{ width: "100%", background: C.glass, border: `1px solid ${C.glassBrd}`, borderRadius: 10, padding: "10px 14px", fontSize: 14, color: C.cr, fontFamily: "'Satoshi'", outline: "none", marginBottom: 16, boxSizing: "border-box" }}
              />
              {filteredRecent.length === 0 ? (
                <div style={{ textAlign: "center", color: C.tx4, fontSize: 15, padding: 32, fontFamily: "'Satoshi'" }}>
                  No images in your library yet
                </div>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    {filteredRecent.map((img) => (
                      <div
                        key={img.id}
                        onClick={() => setSelectedRecent(img.file)}
                        style={{ aspectRatio: "1", borderRadius: 10, overflow: "hidden", cursor: "pointer", border: selectedRecent === img.file ? `2px solid ${C.rg}` : "2px solid transparent", transition: "border-color 0.15s" }}
                      >
                        <img src={getThumbUrl(img.file)} alt={img.filename} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      </div>
                    ))}
                  </div>
                  {selectedRecent && (
                    <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
                      <button
                        onClick={() => onInsert(selectedRecent)}
                        style={{ background: "rgba(232,168,124,0.15)", border: "1px solid rgba(232,168,124,0.3)", borderRadius: 10, padding: "8px 20px", fontSize: 14, color: C.rg, fontWeight: 600, cursor: "pointer", fontFamily: "'Satoshi'" }}
                      >
                        Insert
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
