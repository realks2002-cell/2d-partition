"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/store";
import { useHydrateImages } from "@/lib/use-hydrate-images";
import { apiUrl, authHeaders } from "@/lib/api-client";
import { burnPlacementOntoImage, resizeImageFile } from "@/lib/image";
import { PlacementCanvas } from "@/components/placement-canvas";
import {
  totalWidthMm,
  type FrameColor,
  type FrameTier,
  type PanelWidthMm,
  type StartSide,
} from "@/lib/prompt-builder";
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  Minus,
  Plus,
  Upload,
  X,
} from "lucide-react";

const COLOR_OPTIONS: { value: FrameColor; label: string; swatch: string }[] = [
  { value: "black", label: "검정", swatch: "#141414" },
  { value: "white", label: "흰색", swatch: "#f6f5f2" },
  { value: "dark-gray", label: "다크그레이", swatch: "#3a3a3a" },
];

export default function SpecPage() {
  useHydrateImages();
  const router = useRouter();
  const {
    sourceImage,
    sourceMimeType,
    drawingImage,
    drawingMimeType,
    setDrawing,
    placement,
    setPlacement,
    spec,
    setSpec,
    setRenderings,
    dimension,
    currentSegment,
  } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const drawingFileRef = useRef<HTMLInputElement>(null);

  const handleDrawingFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const r = await resizeImageFile(f);
      setDrawing(r.dataUrl, r.mimeType);
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  if (!sourceImage) {
    return (
      <main className="p-6 max-w-md mx-auto pt-safe">
        <p className="caption">현장사진이 없습니다.</p>
        <button onClick={() => router.push("/")} className="btn btn-primary mt-4">
          홈으로
        </button>
      </main>
    );
  }

  const totalW = totalWidthMm(spec);
  const corridorMm = Math.max(0, spec.siteWidthMm - totalW);

  const setPanelCount = (n: number) => {
    const v = Math.max(1, Math.min(30, n));
    setSpec({
      panelCount: v,
      doorPanelIndex: Math.min(spec.doorPanelIndex, v),
    });
  };

  const setSiteWidth = (siteWidthMm: number) => {
    const auto = Math.max(
      1,
      Math.min(30, Math.round(siteWidthMm / spec.panelWidthMm)),
    );
    setSpec({
      siteWidthMm,
      panelCount: auto,
      doorPanelIndex: Math.min(spec.doorPanelIndex, auto),
    });
  };

  const setPanelWidth = (panelWidthMm: PanelWidthMm) => {
    const auto = Math.max(
      1,
      Math.min(30, Math.round(spec.siteWidthMm / panelWidthMm)),
    );
    setSpec({
      panelWidthMm,
      panelCount: auto,
      doorPanelIndex: Math.min(spec.doorPanelIndex, auto),
    });
  };

  const render = async () => {
    setBusy(true);
    setError(null);
    try {
      let imageBase64: string;
      let imageMimeType: string;
      if (placement) {
        const burned = await burnPlacementOntoImage(
          sourceImage,
          placement,
          spec.heightMm,
          spec.siteHeightMm,
          spec.panelCount,
          spec.doorPanelIndex,
          spec.frameTier,
          spec.siteWidthMm,
          totalWidthMm(spec),
          spec.startSide,
          spec.frameColor,
        );
        imageBase64 = burned.base64;
        imageMimeType = burned.mimeType;
      } else {
        const [, b64] = sourceImage.split(",");
        imageBase64 = b64;
        imageMimeType = sourceMimeType ?? "image/jpeg";
      }
      const drawingB64 = drawingImage?.split(",")[1];
      const res = await fetch(apiUrl("/api/render"), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          mode: "C",
          spec,
          placement,
          imageBase64,
          imageMimeType,
          drawingBase64: drawingB64,
          drawingMimeType: drawingB64 ? drawingMimeType : undefined,
          count: 1,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "렌더링 실패");
      setRenderings(json.images);
      router.push("/result");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-[100dvh] max-w-md mx-auto px-5 pt-safe pb-32">
      {/* Top bar */}
      <div className="flex items-center justify-between pt-3 pb-2">
        <Link href="/capture?kind=photo" className="btn-icon" aria-label="뒤로">
          <ArrowLeft size={18} />
        </Link>
        <div className="mono text-[11px] text-[var(--muted)]">02 / 04</div>
        {dimension === 2 ? (
          <div className="chip-soft">Seg {currentSegment}/2</div>
        ) : (
          <div className="w-[44px]" />
        )}
      </div>

      <header className="mb-4">
        <div className="eyebrow mb-1.5">Specification</div>
        <h1 className="display-tight text-[22px]">스펙 설정</h1>
      </header>

      {/* REF — Drawing reference */}
      <Section idx="REF" title="참고 도면" tag="optional">
        <input
          ref={drawingFileRef}
          type="file"
          accept=".png,.jpg,.jpeg,image/png,image/jpeg"
          onChange={handleDrawingFile}
          className="hidden"
        />
        {drawingImage ? (
          <div className="relative surface overflow-hidden">
            <img
              src={drawingImage}
              alt=""
              className="w-full max-h-44 object-contain bg-[var(--surface-2)]"
            />
            <button
              onClick={() => setDrawing(null, null)}
              className="absolute top-3 right-3 btn-icon"
              style={{ width: 36, height: 36 }}
              aria-label="도면 제거"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => drawingFileRef.current?.click()}
            className="w-full py-8 rounded-[var(--radius-md)] border border-dashed border-[var(--line-2)] flex flex-col items-center gap-2.5 bg-[var(--surface)] transition-colors active:bg-[var(--surface-2)]"
          >
            <Upload size={22} className="text-[var(--ink-3)]" />
            <span className="text-[14px] font-medium text-[var(--ink)]">
              도면 이미지 첨부
            </span>
            <span className="caption">Style guide — 치수/주석 무시</span>
          </button>
        )}
      </Section>

      {/* 01 — Site dimensions */}
      <Section idx="01" title="현장 치수">
        <div className="grid grid-cols-2 gap-3">
          <NumField
            label="현장 폭"
            unit="mm · W"
            value={spec.siteWidthMm}
            onChange={setSiteWidth}
          />
          <NumField
            label="현장 높이"
            unit="mm · H"
            value={spec.siteHeightMm}
            onChange={(v) => setSpec({ siteHeightMm: v })}
          />
        </div>
      </Section>

      {/* 02 — Panel composition */}
      <Section idx="02" title="칸 구성">
        <div className="mb-3">
          <div className="field-label">
            <span>패널 1칸 기본 폭</span>
            <span className="unit">mm</span>
          </div>
          <div className="seg grid-cols-2">
            <button
              onClick={() => setPanelWidth(800)}
              data-active={spec.panelWidthMm === 800}
            >
              800
            </button>
            <button
              onClick={() => setPanelWidth(1000)}
              data-active={spec.panelWidthMm === 1000}
            >
              1000
            </button>
          </div>
        </div>

        <div className="mb-3">
          <div className="field-label">
            <span>칸 수</span>
            <span className="unit">panels</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="counter">
              <button onClick={() => setPanelCount(spec.panelCount - 1)} aria-label="감소">
                <Minus size={18} />
              </button>
              <span className="value">{spec.panelCount}</span>
              <button onClick={() => setPanelCount(spec.panelCount + 1)} aria-label="증가">
                <Plus size={18} />
              </button>
            </div>
            <div className="text-right">
              <div className="eyebrow mb-0.5">Total</div>
              <div className="numeric text-[22px] font-medium leading-none text-[var(--ink)]">
                {totalW.toLocaleString()}
                <span className="text-[11px] text-[var(--muted)] ml-1">mm</span>
              </div>
            </div>
          </div>
        </div>

        <NumField
          label="칸막이 높이"
          unit="mm · H"
          value={spec.heightMm}
          onChange={(v) => setSpec({ heightMm: v })}
        />
      </Section>

      {/* 03 — Frame color */}
      <Section idx="03" title="프레임 색상">
        <div className="grid grid-cols-3 gap-2">
          {COLOR_OPTIONS.map((c) => {
            const active = spec.frameColor === c.value;
            return (
              <button
                key={c.value}
                onClick={() => setSpec({ frameColor: c.value })}
                className="swatch"
                data-active={active}
              >
                <span className="dot" style={{ background: c.swatch }} />
                <span className="name">{c.label}</span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* 04 — Frame tier */}
      <Section idx="04" title="프레임 단수">
        <div className="seg grid-cols-2">
          {([1, 2] as FrameTier[]).map((t) => (
            <button
              key={t}
              onClick={() => setSpec({ frameTier: t })}
              data-active={spec.frameTier === t}
            >
              {t === 1 ? "1단" : "2단"}
            </button>
          ))}
        </div>
      </Section>

      {/* 05 — Start side */}
      <Section idx="05" title="벽 내 시작 방향">
        <div className="seg grid-cols-3">
          {(["left", "center", "right"] as StartSide[]).map((s) => (
            <button
              key={s}
              onClick={() => setSpec({ startSide: s })}
              data-active={spec.startSide === s}
            >
              {s === "left" ? "왼쪽" : s === "center" ? "중앙" : "오른쪽"}
            </button>
          ))}
        </div>
        {corridorMm > 0 && (
          <div className="mt-3 flex items-center justify-between pl-1">
            <span className="eyebrow">복도 · Corridor</span>
            <span className="numeric text-[13px] text-[var(--ink-3)]">
              {corridorMm.toLocaleString()} mm
            </span>
          </div>
        )}
      </Section>

      {/* 06 — Door position */}
      <Section idx="06" title="도어 위치">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSpec({ doorPanelIndex: 0 })}
            className="pill-num"
            style={{ minWidth: 64, padding: "0 16px" }}
            data-active={spec.doorPanelIndex === 0}
          >
            없음
          </button>
          {Array.from({ length: spec.panelCount }).map((_, i) => {
            const idx = i + 1;
            return (
              <button
                key={idx}
                onClick={() => setSpec({ doorPanelIndex: idx })}
                className="pill-num"
                data-active={spec.doorPanelIndex === idx}
              >
                {idx}
              </button>
            );
          })}
        </div>
      </Section>

      {/* 07 — Placement (moved to bottom) */}
      <Section idx="07" title="설치 위치 지정">
        <PlacementCanvas
          imageUrl={sourceImage}
          placement={placement}
          onChange={setPlacement}
          heightRatio={
            spec.siteHeightMm > 0 ? spec.heightMm / spec.siteHeightMm : 0.85
          }
          panelCount={spec.panelCount}
          doorPanelIndex={spec.doorPanelIndex}
          frameTier={spec.frameTier}
          widthRatio={
            spec.siteWidthMm > 0 ? totalWidthMm(spec) / spec.siteWidthMm : 1
          }
          startSide={spec.startSide}
          frameColor={spec.frameColor}
        />
      </Section>

      {error && (
        <div
          className="mt-5 p-4 rounded-[var(--radius-md)] text-[13px]"
          style={{
            background: "var(--accent-tint)",
            color: "var(--accent)",
          }}
        >
          {error}
        </div>
      )}

      <div className="action-bar">
        <div className="inner">
          <button
            onClick={render}
            disabled={busy}
            className="btn btn-primary w-full"
          >
            {busy ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                렌더링 중 · 30~60초
              </>
            ) : (
              <>
                렌더링 생성
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </main>
  );
}

function Section({
  idx,
  title,
  tag,
  children,
}: {
  idx: string;
  title: string;
  tag?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-4">
      <div className="section-head">
        <span className="idx">{idx}</span>
        <span className="title">{title}</span>
        {tag && <span className="tag">{tag}</span>}
        <span className="rule" />
      </div>
      {children}
    </section>
  );
}

function NumField({
  label,
  unit,
  value,
  onChange,
}: {
  label: string;
  unit?: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="field">
      <span className="field-label">
        <span>{label}</span>
        {unit && <span className="unit">{unit}</span>}
      </span>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="num-input"
      />
    </label>
  );
}
