"use client";

import { useEffect, useRef, useState } from "react";
import type { PartitionPlacement } from "@/lib/prompt-builder";
import { Eraser } from "lucide-react";

interface Props {
  imageUrl: string;
  placement: PartitionPlacement | null;
  onChange: (p: PartitionPlacement | null) => void;
  heightRatio: number; // heightMm / siteHeightMm
  panelCount: number;
  doorPanelIndex: number;
  frameTier: 1 | 2;
  widthRatio?: number; // partitionWidthMm / siteWidthMm (0~1)
  startSide?: "left" | "right" | "center";
}

const LINE_COLOR = "#f97316"; // orange (bottom)
const TOP_COLOR = "#22d3ee"; // cyan (top)
const RECT_FILL = "rgba(255, 0, 200, 0.35)";
const RECT_STROKE = "#ff00c8";
const DOOR_FILL = "rgba(0, 200, 255, 0.35)";
const DOOR_STROKE = "#00c8ff";

interface Point {
  x: number;
  y: number;
}

type Stage = "bottom" | "top" | "done";

export function PlacementCanvas({
  imageUrl,
  placement,
  onChange,
  heightRatio,
  panelCount,
  doorPanelIndex,
  frameTier,
  widthRatio = 1,
  startSide = "right",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [drawing, setDrawing] = useState(false);
  const [start, setStart] = useState<Point | null>(null);
  const [current, setCurrent] = useState<Point | null>(null);

  // determine current stage from placement
  const hasBottom = !!placement;
  const hasTop =
    !!placement &&
    placement.topX1 !== undefined &&
    placement.topY1 !== undefined &&
    placement.topX2 !== undefined &&
    placement.topY2 !== undefined;
  const stage: Stage = !hasBottom ? "bottom" : !hasTop ? "top" : "done";

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

    // Determine 4 corners
    let bl: Point | null = null;
    let br: Point | null = null;
    let tl: Point | null = null;
    let tr: Point | null = null;

    if (placement) {
      const bA = { x: placement.x1 * size.w, y: placement.y1 * size.h };
      const bB = { x: placement.x2 * size.w, y: placement.y2 * size.h };
      bl = bA.x <= bB.x ? bA : bB;
      br = bA.x <= bB.x ? bB : bA;
      if (hasTop) {
        const tA = {
          x: (placement.topX1 as number) * size.w,
          y: (placement.topY1 as number) * size.h,
        };
        const tB = {
          x: (placement.topX2 as number) * size.w,
          y: (placement.topY2 as number) * size.h,
        };
        tl = tA.x <= tB.x ? tA : tB;
        tr = tA.x <= tB.x ? tB : tA;
      } else {
        // fallback rectangle
        const baseY = Math.max(bl.y, br.y);
        const rectH = Math.min(baseY, heightRatio * size.h);
        const topY = Math.max(0, baseY - rectH);
        tl = { x: bl.x, y: topY };
        tr = { x: br.x, y: topY };
      }
    }

    // apply widthRatio/startSide when quad mode is not active (no top line)
    if (
      bl && br && tl && tr &&
      !hasTop &&
      widthRatio > 0 &&
      widthRatio < 1
    ) {
      const lineW = br.x - bl.x;
      const partitionW = lineW * widthRatio;
      let newLx = bl.x;
      let newRx = br.x;
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
        const t = (xx - bl!.x) / (lineW || 1);
        return bl!.y + t * (br!.y - bl!.y);
      };
      // corridor fill (gray)
      ctx.fillStyle = "rgba(120, 120, 120, 0.35)";
      if (startSide === "right" && newLx > bl.x) {
        ctx.beginPath();
        ctx.moveTo(bl.x, bl.y);
        ctx.lineTo(newLx, interpY(newLx));
        ctx.lineTo(newLx, tl.y);
        ctx.lineTo(bl.x, tl.y);
        ctx.closePath();
        ctx.fill();
      } else if (startSide === "left" && newRx < br.x) {
        ctx.beginPath();
        ctx.moveTo(newRx, interpY(newRx));
        ctx.lineTo(br.x, br.y);
        ctx.lineTo(br.x, tr.y);
        ctx.lineTo(newRx, tr.y);
        ctx.closePath();
        ctx.fill();
      }
      bl = { x: newLx, y: interpY(newLx) };
      br = { x: newRx, y: interpY(newRx) };
      tl = { x: newLx, y: tl.y };
      tr = { x: newRx, y: tr.y };
    }

    // draw quad fill + outline
    if (bl && br && tl && tr) {
      ctx.fillStyle = RECT_FILL;
      ctx.beginPath();
      ctx.moveTo(bl.x, bl.y);
      ctx.lineTo(br.x, br.y);
      ctx.lineTo(tr.x, tr.y);
      ctx.lineTo(tl.x, tl.y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = RECT_STROKE;
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

      // bilinear helper
      const qp = (u: number, v: number): Point => ({
        x:
          (1 - u) * (1 - v) * bl!.x +
          u * (1 - v) * br!.x +
          (1 - u) * v * tl!.x +
          u * v * tr!.x,
        y:
          (1 - u) * (1 - v) * bl!.y +
          u * (1 - v) * br!.y +
          (1 - u) * v * tl!.y +
          u * v * tr!.y,
      });

      // vertical panel dividers
      if (panelCount > 1) {
        ctx.strokeStyle = RECT_STROKE;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        for (let i = 1; i < panelCount; i++) {
          const u = i / panelCount;
          const pB = qp(u, 0);
          const pT = qp(u, 1);
          ctx.beginPath();
          ctx.moveTo(pB.x, pB.y);
          ctx.lineTo(pT.x, pT.y);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }

      // 2-tier horizontal mullion at v=0.8
      if (frameTier === 2) {
        const pL = qp(0, 0.8);
        const pR = qp(1, 0.8);
        ctx.strokeStyle = RECT_STROKE;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(pL.x, pL.y);
        ctx.lineTo(pR.x, pR.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // door cell highlight
      if (
        panelCount >= 1 &&
        doorPanelIndex >= 1 &&
        doorPanelIndex <= panelCount
      ) {
        const uL = (doorPanelIndex - 1) / panelCount;
        const uR = doorPanelIndex / panelCount;
        const dbl = qp(uL, 0);
        const dbr = qp(uR, 0);
        const dtr = qp(uR, 1);
        const dtl = qp(uL, 1);
        ctx.fillStyle = DOOR_FILL;
        ctx.beginPath();
        ctx.moveTo(dbl.x, dbl.y);
        ctx.lineTo(dbr.x, dbr.y);
        ctx.lineTo(dtr.x, dtr.y);
        ctx.lineTo(dtl.x, dtl.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = DOOR_STROKE;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      // draw bottom line (orange) and top line (cyan) guide lines
      drawSegment(bl, br, LINE_COLOR);
      if (hasTop) drawSegment(tl, tr, TOP_COLOR);
    }

    // in-progress drag
    if (drawing && start && current) {
      const activeColor = stage === "bottom" ? LINE_COLOR : TOP_COLOR;
      drawSegment(start, current, activeColor);
    }
  }, [
    size,
    drawing,
    start,
    current,
    placement,
    heightRatio,
    panelCount,
    doorPanelIndex,
    frameTier,
    widthRatio,
    startSide,
    hasTop,
    stage,
  ]);

  const getPoint = (e: React.PointerEvent): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (stage === "done") return; // require clear first
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    const p = getPoint(e);
    setStart(p);
    setCurrent(p);
    setDrawing(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawing) return;
    setCurrent(getPoint(e));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!drawing || !start) return;
    const end = getPoint(e);
    setDrawing(false);
    const dist = Math.hypot(end.x - start.x, end.y - start.y);
    if (dist < 8) {
      setStart(null);
      setCurrent(null);
      return;
    }
    if (stage === "bottom") {
      onChange({
        x1: start.x / size.w,
        y1: start.y / size.h,
        x2: end.x / size.w,
        y2: end.y / size.h,
      });
    } else if (stage === "top" && placement) {
      onChange({
        ...placement,
        topX1: start.x / size.w,
        topY1: start.y / size.h,
        topX2: end.x / size.w,
        topY2: end.y / size.h,
      });
    }
    setStart(null);
    setCurrent(null);
  };

  const clearAll = () => {
    onChange(null);
    setStart(null);
    setCurrent(null);
  };

  const clearTop = () => {
    if (!placement) return;
    const { x1, y1, x2, y2 } = placement;
    onChange({ x1, y1, x2, y2 }); // drop top fields
  };

  const stageHint =
    stage === "bottom"
      ? "Step 1 — 바닥 라인을 드래그하세요 (칸막이가 바닥에 닿는 선)"
      : stage === "top"
        ? "Step 2 — 천장 라인을 드래그하세요 (칸막이 윗변)"
        : "✓ 완료 · 자홍=칸막이 사다리꼴, 하늘색=도어 위치";

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
          {stage === "done" && (
            <button
              onClick={clearTop}
              className="flex items-center gap-1 text-zinc-600"
            >
              천장선만 지우기
            </button>
          )}
          {hasBottom && (
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
