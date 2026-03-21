"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { C } from "../lib/colors";
import { glass, glassBtn } from "../lib/styles";
import { I } from "../lib/icons";
import { fmtSz, fileCat } from "../lib/helpers";
import directus from "../lib/directus";
import type { KBFile as DBKBFile } from "../lib/directus";
import { readItems, createItem, deleteItem, uploadFiles, deleteFile } from "@directus/sdk";

interface Props {
  workspaceId: string;
}

type CategoryFilter = "All" | "Documents" | "Images" | "Videos" | "Audio" | "PDFs";

const CATEGORIES: CategoryFilter[] = ["All", "Documents", "Images", "Videos", "Audio", "PDFs"];

// Extended file info (joined with directus_files data)
interface KBFileDisplay {
  id: string;
  workspace_id: string;
  file: string; // directus_files ID
  category: string;
  created_at: string;
  // from directus_files join
  filename: string;
  filesize: number;
  mime_type: string;
}

// ── File Preview Modal ──
function FilePreviewModal({
  file,
  onClose,
}: {
  file: KBFileDisplay;
  onClose: () => void;
}) {
  const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || "http://localhost:8055";
  const assetUrl = `${directusUrl}/assets/${file.file}`;
  const isImage = file.mime_type.startsWith("image");
  const isPdf = file.mime_type.includes("pdf");
  const isText =
    file.mime_type.startsWith("text") ||
    file.mime_type.includes("json") ||
    file.mime_type.includes("xml") ||
    file.mime_type.includes("javascript") ||
    file.mime_type.includes("typescript");

  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isText) {
      setLoading(true);
      fetch(assetUrl)
        .then((r) => r.text())
        .then((t) => setTextContent(t))
        .catch(() => setTextContent("Failed to load file content."))
        .finally(() => setLoading(false));
    }
  }, [assetUrl, isText]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.7)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          ...glass(),
          padding: 32,
          width: 700,
          maxWidth: "92vw",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2
            style={{
              fontFamily: "'Clash Display'",
              fontSize: 22,
              fontWeight: 700,
              color: C.cr,
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {file.filename}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: C.tx3,
              cursor: "pointer",
              padding: 4,
              flexShrink: 0,
            }}
          >
            {I.x}
          </button>
        </div>

        {/* File info */}
        <div style={{ display: "flex", gap: 16, fontSize: 14, color: C.tx3 }}>
          <span>{fmtSz(file.filesize)}</span>
          <span>{file.category}</span>
          <span>{file.mime_type}</span>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
          {isImage ? (
            <img
              src={assetUrl}
              alt={file.filename}
              style={{ width: "100%", borderRadius: 12, display: "block" }}
            />
          ) : isText ? (
            loading ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.tx3 }}>
                <span className="spin">{I.loader}</span> Loading...
              </div>
            ) : (
              <pre
                style={{
                  fontFamily: "'JetBrains Mono'",
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: C.cr,
                  background: C.ob1,
                  padding: 20,
                  borderRadius: 12,
                  border: `1px solid ${C.glassBrd}`,
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  maxHeight: "60vh",
                  margin: 0,
                }}
              >
                {textContent}
              </pre>
            )
          ) : isPdf ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: 40 }}>
              {I.file}
              <p style={{ fontSize: 16, color: C.tx3 }}>PDF files can be viewed externally.</p>
              <a
                href={assetUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  ...glassBtn(),
                  textDecoration: "none",
                  color: C.rg,
                  borderColor: `${C.rg}40`,
                }}
              >
                {I.eye} Open PDF
              </a>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: 40 }}>
              {I.file}
              <p style={{ fontSize: 16, color: C.tx3 }}>Preview not available for this file type.</p>
              <a
                href={assetUrl}
                download={file.filename}
                style={{
                  ...glassBtn(),
                  textDecoration: "none",
                  color: C.rg,
                  borderColor: `${C.rg}40`,
                }}
              >
                {I.dl} Download
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Category Badge ──
function CatBadge({ category }: { category: string }) {
  const colorMap: Record<string, string> = {
    Documents: C.cr3,
    Images: C.rg,
    Videos: "#8A64C8",
    Audio: C.green,
    PDFs: C.red,
  };
  const color = colorMap[category] || C.tx3;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 600,
        fontFamily: "'Satoshi'",
        color,
        background: `${color}18`,
        border: `1px solid ${color}30`,
      }}
    >
      {category}
    </span>
  );
}

