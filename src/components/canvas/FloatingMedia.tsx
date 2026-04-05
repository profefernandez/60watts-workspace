"use client";
import React, { useState, useCallback, useEffect } from "react";
import { C } from "../../lib/colors";
import type { CanvasBlock } from "../../lib/directus";
import { useDrag } from "./useDrag";
import { useResize } from "./useResize";

interface Props {
  block: CanvasBlock;
  canvasWidth: number;
  onUpdatePosition: (id: string, pos_x: number, pos_y: number) => void;
  onUpdateSize: (id: string, width: number, height: number) => void;
  onDoubleClick: (block: CanvasBlock) => void;
}

const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || "http://localhost:8055";

function getImageSrc(content: string): string {
  if (content.startsWith("http")) return content;
  if (content.startsWith("data:")) return content;
  return `${directusUrl}/assets/${content}`;
}

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

export default function FloatingMedia({
  block,
  canvasWidth,
  onUpdatePosition,
  onUpdateSize,
  onDoubleClick,
}: Props) {
  const [selected, setSelected] = useState(false);

  const pxX = ((block.pos_x ?? 50) / 100) * canvasWidth;
  const pxY = block.pos_y ?? 100;
  const pxW = ((block.width ?? 25) / 100) * canvasWidth;
  const pxH = ((block.height ?? 20) / 100) * canvasWidth;

  const [localX, setLocalX] = useState(pxX);
  const [localY, setLocalY] = useState(pxY);
  const [localW, setLocalW] = useState(pxW);
  const [localH, setLocalH] = useState(pxH);

  useEffect(() => { setLocalX(pxX); }, [pxX]);
  useEffect(() => { setLocalY(pxY); }, [pxY]);
  useEffect(() => { setLocalW(pxW); }, [pxW]);
  useEffect(() => { setLocalH(pxH); }, [pxH]);

  const { onPointerDown: onDragDown } = useDrag({
    getInitial: () => ({ x: localX, y: localY }),
    onDrag: (x, y) => {
      setLocalX(Math.max(0, x));
      setLocalY(Math.max(0, y));
    },
    onDragEnd: (x, y) => {
      const px = Math.max(0, Math.min(100, (x / canvasWidth) * 100));
      const py = Math.max(0, y);
      onUpdatePosition(block.id, px, py);
    },
  });

  const { onPointerDown: onResizeDown } = useResize({
    getInitial: () => ({ w: localW, h: localH }),
    onResize: (w, h) => {
      setLocalW(w);
      setLocalH(h);
    },
    onResizeEnd: (w, h) => {
      const wp = (w / canvasWidth) * 100;
      const hp = (h / canvasWidth) * 100;
      onUpdateSize(block.id, wp, hp);
    },
  });

  const videoId = block.type === "youtube" ? extractYouTubeId(block.content) : null;

  return (
    <div
      style={{
        position: "absolute",
        left: localX,
        top: localY,
        width: localW,
        height: localH,
        cursor: "grab",
        zIndex: selected ? 20 : 10,
        borderRadius: 12,
        overflow: "visible",
      }}
      onClick={(e) => {
        e.stopPropagation();
        setSelected(true);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick(block);
      }}
      onPointerDown={onDragDown}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          border: selected ? `2px solid ${C.rg}` : "2px solid transparent",
          transition: "border-color 0.15s",
        }}
      >
        {block.type === "image" ? (
          <img
            src={getImageSrc(block.content)}
            alt=""
            draggable={false}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              pointerEvents: "none",
            }}
          />
        ) : videoId ? (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              pointerEvents: selected ? "auto" : "none",
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: C.glass,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: C.tx4,
              fontSize: 14,
            }}
          >
            {block.type === "youtube" ? "Invalid YouTube URL" : "No image"}
          </div>
        )}
      </div>

      {selected && (
        <div
          onPointerDown={onResizeDown}
          style={{
            position: "absolute",
            bottom: -4,
            right: -4,
            width: 16,
            height: 16,
            cursor: "nwse-resize",
            zIndex: 30,
          }}
        >
          <div
            style={{
              position: "absolute",
              bottom: 2,
              right: 2,
              width: 10,
              height: 10,
              borderRight: `2px solid ${C.rg}`,
              borderBottom: `2px solid ${C.rg}`,
            }}
          />
        </div>
      )}
    </div>
  );
}
