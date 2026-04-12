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
  wallTotalWidthMm,
  type FrameColor,
  type FrameTier,
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
  Home,
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
    drawingImageB,
    drawingMimeTypeB,
    setDrawing,
    setDrawingB,
    placement,
    setPlacement,
    spec,
    setSpec,
    setWallB,
    setRenderings,
    dimension,
    reset,
  } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const drawingFileRef = useRef<HTMLInputElement>(null);
  const drawingFileRefB = useRef<HTMLInputElement>(null);

  const isCorner = dimension === 2 && !!spec.wallB;
  const hasDrawing = isCorner
    ? !!(drawingImage && drawingImageB)
    : !!drawingImage;
  const hasAnyDrawing = !!(drawingImage || drawingImageB);

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

  const handleDrawingFileB = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const r = await resizeImageFile(f);
      setDrawingB(r.dataUrl, r.mimeType);
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

  // Wall A helpers
  const totalAW = spec.panelCount * spec.panelWidthMm;

  const setPanelCountA = (n: number) => {
    const v = Math.max(1, Math.min(30, n));
    setSpec({
      panelCount: v,
      panelWidthMm: Math.round(spec.siteWidthMm / v),
      doorPanelIndex: Math.min(spec.doorPanelIndex, v),
    });
  };

  const setSiteWidthA = (siteWidthMm: number) => {
    const auto = Math.max(
      1,
      Math.min(30, Math.round(siteWidthMm / spec.panelWidthMm)),
    );
    setSpec({
      siteWidthMm,
      panelCount: auto,
      panelWidthMm: Math.round(siteWidthMm / auto),
      doorPanelIndex: Math.min(spec.doorPanelIndex, auto),
    });
  };

  // Wall B helpers
  const wallB = spec.wallB;

  const setPanelCountB = (n: number) => {
    if (!wallB) return;
    const v = Math.max(1, Math.min(30, n));
    setWallB({
      panelCount: v,
      panelWidthMm: Math.round(wallB.siteWidthMm / v),
      doorPanelIndex: Math.min(wallB.doorPanelIndex, v),
    });
  };

  const setSiteWidthB = (siteWidthMm: number) => {
    if (!wallB) return;
    const auto = Math.max(
      1,
      Math.min(30, Math.round(siteWidthMm / wallB.panelWidthMm)),
    );
    setWallB({
      siteWidthMm,
      panelCount: auto,
      panelWidthMm: Math.round(siteWidthMm / auto),
      doorPanelIndex: Math.min(wallB.doorPanelIndex, auto),
    });
  };

  const render = async () => {
    // Validate drawing requirements before burning
    if (isCorner && hasAnyDrawing && !(drawingImage && drawingImageB)) {
      setError("ㄴ 형태는 벽 A, B 도면을 모두 올려야 합니다");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      let imageBase64: string;
      let imageMimeType: string;
      if (placement) {
        const burned = await burnPlacementOntoImage(sourceImage, spec, placement, {
          drawingMode: hasDrawing,
        });
        imageBase64 = burned.base64;
        imageMimeType = burned.mimeType;
      } else {
        const [, b64] = sourceImage.split(",");
        imageBase64 = b64;
        imageMimeType = sourceMimeType ?? "image/jpeg";
      }
      const drawingB64 = drawingImage?.split(",")[1];
      const drawingB64B = drawingImageB?.split(",")[1];
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
          drawingBase64B: drawingB64B,
          drawingMimeTypeB: drawingB64B ? drawingMimeTypeB : undefined,
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
    <main className="spec-compact min-h-[100dvh] max-w-md mx-auto px-5 pt-safe pb-32">
      {/* Top bar */}
      <div className="flex items-center justify-between pt-3 pb-2">
        <Link href="/capture?kind=photo" className="btn-icon" aria-label="뒤로">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex items-center gap-2">
          <div className="mono text-[11px] text-[var(--muted)]">02 / 04</div>
          {isCorner && <div className="chip-soft">ㄴ 형태</div>}
        </div>
        <button
          onClick={() => {
            if (!confirm("처음부터 다시 시작하시겠습니까? 입력 내용이 모두 초기화됩니다.")) return;
            reset();
            router.push("/");
          }}
          className="btn-icon"
          aria-label="처음부터 다시"
        >
          <Home size={18} />
        </button>
      </div>

      <header className="mb-4">
        <div className="eyebrow mb-1.5">Specification</div>
        <h1 className="display-tight text-[22px]">스펙 설정</h1>
      </header>

      {/* REF — Drawing reference */}
      <Section
        idx="REF"
        title="참고 도면"
        tag={isCorner ? "A·B 필수" : "optional"}
      >
        <input
          ref={drawingFileRef}
          type="file"
          accept=".png,.jpg,.jpeg,image/png,image/jpeg"
          onChange={handleDrawingFile}
          className="hidden"
        />
        <input
          ref={drawingFileRefB}
          type="file"
          accept=".png,.jpg,.jpeg,image/png,image/jpeg"
          onChange={handleDrawingFileB}
          className="hidden"
        />
        {isCorner ? (
          <div className="grid grid-cols-2 gap-2">
            <DrawingSlot
              label="벽 A (왼쪽)"
              image={drawingImage}
              onPick={() => drawingFileRef.current?.click()}
              onClear={() => setDrawing(null, null)}
            />
            <DrawingSlot
              label="벽 B (오른쪽)"
              image={drawingImageB}
              onPick={() => drawingFileRefB.current?.click()}
              onClear={() => setDrawingB(null, null)}
            />
          </div>
        ) : (
          <DrawingSlot
            image={drawingImage}
            onPick={() => drawingFileRef.current?.click()}
            onClear={() => setDrawing(null, null)}
          />
        )}
        {hasDrawing && (
          <p className="text-[10px] text-[var(--muted)] mt-2">
            도면 우선 모드 — 칸 수/도어/프레임 단수 설정은 무시되고 도면이 그대로 반영됩니다.
          </p>
        )}
        {isCorner && hasAnyDrawing && !hasDrawing && (
          <p className="text-[10px] text-[var(--accent)] mt-2">
            ㄴ 형태는 벽 A, B 도면을 모두 올려야 합니다.
          </p>
        )}
      </Section>

      {/* 01 — Site dimensions */}
      {!hasDrawing && (
      <Section idx="01" title="현장 치수">
        {isCorner ? (
          <div className="space-y-3">
            <NumField
              label="현장 높이 (공유)"
              unit="mm · H"
              value={spec.siteHeightMm}
              onChange={(v) => setSpec({ siteHeightMm: v })}
            />
            <div className="grid grid-cols-2 gap-3">
              <NumField
                label="벽 A (왼쪽) 폭"
                unit="mm"
                value={spec.siteWidthMm}
                onChange={setSiteWidthA}
              />
              <NumField
                label="벽 B (오른쪽) 폭"
                unit="mm"
                value={wallB?.siteWidthMm ?? 0}
                onChange={setSiteWidthB}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <NumField
              label="현장 폭"
              unit="mm · W"
              value={spec.siteWidthMm}
              onChange={setSiteWidthA}
            />
            <NumField
              label="현장 높이"
              unit="mm · H"
              value={spec.siteHeightMm}
              onChange={(v) => setSpec({ siteHeightMm: v })}
            />
          </div>
        )}
      </Section>
      )}

      {/* 02 — Panel composition */}
      {!hasDrawing && (
      <Section idx="02" title="칸 구성">
        {isCorner && wallB ? (
          <div className="space-y-4">
            <WallPanelBlock
              label="벽 A (왼쪽)"
              panelCount={spec.panelCount}
              panelWidthMm={spec.panelWidthMm}
              onChange={setPanelCountA}
            />
            <WallPanelBlock
              label="벽 B (오른쪽)"
              panelCount={wallB.panelCount}
              panelWidthMm={wallB.panelWidthMm}
              onChange={setPanelCountB}
            />
            <NumField
              label="칸막이 높이 (공유)"
              unit="mm · H"
              value={spec.heightMm}
              onChange={(v) => setSpec({ heightMm: v })}
            />
          </div>
        ) : (
          <>
            <div className="mb-3">
              <div className="field-label">
                <span>칸 수</span>
                <span className="unit">panels</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="counter">
                  <button onClick={() => setPanelCountA(spec.panelCount - 1)} aria-label="감소">
                    <Minus size={18} />
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={30}
                    value={spec.panelCount}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (!Number.isNaN(n)) setPanelCountA(n);
                    }}
                    className="counter-input"
                  />
                  <button onClick={() => setPanelCountA(spec.panelCount + 1)} aria-label="증가">
                    <Plus size={18} />
                  </button>
                </div>
                <div className="text-right">
                  <div className="eyebrow mb-0.5">패널 폭</div>
                  <div className="numeric text-[22px] font-medium leading-none text-[var(--ink)]">
                    {spec.panelWidthMm.toLocaleString()}
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
          </>
        )}
      </Section>
      )}

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
      {!hasDrawing && (
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
      )}

      {/* 05 — Start side (only shown when corridor may exist — 1D mode) */}
      {!hasDrawing && !isCorner && (
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
        </Section>
      )}

      {/* 06 — Door position */}
      {!hasDrawing && (
      <Section idx="06" title="도어 위치">
        {isCorner && wallB ? (
          <div className="space-y-3">
            <DoorRow
              label="벽 A (왼쪽)"
              panelCount={spec.panelCount}
              doorPanelIndex={spec.doorPanelIndex}
              onSelect={(i) => setSpec({ doorPanelIndex: i })}
            />
            <DoorRow
              label="벽 B (오른쪽)"
              panelCount={wallB.panelCount}
              doorPanelIndex={wallB.doorPanelIndex}
              onSelect={(i) => setWallB({ doorPanelIndex: i })}
            />
          </div>
        ) : (
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
        )}
      </Section>
      )}

      {/* 07 — Placement */}
      <Section idx="07" title="설치 위치 지정">
        <PlacementCanvas
          imageUrl={sourceImage}
          placement={placement}
          onChange={setPlacement}
          heightRatio={
            spec.siteHeightMm > 0 ? spec.heightMm / spec.siteHeightMm : 0.85
          }
          frameTier={spec.frameTier}
          frameColor={spec.frameColor}
          mode={isCorner ? "corner" : "single"}
          wallA={{
            panelCount: spec.panelCount,
            doorPanelIndex: spec.doorPanelIndex,
            widthRatio: isCorner
              ? undefined
              : spec.siteWidthMm > 0
                ? totalAW / spec.siteWidthMm
                : 1,
            startSide: spec.startSide,
          }}
          wallB={
            isCorner && wallB
              ? {
                  panelCount: wallB.panelCount,
                  doorPanelIndex: wallB.doorPanelIndex,
                  widthRatio:
                    wallB.siteWidthMm > 0
                      ? wallTotalWidthMm(wallB) / wallB.siteWidthMm
                      : 1,
                  startSide: wallB.startSide,
                }
              : undefined
          }
          drawingMode={hasDrawing}
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

