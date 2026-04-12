"use client";

import { useEffect, useRef, useState } from "react";
import type {
  PartitionPlacement,
  WallPlacement,
  FrameColor,
  StartSide,
} from "@/lib/prompt-builder";
import { Eraser } from "lucide-react";

interface WallConfig {
  panelCount: number;
  doorPanelIndex: number;
  widthRatio?: number;
  startSide?: StartSide;
}

interface Props {
  imageUrl: string;
  placement: PartitionPlacement | null;
  onChange: (p: PartitionPlacement | null) => void;
  heightRatio: number;
  frameTier: 1 | 2;
  frameColor?: FrameColor;
  mode: "single" | "corner";
  wallA: WallConfig;
  wallB?: WallConfig;
  /** When true, skip internal mullion/door preview — only show boundary quads. */
  drawingMode?: boolean;
}

const A_BOTTOM = "#f97316"; // orange
const A_TOP = "#22d3ee"; // cyan
const B_BOTTOM = "#16a34a"; // green
const B_TOP = "#a855f7"; // purple

const A_FILL = "rgba(255, 0, 200, 0.30)";
const A_STROKE = "#ff00c8";
const B_FILL = "rgba(0, 180, 216, 0.30)";
const B_STROKE = "#00b4d8";

type Point = { x: number; y: number };
type Stage =
  | "a-bottom"
  | "a-top"
  | "b-bottom"
  | "b-top"
  | "done";
type HandleId =
  | "a-b1"
  | "a-b2"
  | "a-t1"
  | "a-t2"
  | "b-b1"
  | "b-b2"
  | "b-t1"
  | "b-t2";

const HANDLE_RADIUS = 16;

function hasBottomLine(w?: WallPlacement | null): boolean {
  return !!w;
}
function hasTopLine(w?: WallPlacement | null): boolean {
  return (
    !!w &&
    w.topX1 !== undefined &&
    w.topY1 !== undefined &&
    w.topX2 !== undefined &&
    w.topY2 !== undefined
  );
}