// ── Main KB View ──
export default function KBView({ workspaceId }: Props) {
  const [files, setFiles] = useState<KBFileDisplay[]>([]);
  const [filter, setFilter] = useState<CategoryFilter>("All");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<KBFileDisplay | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || "http://localhost:8055";

  // Fetch KB files with their directus_files data
  const fetchFiles = useCallback(async () => {
    try {
      const items = await directus.request(
        readItems("kb_files", {
          filter: { workspace_id: { _eq: workspaceId } },
          sort: ["-created_at"],
          fields: ["id", "workspace_id", "file", "category", "created_at"],
        })
      );

      // Resolve file metadata from directus_files
      const displays: KBFileDisplay[] = [];
      for (const item of items as DBKBFile[]) {
        try {
          const res = await fetch(`${directusUrl}/files/${item.file}`);
          if (res.ok) {
            const fileData = await res.json();
            const d = fileData.data || fileData;
            displays.push({
              id: item.id,
              workspace_id: item.workspace_id,
              file: item.file,
              category: item.category || fileCat(d.type || ""),
              created_at: item.created_at,
              filename: d.filename_download || d.title || "Untitled",
              filesize: Number(d.filesize) || 0,
              mime_type: d.type || "application/octet-stream",
            });
          }
        } catch {
          // Skip files whose metadata can't be fetched
          displays.push({
            id: item.id,
            workspace_id: item.workspace_id,
            file: item.file,
            category: item.category || "Documents",
            created_at: item.created_at,
            filename: "Unknown file",
            filesize: 0,
            mime_type: "application/octet-stream",
          });
        }
      }
      setFiles(displays);
    } catch {
      // Directus may not be connected
    }
  }, [workspaceId, directusUrl]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Upload handler
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const formData = new FormData();
        formData.append("file", file);

        // Upload to Directus files
        const uploaded = await directus.request(uploadFiles(formData));
        const fileId = (uploaded as { id: string }).id;

        // Determine category from mime type
        const category = fileCat(file.type);

        // Create kb_files record linking to workspace
        await directus.request(
          createItem("kb_files", {
            workspace_id: workspaceId,
            file: fileId,
            category,
          })
        );
      }

      // Refresh file list
      await fetchFiles();
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Delete handler
  const handleDelete = async (file: KBFileDisplay) => {
    try {
      // Delete kb_files record
      await directus.request(deleteItem("kb_files", file.id));
      // Delete the actual file from Directus
      await directus.request(deleteFile(file.file));
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  // Update category
  const handleCategoryChange = async (file: KBFileDisplay, newCategory: string) => {
    try {
      // Update local state immediately
      setFiles((prev) =>
        prev.map((f) => (f.id === file.id ? { ...f, category: newCategory } : f))
      );
      // Persist to Directus -- use dynamic import to avoid importing updateItem at top if unused
      const { updateItem } = await import("@directus/sdk");
      await directus.request(updateItem("kb_files", file.id, { category: newCategory }));
    } catch (err) {
      console.error("Category update failed:", err);
    }
  };

  // Filtered files
  const filtered = filter === "All" ? files : files.filter((f) => f.category === filter);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 20 }}>
      {/* ── Toolbar: Upload + Category Filters ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          paddingBottom: 16,
          borderBottom: `1px solid ${C.glassBrd}`,
        }}
      >
        {/* Upload button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            ...glassBtn(),
            color: uploading ? C.tx4 : C.rg,
            borderColor: uploading ? C.glassBrd : `${C.rg}40`,
            opacity: uploading ? 0.7 : 1,
          }}
        >
          {uploading ? (
            <span className="spin">{I.loader}</span>
          ) : (
            I.upload
          )}
          <span>{uploading ? "Uploading..." : "Upload Files"}</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleUpload}
          style={{ display: "none" }}
        />

        {/* Divider */}
        <div style={{ width: 1, height: 28, background: C.glassBrd, margin: "0 4px" }} />

        {/* Category filter buttons */}
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            style={{
              padding: "6px 14px",
              borderRadius: 10,
              border: filter === cat ? `1px solid ${C.rg}60` : `1px solid ${C.glassBrd}`,
              background: filter === cat ? `${C.rg}14` : "transparent",
              color: filter === cat ? C.rg : C.tx3,
              fontSize: 14,
              fontWeight: filter === cat ? 600 : 400,
              fontFamily: "'Satoshi'",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {cat}
          </button>
        ))}

        {/* File count */}
        <span style={{ marginLeft: "auto", fontSize: 13, color: C.tx4 }}>
          {filtered.length} file{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── File Grid ── */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {filtered.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "60%",
              gap: 16,
            }}
          >
            <div style={{ color: C.tx4, opacity: 0.5 }}>{I.folder}</div>
            <p style={{ fontSize: 18, color: C.tx3 }}>
              {files.length === 0
                ? "No files yet — upload files to build your Knowledge Base"
                : `No ${filter.toLowerCase()} files found`}
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {filtered.map((file) => (
              <div
                key={file.id}
                style={{
                  ...glass(),
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = `${C.rg}40`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = C.glassBrd;
                }}
              >
                {/* File icon + name */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ color: C.rg, flexShrink: 0, marginTop: 2 }}>
                    {file.mime_type.startsWith("image")
                      ? I.img
                      : file.mime_type.startsWith("video")
                        ? I.vid
                        : file.mime_type.startsWith("audio")
                          ? I.music
                          : I.file}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: "'Satoshi'",
                        fontSize: 16,
                        fontWeight: 600,
                        color: C.cr,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={file.filename}
                    >
                      {file.filename}
                    </div>
                    <div style={{ fontSize: 13, color: C.tx4, marginTop: 4 }}>
                      {fmtSz(file.filesize)}
                    </div>
                  </div>
                </div>

                {/* Category badge + date */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <CatBadge category={file.category} />
                  <span style={{ fontSize: 12, color: C.tx4 }}>
                    {file.created_at ? new Date(file.created_at).toLocaleDateString() : ""}
                  </span>
                </div>

                {/* Category selector */}
                <select
                  value={file.category}
                  onChange={(e) => handleCategoryChange(file, e.target.value)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: `1px solid ${C.glassBrd}`,
                    background: C.ob1,
                    color: C.tx2,
                    fontSize: 13,
                    fontFamily: "'Satoshi'",
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  {CATEGORIES.filter((c) => c !== "All").map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                {/* Action buttons */}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setPreview(file)}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: `1px solid ${C.glassBrd}`,
                      background: "transparent",
                      color: C.tx2,
                      fontSize: 14,
                      fontFamily: "'Satoshi'",
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = `${C.rg}60`;
                      e.currentTarget.style.color = C.rg;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = C.glassBrd;
                      e.currentTarget.style.color = C.tx2;
                    }}
                  >
                    {I.eye} Preview
                  </button>
                  <button
                    onClick={() => handleDelete(file)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: `1px solid ${C.glassBrd}`,
                      background: "transparent",
                      color: C.tx4,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = `${C.red}60`;
                      e.currentTarget.style.color = C.red;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = C.glassBrd;
                      e.currentTarget.style.color = C.tx4;
                    }}
                  >
                    {I.trash}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Preview Modal ── */}
      {preview && <FilePreviewModal file={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