function DrawingSlot({
  label,
  image,
  onPick,
  onClear,
}: {
  label?: string;
  image: string | null;
  onPick: () => void;
  onClear: () => void;
}) {
  if (image) {
    return (
      <div className="relative surface overflow-hidden">
        {label && (
          <div className="absolute top-1 left-2 text-[9px] font-medium text-[var(--ink)] bg-[var(--surface)]/80 px-1 rounded">
            {label}
          </div>
        )}
        <img
          src={image}
          alt=""
          className="w-full max-h-14 object-contain bg-[var(--surface-2)]"
        />
        <button
          onClick={onClear}
          className="absolute top-1 right-1 btn-icon"
          style={{ width: 24, height: 24 }}
          aria-label="도면 제거"
        >
          <X size={11} />
        </button>
      </div>
    );
  }
  return (
    <button
      onClick={onPick}
      className="w-full py-2.5 rounded-[var(--radius-md)] border border-dashed border-[var(--line-2)] flex flex-col items-center gap-0.5 bg-[var(--surface)] transition-colors active:bg-[var(--surface-2)]"
    >
      <Upload size={14} className="text-[var(--ink-3)]" />
      <span className="text-[11px] font-medium text-[var(--ink)]">
        {label ?? "도면 이미지 첨부"}
      </span>
      <span className="text-[9px] text-[var(--muted)]">치수/주석 무시</span>
    </button>
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

function WallPanelBlock({
  label,
  panelCount,
  panelWidthMm,
  onChange,
}: {
  label: string;
  panelCount: number;
  panelWidthMm: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="field-label">
        <span>{label} · 칸 수</span>
        <span className="unit">panels</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="counter">
          <button onClick={() => onChange(panelCount - 1)} aria-label="감소">
            <Minus size={18} />
          </button>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={30}
            value={panelCount}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (!Number.isNaN(n)) onChange(n);
            }}
            className="counter-input"
          />
          <button onClick={() => onChange(panelCount + 1)} aria-label="증가">
            <Plus size={18} />
          </button>
        </div>
        <div className="text-right">
          <div className="eyebrow mb-0.5">패널 폭</div>
          <div className="numeric text-[22px] font-medium leading-none text-[var(--ink)]">
            {panelWidthMm.toLocaleString()}
            <span className="text-[11px] text-[var(--muted)] ml-1">mm</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DoorRow({
  label,
  panelCount,
  doorPanelIndex,
  onSelect,
}: {
  label: string;
  panelCount: number;
  doorPanelIndex: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div>
      <div className="field-label">
        <span>{label}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onSelect(0)}
          className="pill-num"
          style={{ minWidth: 56, padding: "0 12px" }}
          data-active={doorPanelIndex === 0}
        >
          없음
        </button>
        {Array.from({ length: panelCount }).map((_, i) => {
          const idx = i + 1;
          return (
            <button
              key={idx}
              onClick={() => onSelect(idx)}
              className="pill-num"
              data-active={doorPanelIndex === idx}
            >
              {idx}
            </button>
          );
        })}
      </div>
    </div>
  );
}
