"use client";
import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  type CSSProperties,
} from "react";
import { C } from "../lib/colors";
import { glass } from "../lib/styles";

/* ── types ── */
type Tool = "pen" | "rect" | "circle" | "line" | "text" | "eraser";

interface DesignStudioViewProps {
  content?: string;
  onContentChange?: (content: string) => void;
}

/* ── constants ── */
const PRESET_COLORS = [
  { label: "White", value: "#FFFFFF" },
  { label: "Rose Gold", value: C.rg },
  { label: "Cream", value: C.cr },
  { label: "Red", value: C.red },
  { label: "Green", value: C.green },
  { label: "Blue", value: "#5D8DE8" },
  { label: "Black", value: "#000000" },
];

const BRUSH_SIZES = [
  { label: "S", value: 2 },
  { label: "M", value: 4 },
  { label: "L", value: 8 },
];

/* ── component ── */
export default function DesignStudioView({
  content,
  onContentChange,
}: DesignStudioViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#FFFFFF");
  const [brushSize, setBrushSize] = useState(4);

  // drawing state
  const drawing = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });

  // undo / redo
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);

  // text input overlay
  const [textInput, setTextInput] = useState<{
    x: number;
    y: number;
    value: string;
  } | null>(null);

  // AI generate prompt overlay
  const [aiPrompt, setAiPrompt] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // toast
  const [toast, setToast] = useState<string | null>(null);

  // snapshot before a shape drag (so we can redraw preview)
  const preShapeSnapshot = useRef<ImageData | null>(null);

  // debounce timer for onContentChange
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── helpers ── */
  const ctx = useCallback(() => canvasRef.current?.getContext("2d") ?? null, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const saveSnapshot = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dataUrl = c.toDataURL();
    setHistory((prev) => {
      const next = prev.slice(0, historyIdx + 1);
      next.push(dataUrl);
      return next;
    });
    setHistoryIdx((i) => i + 1);

    // debounced persist
    if (onContentChange) {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => onContentChange(dataUrl), 1000);
    }
  }, [historyIdx, onContentChange]);

  const restoreSnapshot = useCallback(
    (dataUrl: string) => {
      const c = canvasRef.current;
      const g = ctx();
      if (!c || !g) return;
      const img = new Image();
      img.onload = () => {
        g.clearRect(0, 0, c.width, c.height);
        g.drawImage(img, 0, 0);
      };
      img.src = dataUrl;
    },
    [ctx],
  );

  /* ── resize handling ── */
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      const w = Math.floor(width);
      const h = Math.floor(height);
      if (canvas.width === w && canvas.height === h) return;

      // save current content
      const prev = canvas.toDataURL();
      canvas.width = w;
      canvas.height = h;

      // restore
      const img = new Image();
      img.onload = () => {
        const g = canvas.getContext("2d");
        if (g) g.drawImage(img, 0, 0);
      };
      img.src = prev;
    };

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    return () => ro.disconnect();
  }, []);

  /* ── load content prop on mount ── */
  useEffect(() => {
    if (!content) return;
    const c = canvasRef.current;
    const g = ctx();
    if (!c || !g) return;
    const img = new Image();
    img.onload = () => {
      g.clearRect(0, 0, c.width, c.height);
      g.drawImage(img, 0, 0);
      // seed history
      setHistory([content]);
      setHistoryIdx(0);
    };
    img.src = content;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── canvas coordinate helper ── */
  const canvasXY = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const c = canvasRef.current;
      if (!c) return { x: 0, y: 0 };
      const r = c.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    },
    [],
  );

  /* ── drawing handlers ── */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const g = ctx();
      if (!g) return;
      const pos = canvasXY(e);

      if (tool === "text") {
        setTextInput({ x: pos.x, y: pos.y, value: "" });
        return;
      }

      drawing.current = true;
      startPos.current = pos;

      if (tool === "pen" || tool === "eraser") {
        g.beginPath();
        g.moveTo(pos.x, pos.y);
        g.lineWidth = brushSize;
        g.lineCap = "round";
        g.lineJoin = "round";
        if (tool === "eraser") {
          g.globalCompositeOperation = "destination-out";
          g.strokeStyle = "rgba(0,0,0,1)";
        } else {
          g.globalCompositeOperation = "source-over";
          g.strokeStyle = color;
        }
      }

      if (
        tool === "rect" ||
        tool === "circle" ||
        tool === "line"
      ) {
        const c = canvasRef.current!;
        preShapeSnapshot.current = g.getImageData(0, 0, c.width, c.height);
      }
    },
    [tool, color, brushSize, ctx, canvasXY],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!drawing.current) return;
      const g = ctx();
      const c = canvasRef.current;
      if (!g || !c) return;
      const pos = canvasXY(e);

      if (tool === "pen" || tool === "eraser") {
        g.lineTo(pos.x, pos.y);
        g.stroke();
        return;
      }

      // shape preview
      if (preShapeSnapshot.current) {
        g.putImageData(preShapeSnapshot.current, 0, 0);
      }
      g.globalCompositeOperation = "source-over";
      g.strokeStyle = color;
      g.lineWidth = brushSize;
      g.lineCap = "round";

      const sx = startPos.current.x;
      const sy = startPos.current.y;
      const dx = pos.x - sx;
      const dy = pos.y - sy;

      if (tool === "rect") {
        g.strokeRect(sx, sy, dx, dy);
      } else if (tool === "circle") {
        g.beginPath();
        const rx = Math.abs(dx) / 2;
        const ry = Math.abs(dy) / 2;
        const cx = sx + dx / 2;
        const cy = sy + dy / 2;
        g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        g.stroke();
      } else if (tool === "line") {
        g.beginPath();
        g.moveTo(sx, sy);
        g.lineTo(pos.x, pos.y);
        g.stroke();
      }
    },
    [tool, color, brushSize, ctx, canvasXY],
  );

  const handleMouseUp = useCallback(() => {
    if (!drawing.current) return;
    drawing.current = false;
    const g = ctx();
    if (g) g.globalCompositeOperation = "source-over";
    preShapeSnapshot.current = null;
    saveSnapshot();
  }, [ctx, saveSnapshot]);

  /* ── text placement ── */
  const commitText = useCallback(() => {
    if (!textInput || !textInput.value.trim()) {
      setTextInput(null);
      return;
    }
    const g = ctx();
    if (!g) return;
    g.globalCompositeOperation = "source-over";
    g.fillStyle = color;
    g.font = "20px 'Satoshi', sans-serif";
    g.fillText(textInput.value, textInput.x, textInput.y);
    setTextInput(null);
    saveSnapshot();
  }, [textInput, color, ctx, saveSnapshot]);

  /* ── undo / redo ── */
  const undo = useCallback(() => {
    if (historyIdx <= 0) return;
    const newIdx = historyIdx - 1;
    setHistoryIdx(newIdx);
    restoreSnapshot(history[newIdx]);
  }, [historyIdx, history, restoreSnapshot]);

  const redo = useCallback(() => {
    if (historyIdx >= history.length - 1) return;
    const newIdx = historyIdx + 1;
    setHistoryIdx(newIdx);
    restoreSnapshot(history[newIdx]);
  }, [historyIdx, history, restoreSnapshot]);

  /* ── clear ── */
  const clearCanvas = useCallback(() => {
    const c = canvasRef.current;
    const g = ctx();
    if (!c || !g) return;
    if (history.length > 0 && !window.confirm("Clear the entire canvas?"))
      return;
    g.clearRect(0, 0, c.width, c.height);
    saveSnapshot();
  }, [ctx, history.length, saveSnapshot]);

  /* ── AI generate ── */
  const generateAI = useCallback(
    async (prompt: string) => {
      setAiLoading(true);
      setAiPrompt(null);
      try {
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512`;
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Image generation failed"));
          img.src = url;
        });
        const c = canvasRef.current;
        const g = ctx();
        if (c && g) {
          const cx = (c.width - img.width) / 2;
          const cy = (c.height - img.height) / 2;
          g.globalCompositeOperation = "source-over";
          g.drawImage(img, cx, cy);
          saveSnapshot();
          showToast("Image generated!");
        }
      } catch {
        showToast("Failed to generate image. Try again.");
      } finally {
        setAiLoading(false);
      }
    },
    [ctx, saveSnapshot, showToast],
  );

  /* ── AI render (stub) ── */
  const aiRender = useCallback(() => {
    showToast("AI Render coming soon");
  }, [showToast]);

  /* ── export ── */
  // (not explicitly wired to a button yet but available)

  /* ── cursor based on tool ── */
  const cursor: string =
    tool === "pen" || tool === "eraser"
      ? "crosshair"
      : tool === "text"
        ? "text"
        : "crosshair";

  /* ── styles ── */
  const toolbarStyle: CSSProperties = {
    ...glass({ borderRadius: "12px" }),
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "6px 10px",
    flexWrap: "wrap",
    fontFamily: "'Satoshi'",
  };

  const btnBase = (active: boolean): CSSProperties => ({
    width: 34,
    height: 34,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    border: active ? `1px solid ${C.rg}` : `1px solid transparent`,
    background: active ? `${C.rg}22` : "transparent",
    color: active ? C.rg : C.tx3,
    cursor: "pointer",
    fontSize: 15,
    fontFamily: "'Satoshi'",
    fontWeight: 600,
    transition: "all .15s",
    flexShrink: 0,
  });

  const separatorStyle: CSSProperties = {
    width: 1,
    height: 22,
    background: C.glassBrd,
    margin: "0 6px",
    flexShrink: 0,
  };

  const wideBtnStyle = (active?: boolean): CSSProperties => ({
    ...btnBase(!!active),
    width: "auto",
    padding: "0 10px",
    gap: 4,
    fontSize: 13,
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: C.ob2,
        fontFamily: "'Satoshi'",
      }}
    >
      {/* ── toolbar ── */}
      <div style={{ padding: "8px 8px 0 8px" }}>
        <div style={toolbarStyle}>
          {/* drawing tools */}
          <button style={btnBase(tool === "pen")} onClick={() => setTool("pen")} title="Pen">
            ✏️
          </button>
          <button style={btnBase(tool === "rect")} onClick={() => setTool("rect")} title="Rectangle">
            ▭
          </button>
          <button style={btnBase(tool === "circle")} onClick={() => setTool("circle")} title="Circle">
            ○
          </button>
          <button style={btnBase(tool === "line")} onClick={() => setTool("line")} title="Line">
            ╱
          </button>
          <button style={btnBase(tool === "text")} onClick={() => setTool("text")} title="Text">
            T
          </button>
          <button style={btnBase(tool === "eraser")} onClick={() => setTool("eraser")} title="Eraser">
            ⌫
          </button>

          <div style={separatorStyle} />

          {/* colors */}
          {PRESET_COLORS.map((c) => (
            <button
              key={c.value}
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                border:
                  color === c.value
                    ? `2px solid ${C.rg}`
                    : `1px solid ${C.glassBrd}`,
                background: c.value,
                cursor: "pointer",
                flexShrink: 0,
                padding: 0,
              }}
              title={c.label}
              onClick={() => setColor(c.value)}
            />
          ))}
          <label
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              overflow: "hidden",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `1px solid ${C.glassBrd}`,
              flexShrink: 0,
              position: "relative",
            }}
            title="Custom color"
          >
            <span style={{ fontSize: 11, color: C.tx3, pointerEvents: "none" }}>
              +
            </span>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{
                position: "absolute",
                opacity: 0,
                width: "100%",
                height: "100%",
                cursor: "pointer",
                border: "none",
                padding: 0,
              }}
            />
          </label>

          <div style={separatorStyle} />

          {/* brush size */}
          {BRUSH_SIZES.map((s) => (
            <button
              key={s.value}
              style={{
                ...btnBase(brushSize === s.value),
                width: 28,
                height: 28,
                fontSize: 12,
              }}
              onClick={() => setBrushSize(s.value)}
              title={`${s.label} (${s.value}px)`}
            >
              {s.label}
            </button>
          ))}

          <div style={separatorStyle} />

          {/* undo / redo / clear */}
          <button
            style={btnBase(false)}
            onClick={undo}
            title="Undo"
            disabled={historyIdx <= 0}
          >
            ↩
          </button>
          <button
            style={btnBase(false)}
            onClick={redo}
            title="Redo"
            disabled={historyIdx >= history.length - 1}
          >
            ↪
          </button>
          <button style={btnBase(false)} onClick={clearCanvas} title="Clear">
            🗑
          </button>

          <div style={separatorStyle} />

          {/* AI actions */}
          <button
            style={wideBtnStyle(false)}
            onClick={() => setAiPrompt("")}
            disabled={aiLoading}
          >
            ✨ Generate
          </button>
          <button style={wideBtnStyle(false)} onClick={aiRender}>
            🎨 AI Render
          </button>
        </div>
      </div>

      {/* ── canvas area ── */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          position: "relative",
          margin: 8,
          borderRadius: 12,
          overflow: "hidden",
          border: `1px solid ${C.glassBrd}`,
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            cursor,
            background: C.ob2,
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />

        {/* ── text input overlay ── */}
        {textInput && (
          <input
            autoFocus
            value={textInput.value}
            onChange={(e) =>
              setTextInput((prev) =>
                prev ? { ...prev, value: e.target.value } : null,
              )
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") commitText();
              if (e.key === "Escape") setTextInput(null);
            }}
            onBlur={commitText}
            style={{
              position: "absolute",
              left: textInput.x,
              top: textInput.y - 24,
              background: C.ob4,
              border: `1px solid ${C.rg}`,
              borderRadius: 6,
              color: C.cr,
              fontFamily: "'Satoshi'",
              fontSize: 16,
              padding: "4px 8px",
              outline: "none",
              minWidth: 120,
              zIndex: 10,
            }}
          />
        )}

        {/* ── AI prompt overlay ── */}
        {aiPrompt !== null && (
          <div
            style={{
              position: "absolute",
              top: 12,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: 6,
              zIndex: 10,
            }}
          >
            <input
              autoFocus
              placeholder="Describe the image to generate..."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && aiPrompt.trim()) {
                  generateAI(aiPrompt.trim());
                }
                if (e.key === "Escape") setAiPrompt(null);
              }}
              style={{
                width: 320,
                background: C.ob4,
                border: `1px solid ${C.rg}`,
                borderRadius: 8,
                color: C.cr,
                fontFamily: "'Satoshi'",
                fontSize: 15,
                padding: "8px 12px",
                outline: "none",
              }}
            />
            <button
              style={{
                ...wideBtnStyle(false),
                background: `${C.rg}22`,
                color: C.rg,
                border: `1px solid ${C.rg}`,
                height: "auto",
              }}
              onClick={() => {
                if (aiPrompt.trim()) generateAI(aiPrompt.trim());
              }}
            >
              Go
            </button>
          </div>
        )}

        {/* ── loading indicator ── */}
        {aiLoading && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              color: C.rg,
              fontFamily: "'Satoshi'",
              fontSize: 16,
              background: `${C.ob2}DD`,
              padding: "12px 20px",
              borderRadius: 10,
              border: `1px solid ${C.glassBrd}`,
            }}
          >
            Generating image...
          </div>
        )}

        {/* ── toast ── */}
        {toast && (
          <div
            style={{
              position: "absolute",
              bottom: 16,
              left: "50%",
              transform: "translateX(-50%)",
              color: C.cr,
              fontFamily: "'Satoshi'",
              fontSize: 14,
              background: C.ob4,
              padding: "8px 16px",
              borderRadius: 8,
              border: `1px solid ${C.glassBrd}`,
              zIndex: 10,
            }}
          >
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
