import type {
  PartitionSpec,
  PartitionPlacement,
  WallPlacement,
  WallSpec,
  FrameColor,
  FrameTier,
  StartSide,
} from "./prompt-builder";

export interface ResizedImage {
  dataUrl: string;
  base64: string;
  mimeType: string;
  width: number;
  height: number;
}

export interface PlacementLine {
  x1: number; // 0..1 normalized
  y1: number;
  x2: number;
  y2: number;
  topX1?: number;
  topY1?: number;
  topX2?: number;
  topY2?: number;
}

export async function generatePlacementMask(
  sourceDataUrl: string,
  placement: PlacementLine,
  heightMm: number,
  siteHeightMm: number,
): Promise<{ dataUrl: string; blob: Blob }> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = sourceDataUrl;
  });
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");

  // fill black
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, w, h);

  // compute rectangle from placement line
  const x1 = placement.x1 * w;
  const x2 = placement.x2 * w;
  const xLeft = Math.min(x1, x2);
  const xRight = Math.max(x1, x2);

  // use the LOWER (larger y) endpoint as floor base
  const baseY = Math.max(placement.y1, placement.y2) * h;
  const heightRatio = siteHeightMm > 0 ? heightMm / siteHeightMm : 0.85;
  const rectH = heightRatio * h;
  const topY = Math.max(0, baseY - rectH);

  // draw white rectangle
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(xLeft, topY, xRight - xLeft, baseY - topY);

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/png",
    ),
  );
  const dataUrl = canvas.toDataURL("image/png");
  return { dataUrl, blob };
}

const FRAME_HEX: Record<FrameColor, string> = {
  black: "#111111",
  white: "#f5f5f5",
  "dark-gray": "#3a3a3a",
};

type Pt = { x: number; y: number };

interface WallOverlayOptions {
  label: "A" | "B";
  outlineColor: string; // magenta or cyan
  fillColor: string;
  placement: WallPlacement;
  panelCount: number;
  doorPanelIndex: number;
  frameTier: FrameTier;
  frameColor: FrameColor;
  siteWidthMm: number;
  siteHeightMm: number;
  partitionWidthMm: number;
  heightMm: number;
  startSide: StartSide;
  /** Skip the startSide corridor shift (used when drawing wall B which shares edge with A). */
  skipCorridorShift?: boolean;
}

function drawWallOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  strokeW: number,
  opts: WallOverlayOptions,
) {
  const {
    label,
    outlineColor,
    fillColor,
    placement,
    panelCount,
    doorPanelIndex,
    frameTier,
    frameColor,
    siteWidthMm,
    siteHeightMm,
    partitionWidthMm,
    heightMm,
    startSide,
    skipCorridorShift,
  } = opts;

  const bottomA: Pt = { x: placement.x1 * w, y: placement.y1 * h };
  const bottomB: Pt = { x: placement.x2 * w, y: placement.y2 * h };
  let bl: Pt = bottomA.x <= bottomB.x ? bottomA : bottomB;
  let br: Pt = bottomA.x <= bottomB.x ? bottomB : bottomA;

  const hasTop =
    placement.topX1 !== undefined &&
    placement.topY1 !== undefined &&
    placement.topX2 !== undefined &&
    placement.topY2 !== undefined;

  let tl: Pt;
  let tr: Pt;
  if (hasTop) {
    const topA: Pt = {
      x: (placement.topX1 as number) * w,
      y: (placement.topY1 as number) * h,
    };
    const topB: Pt = {
      x: (placement.topX2 as number) * w,
      y: (placement.topY2 as number) * h,
    };
    tl = topA.x <= topB.x ? topA : topB;
    tr = topA.x <= topB.x ? topB : topA;
  } else {
    const baseY = Math.max(bl.y, br.y);
    const heightRatio = siteHeightMm > 0 ? heightMm / siteHeightMm : 0.85;
    const rectH = Math.min(baseY, heightRatio * h);
    const topY = Math.max(0, baseY - rectH);
    tl = { x: bl.x, y: topY };
    tr = { x: br.x, y: topY };
  }

  if (
    !hasTop &&
    !skipCorridorShift &&
    siteWidthMm > 0 &&
    partitionWidthMm > 0 &&
    partitionWidthMm < siteWidthMm
  ) {
    const r = partitionWidthMm / siteWidthMm;
    const lineW = br.x - bl.x;
    const partitionPixelW = lineW * r;
    let newLx = bl.x;
    let newRx = br.x;
    if (startSide === "right") {
      newRx = br.x;
      newLx = br.x - partitionPixelW;
    } else if (startSide === "left") {
      newLx = bl.x;
      newRx = bl.x + partitionPixelW;
    } else {
      const center = (bl.x + br.x) / 2;
      newLx = center - partitionPixelW / 2;
      newRx = center + partitionPixelW / 2;
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

  const quadPt = (u: number, v: number): Pt => ({
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

  const tracePolygon = () => {
    ctx.beginPath();
    ctx.moveTo(bl.x, bl.y);
    ctx.lineTo(br.x, br.y);
    ctx.lineTo(tr.x, tr.y);
    ctx.lineTo(tl.x, tl.y);
    ctx.closePath();
  };

  // 1) semi-transparent fill
  ctx.fillStyle = fillColor;
  tracePolygon();
  ctx.fill();

  // 2) white halo
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.setLineDash([]);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = strokeW + 6;
  tracePolygon();
  ctx.stroke();

  // 3) thick dashed outline
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = strokeW;
  ctx.setLineDash([20, 12]);
  tracePolygon();
  ctx.stroke();
  ctx.setLineDash([]);

  const LIME = FRAME_HEX[frameColor];
  ctx.lineCap = "butt";

  // vertical panel dividers
  if (panelCount > 1) {
    ctx.strokeStyle = LIME;
    ctx.lineWidth = Math.max(4, Math.round(strokeW * 0.8));
    for (let i = 1; i < panelCount; i++) {
      const u = i / panelCount;
      const pB = quadPt(u, 0);
      const pT = quadPt(u, 1);
      ctx.beginPath();
      ctx.moveTo(pB.x, pB.y);
      ctx.lineTo(pT.x, pT.y);
      ctx.stroke();
    }
  }

  // 2-tier horizontal mullion
  if (frameTier === 2) {
    const pL = quadPt(0, 0.8);
    const pR = quadPt(1, 0.8);
    ctx.strokeStyle = LIME;
    ctx.lineWidth = Math.max(4, Math.round(strokeW * 0.8));
    ctx.beginPath();
    ctx.moveTo(pL.x, pL.y);
    ctx.lineTo(pR.x, pR.y);
    ctx.stroke();
  }

  // door cell outline
  if (
    panelCount >= 1 &&
    doorPanelIndex >= 1 &&
    doorPanelIndex <= panelCount
  ) {
    const uL = (doorPanelIndex - 1) / panelCount;
    const uR = doorPanelIndex / panelCount;
    const dbl = quadPt(uL, 0);
    const dbr = quadPt(uR, 0);
    const dtr = quadPt(uR, 1);
    const dtl = quadPt(uL, 1);
    ctx.strokeStyle = LIME;
    ctx.lineWidth = Math.max(5, Math.round(strokeW * 1.2));
    ctx.beginPath();
    ctx.moveTo(dbl.x, dbl.y);
    ctx.lineTo(dbr.x, dbr.y);
    ctx.lineTo(dtr.x, dtr.y);
    ctx.lineTo(dtl.x, dtl.y);
    ctx.closePath();
    ctx.stroke();
  }

  // No text label — color difference alone distinguishes A (magenta) vs B (cyan).
  // Text labels tend to get preserved by the AI as actual image content.
  void label;
}

function wallTotalWidth(wall: WallSpec): number {
  return wall.panelCount * wall.panelWidthMm;
}

export async function burnPlacementOntoImage(
  sourceDataUrl: string,
  spec: PartitionSpec,
  placement: PartitionPlacement,
): Promise<{ dataUrl: string; base64: string; mimeType: string }> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = sourceDataUrl;
  });
  const canvas = document.createElement("canvas");
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");
  ctx.drawImage(img, 0, 0);

  const strokeW = Math.max(6, Math.round(w * 0.008));

  // Wall A overlay (magenta)
  drawWallOverlay(ctx, w, h, strokeW, {
    label: "A",
    outlineColor: "#ff00c8",
    fillColor: "rgba(255, 0, 200, 0.55)",
    placement: {
      x1: placement.x1,
      y1: placement.y1,
      x2: placement.x2,
      y2: placement.y2,
      topX1: placement.topX1,
      topY1: placement.topY1,
      topX2: placement.topX2,
      topY2: placement.topY2,
    },
    panelCount: spec.panelCount,
    doorPanelIndex: spec.doorPanelIndex,
    frameTier: spec.frameTier,
    frameColor: spec.frameColor,
    siteWidthMm: spec.siteWidthMm,
    siteHeightMm: spec.siteHeightMm,
    partitionWidthMm: spec.panelCount * spec.panelWidthMm,
    heightMm: spec.heightMm,
    startSide: spec.startSide,
  });

  // Wall B overlay (cyan) — only for 2D corner mode
  if (spec.wallB && placement.wallB) {
    drawWallOverlay(ctx, w, h, strokeW, {
      label: "B",
      outlineColor: "#00b4d8",
      fillColor: "rgba(0, 180, 216, 0.55)",
      placement: placement.wallB,
      panelCount: spec.wallB.panelCount,
      doorPanelIndex: spec.wallB.doorPanelIndex,
      frameTier: spec.frameTier,
      frameColor: spec.frameColor,
      siteWidthMm: spec.wallB.siteWidthMm,
      siteHeightMm: spec.siteHeightMm,
      partitionWidthMm: wallTotalWidth(spec.wallB),
      heightMm: spec.heightMm,
      startSide: spec.wallB.startSide,
    });
  }

  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  const base64 = dataUrl.split(",")[1] ?? "";
  return { dataUrl, base64, mimeType: "image/jpeg" };
}

const DEFAULT_MAX_EDGE = 1280;
const DEFAULT_QUALITY = 0.85;

export async function resizeImageFile(
  file: File,
  maxEdge: number = DEFAULT_MAX_EDGE,
  quality: number = DEFAULT_QUALITY,
): Promise<ResizedImage> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
  } catch (err) {
    const ext = file.name.toLowerCase().split(".").pop() ?? "";
    if (ext === "heic" || ext === "heif") {
      throw new Error(
        "HEIC/HEIF 형식은 지원되지 않습니다. JPEG 또는 PNG로 변환 후 다시 업로드해주세요.",
      );
    }
    throw new Error(
      "이미지를 읽을 수 없습니다. JPEG/PNG 형식인지 확인해주세요. (" +
        (err instanceof Error ? err.message : String(err)) +
        ")",
    );
  }
  const { width: w0, height: h0 } = bitmap;
  const scale = Math.min(1, maxEdge / Math.max(w0, h0));
  const width = Math.round(w0 * scale);
  const height = Math.round(h0 * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      quality,
    ),
  );

  const dataUrl: string = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });

  const base64 = dataUrl.split(",")[1] ?? "";
  return {
    dataUrl,
    base64,
    mimeType: "image/jpeg",
    width,
    height,
  };
}
