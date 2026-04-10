"use client";

import type { PartitionSpec, WallSpec } from "@/lib/prompt-builder";

interface Props {
  spec: PartitionSpec;
  /** If provided, renders this wall instead of spec's wall A (used for wall B in 2D mode) */
  wallOverride?: WallSpec;
  width?: number;
}

const FRAME_FILL: Record<PartitionSpec["frameColor"], string> = {
  black: "#111",
  white: "#888",
  "dark-gray": "#3a3a3a",
};

export function ElevationSvg({ spec, wallOverride, width = 480 }: Props) {
  const panelCount = wallOverride?.panelCount ?? spec.panelCount;
  const panelWidthMm = wallOverride?.panelWidthMm ?? spec.panelWidthMm;
  const doorPanelIndex = wallOverride?.doorPanelIndex ?? spec.doorPanelIndex;

  const widthMm = panelCount * panelWidthMm;
  const ratio = spec.heightMm / widthMm;
  const margin = 60;
  const drawW = width - margin * 2;
  const drawH = drawW * ratio;
  const totalH = drawH + margin * 2;

  const x0 = margin;
  const y0 = margin;
  const x1 = margin + drawW;
  const y1 = margin + drawH;

  const fill = "rgba(180,210,230,0.35)";
  const stroke = FRAME_FILL[spec.frameColor];

  const panelDrawW = drawW / panelCount;
  const tierY = spec.frameTier === 2 ? y0 + drawH * 0.2 : null;

  const doorIdx = Math.max(1, Math.min(panelCount, doorPanelIndex));
  const doorX = x0 + panelDrawW * (doorIdx - 1);
  const doorPanelW = panelDrawW;
  const arcRadius = Math.min(doorPanelW * 0.9, drawH - 20);

  return (
    <svg
      viewBox={`0 0 ${width} ${totalH}`}
      className="w-full h-auto bg-white"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* glass panel background */}
      <rect
        x={x0}
        y={y0}
        width={drawW}
        height={drawH}
        fill={fill}
        stroke={stroke}
        strokeWidth={3}
      />

      {/* panel dividers (vertical mullions) */}
      {Array.from({ length: panelCount - 1 }).map((_, i) => {
        const x = x0 + panelDrawW * (i + 1);
        return (
          <line
            key={i}
            x1={x}
            y1={y0}
            x2={x}
            y2={y1}
            stroke={stroke}
            strokeWidth={2}
          />
        );
      })}

      {/* horizontal mullion (2-tier) */}
      {tierY != null && (
        <line
          x1={x0}
          y1={tierY}
          x2={x1}
          y2={tierY}
          stroke={stroke}
          strokeWidth={2}
        />
      )}

      {/* door (only when doorPanelIndex > 0) */}
      {doorPanelIndex > 0 && (
        <>
          <rect
            x={doorX + 4}
            y={y0 + 4}
            width={doorPanelW - 8}
            height={drawH - 8}
            fill="none"
            stroke={stroke}
            strokeWidth={2}
            strokeDasharray="6 4"
          />
          <path
            d={`M ${doorX} ${y1 - 6} A ${arcRadius} ${arcRadius} 0 0 1 ${doorX + arcRadius} ${y1 - 6 - arcRadius}`}
            fill="none"
            stroke={stroke}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <circle
            cx={doorX + doorPanelW - 14}
            cy={y0 + drawH / 2}
            r={3}
            fill={stroke}
          />
        </>
      )}

      {/* width dimension (bottom) */}
      <g stroke="#222" strokeWidth={1} fill="none">
        <line x1={x0} y1={y1 + 25} x2={x1} y2={y1 + 25} />
        <line x1={x0} y1={y1 + 20} x2={x0} y2={y1 + 30} />
        <line x1={x1} y1={y1 + 20} x2={x1} y2={y1 + 30} />
      </g>
      <text
        x={(x0 + x1) / 2}
        y={y1 + 45}
        textAnchor="middle"
        fontSize={13}
        fill="#222"
      >
        W {widthMm} mm ({panelCount}칸 × {panelWidthMm}mm)
      </text>

      {/* height dimension (left) */}
      <g stroke="#222" strokeWidth={1} fill="none">
        <line x1={x0 - 25} y1={y0} x2={x0 - 25} y2={y1} />
        <line x1={x0 - 30} y1={y0} x2={x0 - 20} y2={y0} />
        <line x1={x0 - 30} y1={y1} x2={x0 - 20} y2={y1} />
      </g>
      <text
        x={x0 - 35}
        y={(y0 + y1) / 2}
        textAnchor="middle"
        fontSize={13}
        fill="#222"
        transform={`rotate(-90, ${x0 - 35}, ${(y0 + y1) / 2})`}
      >
        H {spec.heightMm} mm
      </text>

      {/* spec label */}
      <text x={x0} y={y0 - 15} fontSize={11} fill="#666">
        glass + steel · frame: {spec.frameColor} ·{" "}
        {spec.frameTier === 1 ? "1단" : "2단"} ·{" "}
        {doorPanelIndex > 0 ? `door @ panel #${doorIdx}` : "no door"}
      </text>
    </svg>
  );
}
