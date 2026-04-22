"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { readItems, createItem, deleteItem } from "@directus/sdk";
import directus from "../lib/directus";
import type { KBFile } from "../lib/directus";
import { C } from "../lib/colors";
import { glass, glassBtn } from "../lib/styles";
import { I } from "../lib/icons";
import { fileIcon, fileCat, fmtSz } from "../lib/helpers";

const directusUrl =
  process.env.NEXT_PUBLIC_DIRECTUS_URL || "http://localhost:8055";

interface DirectusFileMetadata {
  id: string;
  filename_download: string;
  type: string;
  filesize: number;
  uploaded_on: string;
}

interface KBFileExpanded extends Omit<KBFile, "file"> {
  file: DirectusFileMetadata;
}

interface KnowledgeBaseProps {
  workspaceId: string;
}

type GroupedFiles = Record<string, KBFileExpanded[]>;

export default function KnowledgeBase({ workspaceId }: KnowledgeBaseProps) {
  const [files, setFiles] = useState<KBFileExpanded[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set()
  );
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      const result = await directus.request(
        readItems("kb_files", {
          filter: { workspace_id: { _eq: workspaceId } },
          sort: ["-created_at"],
          fields: ["*", "file.*" as never],
        })
      );
      setFiles(result as unknown as KBFileExpanded[]);
    } catch (err) {
      console.error("Failed to fetch KB files:", err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const uploadFiles = async (fileList: FileList | File[]) => {
    const arr = Array.from(fileList);
    if (arr.length === 0) return;

    setUploading(true);
    try {
      for (const file of arr) {
        const formData = new FormData();
        formData.append("file", file);

        const uploadRes = await fetch(`${directusUrl}/files`, {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.statusText}`);

        const uploaded = await uploadRes.json();
        const fileId = uploaded.data.id;
        const mimeType = uploaded.data.type || file.type || "application/octet-stream";

        await directus.request(
          createItem("kb_files", {
            workspace_id: workspaceId,
            file: fileId,
            category: fileCat(mimeType),
          })
        );
      }
      await fetchFiles();
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await directus.request(deleteItem("kb_files", id));
      setFiles((prev) => prev.filter((f) => f.id !== id));
      setConfirmingDelete(null);
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        uploadFiles(e.dataTransfer.files);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workspaceId]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const toggleGroup = (category: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const grouped: GroupedFiles = {};
  for (const f of files) {
    const cat = f.category || fileCat(f.file?.type || "");
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(f);
  }

  const categoryOrder = ["Images", "Videos", "Audio", "PDFs", "Documents"];
  const sortedCategories = Object.keys(grouped).sort(
    (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
  );

  const renderFilePreview = (f: KBFileExpanded) => {
    const fileId = f.file?.id;
    const mimeType = f.file?.type || "";
    if (!fileId) return null;

    if (mimeType.startsWith("image")) {
      return (
        <img
          src={`${directusUrl}/assets/${fileId}?width=200`}
          alt={f.file.filename_download}
          style={{
            width: 48,
            height: 48,
            borderRadius: 8,
            objectFit: "cover",
            border: `1px solid ${C.glassBrd}`,
            flexShrink: 0,
          }}
        />
      );
    }

    return (
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 8,
          background: C.ob4,
          border: `1px solid ${C.glassBrd}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: C.tx3,
          flexShrink: 0,
        }}
      >
        {fileIcon(mimeType)}
      </div>
    );
  };

  const renderFileActions = (f: KBFileExpanded) => {
    const fileId = f.file?.id;
    const mimeType = f.file?.type || "";
    if (!fileId) return null;

    if (mimeType.startsWith("image")) {
      return (
        <a
          href={`${directusUrl}/assets/${fileId}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ ...glassBtn({ padding: "4px 10px", fontSize: "13px" }), textDecoration: "none" }}
          title="View full size"
        >
          {I.eye}
        </a>
      );
    }

    if (mimeType.includes("pdf")) {
      return (
        <a
          href={`${directusUrl}/assets/${fileId}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ ...glassBtn({ padding: "4px 10px", fontSize: "13px" }), textDecoration: "none" }}
          title="Open PDF"
        >
          {I.eye}
          <span style={{ fontFamily: "Satoshi", fontSize: 13 }}>Open</span>
        </a>
      );
    }

    return (
      <a
        href={`${directusUrl}/assets/${fileId}?download`}
        style={{ ...glassBtn({ padding: "4px 10px", fontSize: "13px" }), textDecoration: "none" }}
        title="Download"
      >
        {I.dl}
      </a>
    );
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 24,
        padding: 32,
        fontFamily: "Satoshi",
        color: C.tx,
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ color: C.rg, display: "flex" }}>{I.folder}</span>
        <h2
          style={{
            fontFamily: "Clash Display, sans-serif",
            fontSize: 28,
            fontWeight: 600,
            color: C.cr,
            margin: 0,
          }}
        >
          Knowledge Base
        </h2>
      </div>

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        style={{
          ...glass({
            padding: "40px 32px",
            borderStyle: "dashed",
            borderWidth: 2,
            borderColor: dragOver ? C.rg : C.glassBrd,
            background: dragOver ? `${C.rg}0A` : C.glass,
            cursor: "pointer",
            textAlign: "center" as const,
            transition: "all .25s cubic-bezier(.4,0,.2,1)",
          }),
          display: "flex",
          flexDirection: "column" as const,
          alignItems: "center",
          gap: 16,
        }}
      >
        <span
          style={{
            color: dragOver ? C.rg : C.tx3,
            transition: "color .25s",
            display: "flex",
          }}
        >
          {uploading ? (
            <span className="spin" style={{ display: "flex" }}>
              {I.loader}
            </span>
          ) : (
            I.upload
          )}
        </span>
        <span
          style={{
            fontSize: 20,
            color: dragOver ? C.rg : C.tx2,
            fontFamily: "Satoshi",
            transition: "color .25s",
          }}
        >
          {uploading
            ? "Uploading..."
            : "Drag & drop files here, or click to browse"}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          style={glassBtn({
            color: C.rg,
            borderColor: `${C.rg}40`,
            padding: "10px 20px",
            fontSize: "15px",
          })}
        >
          {I.upload}
          <span>Upload Files</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            if (e.target.files) uploadFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* Loading state */}
      {loading && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: 48,
            color: C.tx3,
            fontSize: 20,
          }}
        >
          <span className="spin" style={{ display: "flex" }}>
            {I.loader}
          </span>
          <span style={{ fontFamily: "Satoshi" }}>Loading files...</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && files.length === 0 && (
        <div
          style={{
            ...glass({ padding: "48px 32px" }),
            textAlign: "center" as const,
            display: "flex",
            flexDirection: "column" as const,
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ color: C.tx4, display: "flex" }}>{I.folder}</span>
          <p
            style={{
              fontSize: 20,
              color: C.tx3,
              margin: 0,
              fontFamily: "Satoshi",
            }}
          >
            No files yet — drag and drop or click to upload
          </p>
        </div>
      )}

      {/* File list grouped by category */}
      {!loading &&
        sortedCategories.map((category) => {
          const catFiles = grouped[category];
          const isCollapsed = collapsedGroups.has(category);

          return (
            <div key={category} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Category header */}
              <button
                type="button"
                onClick={() => toggleGroup(category)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 16px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  borderRadius: 12,
                  transition: "background .15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = C.glass)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <span
                  style={{
                    display: "flex",
                    transition: "transform .2s",
                    transform: isCollapsed ? "rotate(0deg)" : "rotate(90deg)",
                    color: C.tx3,
                  }}
                >
                  {I.chR}
                </span>
                <span
                  style={{
                    fontFamily: "Clash Display, sans-serif",
                    fontSize: 20,
                    fontWeight: 600,
                    color: C.cr,
                  }}
                >
                  {category}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: C.tx3,
                    fontFamily: "Satoshi",
                    background: C.ob4,
                    padding: "2px 10px",
                    borderRadius: 20,
                  }}
                >
                  {catFiles.length}
                </span>
              </button>

              {/* File items */}
              {!isCollapsed && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    paddingLeft: 16,
                  }}
                >
                  {catFiles.map((f) => (
                    <div
                      key={f.id}
                      style={{
                        ...glass({ padding: "12px 16px" }),
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        transition: "background .15s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = C.glassB)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = C.glass)
                      }
                    >
                      {renderFilePreview(f)}

                      {/* File info */}
                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 16,
                            fontWeight: 500,
                            color: C.tx,
                            fontFamily: "Satoshi",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {f.file?.filename_download || "Unnamed file"}
                        </span>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            fontSize: 13,
                            color: C.tx3,
                            fontFamily: "Satoshi",
                          }}
                        >
                          <span>{fmtSz(f.file?.filesize || 0)}</span>
                          <span style={{ color: C.tx4 }}>·</span>
                          <span>
                            {f.created_at
                              ? new Date(f.created_at).toLocaleDateString()
                              : ""}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexShrink: 0,
                        }}
                      >
                        {renderFileActions(f)}

                        {confirmingDelete === f.id ? (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              fontSize: 13,
                              fontFamily: "Satoshi",
                            }}
                          >
                            <span style={{ color: C.red }}>Delete?</span>
                            <button
                              type="button"
                              onClick={() => handleDelete(f.id)}
                              style={glassBtn({
                                padding: "3px 10px",
                                fontSize: "13px",
                                color: C.red,
                                borderColor: `${C.red}40`,
                              })}
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmingDelete(null)}
                              style={glassBtn({
                                padding: "3px 10px",
                                fontSize: "13px",
                              })}
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmingDelete(f.id)}
                            style={glassBtn({
                              padding: "4px 10px",
                              color: C.tx3,
                            })}
                            title="Delete"
                          >
                            {I.trash}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