export function PlacementCanvas({
  imageUrl,
  placement,
  onChange,
  heightRatio,
  frameTier,
  frameColor = "black",
  mode,
  wallA,
  wallB,
  drawingMode = false,
}: Props) {
  const mullionColor =
    frameColor === "white"
      ? "#888888"
      : frameColor === "dark-gray"
        ? "#3a3a3a"
        : "#111111";

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [drawing, setDrawing] = useState(false);
  const [start, setStart] = useState<Point | null>(null);
  const [current, setCurrent] = useState<Point | null>(null);
  const [draggingHandle, setDraggingHandle] = useState<HandleId | null>(null);

  // Derive current stage
  const wallAPlacement: WallPlacement | null = placement
    ? {
        x1: placement.x1,
        y1: placement.y1,
        x2: placement.x2,
        y2: placement.y2,
        topX1: placement.topX1,
        topY1: placement.topY1,
        topX2: placement.topX2,
        topY2: placement.topY2,
      }
    : null;
  const wallBPlacement: WallPlacement | null = placement?.wallB ?? null;

  const aHasBottom = hasBottomLine(wallAPlacement);
  const aHasTop = hasTopLine(wallAPlacement);
  const bHasBottom = hasBottomLine(wallBPlacement);
  const bHasTop = hasTopLine(wallBPlacement);

  let stage: Stage;
  if (!aHasBottom) stage = "a-bottom";
  else if (!aHasTop) stage = "a-top";
  else if (mode === "corner" && !bHasBottom) stage = "b-bottom";
  else if (mode === "corner" && !bHasTop) stage = "b-top";
  else stage = "done";

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const containerW = containerRef.current?.clientWidth ?? 360;
      const ratio = containerW / img.width;
      setSize({ w: containerW, h: img.height * ratio });
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Compute 4 quad corners for a given wall placement
  const computeQuad = (
    p: WallPlacement,
    wall: WallConfig,
  ): { bl: Point; br: Point; tl: Point; tr: Point } => {
    const bA = { x: p.x1 * size.w, y: p.y1 * size.h };
    const bB = { x: p.x2 * size.w, y: p.y2 * size.h };
    let bl: Point = bA.x <= bB.x ? bA : bB;
    let br: Point = bA.x <= bB.x ? bB : bA;

    const hasTop =
      p.topX1 !== undefined &&
      p.topY1 !== undefined &&
      p.topX2 !== undefined &&
      p.topY2 !== undefined;
    let tl: Point;
    let tr: Point;
    if (hasTop) {
      const tA = { x: (p.topX1 as number) * size.w, y: (p.topY1 as number) * size.h };
      const tB = { x: (p.topX2 as number) * size.w, y: (p.topY2 as number) * size.h };
      tl = tA.x <= tB.x ? tA : tB;
      tr = tA.x <= tB.x ? tB : tA;
    } else {
      const baseY = Math.max(bl.y, br.y);
      const rectH = Math.min(baseY, heightRatio * size.h);
      const topY = Math.max(0, baseY - rectH);
      tl = { x: bl.x, y: topY };
      tr = { x: br.x, y: topY };
    }

    if (
      !hasTop &&
      !drawingMode &&
      wall.widthRatio !== undefined &&
      wall.widthRatio > 0 &&
      wall.widthRatio < 1
    ) {
      const lineW = br.x - bl.x;
      const partitionW = lineW * wall.widthRatio;
      let newLx = bl.x;
      let newRx = br.x;
      const startSide = wall.startSide ?? "right";
      if (startSide === "right") {
        newRx = br.x;
        newLx = br.x - partitionW;
      } else if (startSide === "left") {
        newLx = bl.x;
        newRx = bl.x + partitionW;
      } else {
        const center = (bl.x + br.x) / 2;
        newLx = center - partitionW / 2;
        newRx = center + partitionW / 2;
      }
      const interpY = (xx: number) => {
        const t = (xx - bl.x) / (lineW || 1);
        return bl.y + t * (br.y - bl.y);
      };
      bl = { x: newLx, y: interpY(newLx) };
      br = { x: newRx, y: interpY(newRx) };
      tl = { x: newLx, y: tl.y };
      tr = { x: newRx, y: tr.y };
    }

    return { bl, br, tl, tr };
  };

  // Draw a wall's quad + internal structure
  const drawWall = (
    ctx: CanvasRenderingContext2D,
    wallPlacement: WallPlacement,
    wall: WallConfig,
    fill: string,
    stroke: string,
    label: "A" | "B",
  ) => {
    const { bl, br, tl, tr } = computeQuad(wallPlacement, wall);

    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(bl.x, bl.y);
    ctx.lineTo(br.x, br.y);
    ctx.lineTo(tr.x, tr.y);
    ctx.lineTo(tl.x, tl.y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = stroke;
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 6]);
    ctx.beginPath();
    ctx.moveTo(bl.x, bl.y);
    ctx.lineTo(br.x, br.y);
    ctx.lineTo(tr.x, tr.y);
    ctx.lineTo(tl.x, tl.y);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    const qp = (u: number, v: number): Point => ({
      x:
        (1 - u) * (1 - v) * bl.x +
        u * (1 - v) * br.x +
        (1 - u) * v * tl.x +
        u * v * tr.x,
      y:
        (1 - u) * (1 - v) * bl.y +
        u * (1 - v) * br.y +
        (1 - u) * v * tl.y +
        u * v * tr.y,
    });

    if (drawingMode) {
      // drawing-first mode: boundary only, still show label in corner mode
      if (mode === "corner") {
        const labelPt = qp(0.08, 0.88);
        const sz = 18;
        ctx.font = `bold ${sz}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 3;
        ctx.strokeText(label, labelPt.x, labelPt.y);
        ctx.fillText(label, labelPt.x, labelPt.y);
      }
      return;
    }

    if (wall.panelCount > 1) {
      ctx.strokeStyle = mullionColor;
      ctx.lineWidth = 2;
      for (let i = 1; i < wall.panelCount; i++) {
        const u = i / wall.panelCount;
        const pB = qp(u, 0);
        const pT = qp(u, 1);
        ctx.beginPath();
        ctx.moveTo(pB.x, pB.y);
        ctx.lineTo(pT.x, pT.y);
        ctx.stroke();
      }
    }

    if (frameTier === 2) {
      const pL = qp(0, 0.8);
      const pR = qp(1, 0.8);
      ctx.strokeStyle = mullionColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(pL.x, pL.y);
      ctx.lineTo(pR.x, pR.y);
      ctx.stroke();
    }

    if (
      wall.panelCount >= 1 &&
      wall.doorPanelIndex >= 1 &&
      wall.doorPanelIndex <= wall.panelCount
    ) {
      const uL = (wall.doorPanelIndex - 1) / wall.panelCount;
      const uR = wall.doorPanelIndex / wall.panelCount;
      const dbl = qp(uL, 0);
      const dbr = qp(uR, 0);
      const dtr = qp(uR, 1);
      const dtl = qp(uL, 1);
      ctx.strokeStyle = mullionColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(dbl.x, dbl.y);
      ctx.lineTo(dbr.x, dbr.y);
      ctx.lineTo(dtr.x, dtr.y);
      ctx.lineTo(dtl.x, dtl.y);
      ctx.closePath();
      ctx.stroke();
    }

    // label in corner mode
    if (mode === "corner") {
      const labelPt = qp(0.08, 0.88);
      const sz = 18;
      ctx.font = `bold ${sz}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 3;
      ctx.strokeText(label, labelPt.x, labelPt.y);
      ctx.fillText(label, labelPt.x, labelPt.y);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || size.w === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = size.w;
    canvas.height = size.h;
    ctx.drawImage(img, 0, 0, size.w, size.h);

    const drawSegment = (a: Point, b: Point, color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.fillStyle = color;
      [a, b].forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    // Draw Wall A quad if bottom exists
    if (wallAPlacement && aHasBottom) {
      drawWall(ctx, wallAPlacement, wallA, A_FILL, A_STROKE, "A");
      // Guide lines with wall-A colors
      const bA = { x: wallAPlacement.x1 * size.w, y: wallAPlacement.y1 * size.h };
      const bB = { x: wallAPlacement.x2 * size.w, y: wallAPlacement.y2 * size.h };
      drawSegment(bA, bB, A_BOTTOM);
      if (aHasTop) {
        const tA = {
          x: (wallAPlacement.topX1 as number) * size.w,
          y: (wallAPlacement.topY1 as number) * size.h,
        };
        const tB = {
          x: (wallAPlacement.topX2 as number) * size.w,
          y: (wallAPlacement.topY2 as number) * size.h,
        };
        drawSegment(tA, tB, A_TOP);
      }
    }

    // Draw Wall B quad if bottom exists
    if (mode === "corner" && wallBPlacement && bHasBottom && wallB) {
      drawWall(ctx, wallBPlacement, wallB, B_FILL, B_STROKE, "B");
      const bA = { x: wallBPlacement.x1 * size.w, y: wallBPlacement.y1 * size.h };
      const bB = { x: wallBPlacement.x2 * size.w, y: wallBPlacement.y2 * size.h };
      drawSegment(bA, bB, B_BOTTOM);
      if (bHasTop) {
        const tA = {
          x: (wallBPlacement.topX1 as number) * size.w,
          y: (wallBPlacement.topY1 as number) * size.h,
        };
        const tB = {
          x: (wallBPlacement.topX2 as number) * size.w,
          y: (wallBPlacement.topY2 as number) * size.h,
        };
        drawSegment(tA, tB, B_TOP);
      }
    }

    // Draw draggable handles when stage === done
    if (stage === "done") {
      const handles: { p: Point; color: string }[] = [];
      if (wallAPlacement) {
        handles.push({
          p: { x: wallAPlacement.x1 * size.w, y: wallAPlacement.y1 * size.h },
          color: A_BOTTOM,
        });
        handles.push({
          p: { x: wallAPlacement.x2 * size.w, y: wallAPlacement.y2 * size.h },
          color: A_BOTTOM,
        });
        if (aHasTop) {
          handles.push({
            p: {
              x: (wallAPlacement.topX1 as number) * size.w,
              y: (wallAPlacement.topY1 as number) * size.h,
            },
            color: A_TOP,
          });
          handles.push({
            p: {
              x: (wallAPlacement.topX2 as number) * size.w,
              y: (wallAPlacement.topY2 as number) * size.h,
            },
            color: A_TOP,
          });
        }
      }
      if (mode === "corner" && wallBPlacement) {
        handles.push({
          p: { x: wallBPlacement.x1 * size.w, y: wallBPlacement.y1 * size.h },
          color: B_BOTTOM,
        });
        handles.push({
          p: { x: wallBPlacement.x2 * size.w, y: wallBPlacement.y2 * size.h },
          color: B_BOTTOM,
        });
        if (bHasTop) {
          handles.push({
            p: {
              x: (wallBPlacement.topX1 as number) * size.w,
              y: (wallBPlacement.topY1 as number) * size.h,
            },
            color: B_TOP,
          });
          handles.push({
            p: {
              x: (wallBPlacement.topX2 as number) * size.w,
              y: (wallBPlacement.topY2 as number) * size.h,
            },
            color: B_TOP,
          });
        }
      }
      handles.forEach(({ p, color }) => {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // in-progress drag preview
    if (drawing && start && current) {
      const activeColor =
        stage === "a-bottom"
          ? A_BOTTOM
          : stage === "a-top"
            ? A_TOP
            : stage === "b-bottom"
              ? B_BOTTOM
              : B_TOP;
      drawSegment(start, current, activeColor);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    size,
    drawing,
    start,
    current,
    placement,
    heightRatio,
    frameTier,
    mode,
    wallA,
    wallB,
    stage,
    mullionColor,
    drawingMode,
  ]);

  const getPoint = (e: React.PointerEvent): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const hitHandle = (p: Point): HandleId | null => {
    if (!placement) return null;
    const candidates: { id: HandleId; x: number; y: number }[] = [];
    candidates.push(
      { id: "a-b1", x: placement.x1 * size.w, y: placement.y1 * size.h },
      { id: "a-b2", x: placement.x2 * size.w, y: placement.y2 * size.h },
    );
    if (aHasTop) {
      candidates.push(
        { id: "a-t1", x: (placement.topX1 as number) * size.w, y: (placement.topY1 as number) * size.h },
        { id: "a-t2", x: (placement.topX2 as number) * size.w, y: (placement.topY2 as number) * size.h },
      );
    }
    if (placement.wallB) {
      const wb = placement.wallB;
      candidates.push(
        { id: "b-b1", x: wb.x1 * size.w, y: wb.y1 * size.h },
        { id: "b-b2", x: wb.x2 * size.w, y: wb.y2 * size.h },
      );
      if (
        wb.topX1 !== undefined &&
        wb.topY1 !== undefined &&
        wb.topX2 !== undefined &&
        wb.topY2 !== undefined
      ) {
        candidates.push(
          { id: "b-t1", x: wb.topX1 * size.w, y: wb.topY1 * size.h },
          { id: "b-t2", x: wb.topX2 * size.w, y: wb.topY2 * size.h },
        );
      }
    }
    let nearest: HandleId | null = null;
    let minDist = HANDLE_RADIUS;
    for (const c of candidates) {
      const d = Math.hypot(c.x - p.x, c.y - p.y);
      if (d <= minDist) {
        minDist = d;
        nearest = c.id;
      }
    }
    return nearest;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    const p = getPoint(e);

    if (stage === "done") {
      const handle = hitHandle(p);
      if (handle) {
        setDraggingHandle(handle);
        return;
      }
      return;
    }

    setStart(p);
    setCurrent(p);
    setDrawing(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const p = getPoint(e);
    if (draggingHandle && placement) {
      const nx = p.x / size.w;
      const ny = p.y / size.h;
      const next: PartitionPlacement = { ...placement };
      switch (draggingHandle) {
        case "a-b1":
          next.x1 = nx;
          next.y1 = ny;
          break;
        case "a-b2":
          next.x2 = nx;
          next.y2 = ny;
          break;
        case "a-t1":
          next.topX1 = nx;
          next.topY1 = ny;
          break;
        case "a-t2":
          next.topX2 = nx;
          next.topY2 = ny;
          break;
        case "b-b1":
          if (next.wallB) next.wallB = { ...next.wallB, x1: nx, y1: ny };
          break;
        case "b-b2":
          if (next.wallB) next.wallB = { ...next.wallB, x2: nx, y2: ny };
          break;
        case "b-t1":
          if (next.wallB) next.wallB = { ...next.wallB, topX1: nx, topY1: ny };
          break;
        case "b-t2":
          if (next.wallB) next.wallB = { ...next.wallB, topX2: nx, topY2: ny };
          break;
      }
      onChange(next);
      return;
    }
    if (drawing) {
      setCurrent(p);
    }
  };

  const commitLine = (start: Point, end: Point) => {
    const nx1 = start.x / size.w;
    const ny1 = start.y / size.h;
    const nx2 = end.x / size.w;
    const ny2 = end.y / size.h;
    switch (stage) {
      case "a-bottom":
        onChange({
          x1: nx1,
          y1: ny1,
          x2: nx2,
          y2: ny2,
          wallB: placement?.wallB,
        });
        break;
      case "a-top":
        if (placement) {
          onChange({
            ...placement,
            topX1: nx1,
            topY1: ny1,
            topX2: nx2,
            topY2: ny2,
          });
        }
        break;
      case "b-bottom":
        if (placement) {
          onChange({
            ...placement,
            wallB: { x1: nx1, y1: ny1, x2: nx2, y2: ny2 },
          });
        }
        break;
      case "b-top":
        if (placement?.wallB) {
          onChange({
            ...placement,
            wallB: {
              ...placement.wallB,
              topX1: nx1,
              topY1: ny1,
              topX2: nx2,
              topY2: ny2,
            },
          });
        }
        break;
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (draggingHandle) {
      setDraggingHandle(null);
      return;
    }
    if (!drawing || !start) return;
    const end = getPoint(e);
    setDrawing(false);
    const dist = Math.hypot(end.x - start.x, end.y - start.y);
    if (dist < 8) {
      setStart(null);
      setCurrent(null);
      return;
    }
    commitLine(start, end);
    setStart(null);
    setCurrent(null);
  };

  const clearAll = () => {
    onChange(null);
    setStart(null);
    setCurrent(null);
  };

  const stageHint =
    mode === "corner"
      ? stage === "a-bottom"
        ? "Step 1/4 — 벽 A (왼쪽) 바닥선 드래그"
        : stage === "a-top"
          ? "Step 2/4 — 벽 A (왼쪽) 천장선 드래그"
          : stage === "b-bottom"
            ? "Step 3/4 — 벽 B (오른쪽) 바닥선 드래그"
            : stage === "b-top"
              ? "Step 4/4 — 벽 B (오른쪽) 천장선 드래그"
              : "✓ 점을 드래그해서 위치 조정"
      : stage === "a-bottom"
        ? "Step 1 — 바닥 라인을 드래그하세요"
        : stage === "a-top"
          ? "Step 2 — 천장 라인을 드래그하세요"
          : "✓ 점을 드래그해서 위치 조정";

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="w-full">
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ touchAction: "none", width: size.w, height: size.h }}
          className="rounded-xl border bg-zinc-100 select-none"
        />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-600">{stageHint}</span>
        <div className="flex gap-2">
          {aHasBottom && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1 text-red-600"
            >
              <Eraser size={14} /> 전체 지우기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
