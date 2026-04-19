"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { useSession } from "@/lib/store";
import { resizeImageFile } from "@/lib/image";
import SiteHeader from "@/components/SiteHeader";
import { useCameraGate } from "@/lib/use-camera-gate";
import PermissionIntroModal from "@/components/PermissionIntroModal";

export default function HomePage() {
  const router = useRouter();
  const dimension = useSession((s) => s.dimension);
  const setDimension = useSession((s) => s.setDimension);
  const setSource = useSession((s) => s.setSource);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const gate = useCameraGate();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const resized = await resizeImageFile(f);
      setSource(resized.dataUrl, resized.mimeType, "photo");
      router.push("/spec");
    } catch (err) {
      alert("이미지 처리 실패: " + (err instanceof Error ? err.message : err));
      setBusy(false);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-neutral-50 text-neutral-900 flex flex-col pb-safe">
      <SiteHeader />

      <div className="flex-1 flex flex-col w-full mx-auto px-6" style={{ maxWidth: 920 }}>
        {/* Hero */}
        <section className="pt-12 md:pt-20 pb-10">
          <div className="iso-eyebrow mb-5">PARTITION VISUALIZER · AI</div>
          <h1 className="iso-display text-[34px] md:text-[58px] leading-[1.02] mb-5 max-w-3xl">
            Everything Starts<br />
            with a Single Photo.
          </h1>
          <p className="text-[14px] md:text-[16px] text-neutral-600 leading-[1.65] max-w-2xl">
            현장 사진 한 장이면 충분합니다. 자체 AI 렌더링 엔진이
            칸막이 시공 후 모습을 <span className="text-neutral-900 font-semibold">30~60초 안에</span> 시뮬레이션해드립니다.
          </p>
        </section>

        {/* ===== SECTION · STEP 01 · 형태 선택 ===== */}
        <section className="border-t border-neutral-900 pt-6 pb-14">
          <div className="flex items-end justify-between mb-6">
            <div>
              <div className="iso-eyebrow mb-2">STEP 01 · 형태 선택</div>
              <h2 className="text-[21px] md:text-[26px] font-bold tracking-tight leading-[1.15]">
                어떤 형태의 칸막이인가요?
              </h2>
              <p className="text-[13px] text-neutral-600 mt-2 max-w-lg">
                단일 벽인지, 두 면이 만나는 ㄴ 코너인지 먼저 선택해주세요.
              </p>
            </div>
            <span className="text-[10px] text-neutral-400 mono hidden md:inline">DIMENSION</span>
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-5 max-w-2xl mx-auto">
            <DimensionCard
              selected={dimension === 1}
              onClick={() => setDimension(1)}
              index="01"
              label="STRAIGHT"
              title="직선"
              subtitle="단일 벽"
              desc="벽 하나만 렌더링"
              diagram="1d"
            />
            <DimensionCard
              selected={dimension === 2}
              onClick={() => setDimension(2)}
              index="02"
              label="CORNER"
              title="ㄴ 형태"
              subtitle="2면 코너"
              desc="두 벽이 만나는 모서리"
              diagram="2d"
            />
          </div>

          {dimension === 2 && (
            <div className="mt-4 px-4 py-3 bg-neutral-900 text-white text-[12px] leading-[1.5] rounded-lg flex items-start gap-2.5 max-w-2xl mx-auto">
              <span className="iso-eyebrow mt-[2px]" style={{ color: "#d43e76" }}>!</span>
              <span>벽 <span className="font-bold">A, B 사진 2장</span>을 순차로 촬영합니다.</span>
            </div>
          )}
        </section>

        {/* ===== SECTION · STEP 02 · 현장 촬영 ===== */}
        <section className="border-t border-neutral-900 pt-6 pb-16">
          <div className="flex items-end justify-between mb-6">
            <div>
              <div className="iso-eyebrow mb-2">STEP 02 · 현장 촬영</div>
              <h2 className="text-[21px] md:text-[26px] font-bold tracking-tight leading-[1.15]">
                사진을 촬영하거나 선택해주세요.
              </h2>
              <p className="text-[13px] text-neutral-600 mt-2 max-w-lg">
                정면에서 시공 위치 전체가 보이도록 찍으세요. JPG · PNG · 자동 리사이즈됩니다.
              </p>
            </div>
            <span className="text-[10px] text-neutral-400 mono hidden md:inline">CAPTURE</span>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".png,.jpg,.jpeg,image/png,image/jpeg"
            capture="environment"
            onChange={handleFile}
            className="hidden"
          />
          <button
            onClick={() => gate.triggerCamera(() => fileRef.current?.click())}
            disabled={busy}
            className="group mx-auto w-full max-w-md bg-neutral-900 hover:bg-[#d43e76] text-white rounded-xl p-5 md:p-7 flex flex-col items-center gap-3 disabled:opacity-50 transition-colors text-center"
          >
            <div className="w-10 h-10 rounded-full bg-white/10 ring-1 ring-white/20 flex items-center justify-center">
              <Camera size={16} strokeWidth={1.8} />
            </div>
            <div>
              <div className="iso-display text-[12px] md:text-[15px] leading-none mb-1">
                {busy ? "불러오는 중…" : "촬영 또는 선택"}
              </div>
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/60 group-hover:text-white/90">
                TAP TO START →
              </div>
            </div>
            <div className="text-[9px] text-white/50 pt-2 mt-1 border-t border-white/10 w-full">
              PNG · JPG · 자동 리사이즈
            </div>
          </button>
        </section>

        <footer className="pt-6 pb-4 flex items-center justify-between border-t border-neutral-200">
          <span className="text-[11px] text-neutral-500">
            Built in Seoul · Powered by in-house rendering
          </span>
          <span className="mono text-[11px] text-neutral-400">© 2026</span>
        </footer>
      </div>

      <PermissionIntroModal
        open={gate.open}
        onAllow={gate.allow}
        onCancel={gate.cancel}
      />
    </main>
  );
}

interface DimensionCardProps {
  selected: boolean;
  onClick: () => void;
  index: string;
  label: string;
  title: string;
  subtitle: string;
  desc: string;
  diagram: "1d" | "2d";
}

function DimensionCard({
  selected,
  onClick,
  index,
  label,
  title,
  subtitle,
  desc,
  diagram,
}: DimensionCardProps) {
  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border transition-all text-left p-4 h-[134px] flex flex-col ${
        selected
          ? "bg-neutral-900 text-white border-neutral-900 shadow-xl"
          : "bg-white text-neutral-900 border-neutral-200 hover:border-neutral-900 hover:-translate-y-[1px] hover:shadow-md"
      }`}
    >
      {/* Magenta corner dot when selected */}
      {selected && (
        <div className="absolute top-3 right-3 flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#d43e76] animate-pulse" />
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#d43e76]">
            Active
          </span>
        </div>
      )}

      {/* Top: index + label */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <div
            className={`text-[9px] font-bold tracking-[0.2em] ${
              selected ? "text-[#d43e76]" : "text-neutral-400"
            }`}
          >
            {index}
          </div>
          <div
            className={`text-[9px] font-bold uppercase tracking-[0.15em] mt-0.5 ${
              selected ? "text-neutral-400" : "text-neutral-400"
            }`}
          >
            {label}
          </div>
        </div>
      </div>

      {/* Diagram */}
      <div className="flex items-center justify-center flex-1 py-1">
        {diagram === "1d" ? (
          <svg width="64" height="28" viewBox="0 0 64 28" fill="none">
            <line
              x1="4"
              y1="14"
              x2="60"
              y2="14"
              stroke={selected ? "#ffffff" : "#171717"}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="4" cy="14" r="2.5" fill={selected ? "#d43e76" : "#171717"} />
            <circle cx="60" cy="14" r="2.5" fill={selected ? "#d43e76" : "#171717"} />
          </svg>
        ) : (
          <svg width="64" height="44" viewBox="0 0 64 44" fill="none">
            <path
              d="M 8 6 L 8 38 L 56 38"
              stroke={selected ? "#ffffff" : "#171717"}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <circle cx="8" cy="6" r="2.5" fill={selected ? "#d43e76" : "#171717"} />
            <circle cx="8" cy="38" r="2.5" fill={selected ? "#d43e76" : "#171717"} />
            <circle cx="56" cy="38" r="2.5" fill={selected ? "#d43e76" : "#171717"} />
          </svg>
        )}
      </div>

      {/* Title + subtitle */}
      <div>
        <div className="flex items-baseline gap-1.5">
          <span
            className={`text-[18px] font-bold tracking-tight leading-none ${
              selected ? "text-white" : "text-neutral-900"
            }`}
          >
            {title}
          </span>
          <span
            className={`text-[10px] font-bold ${
              selected ? "text-neutral-400" : "text-neutral-400"
            }`}
          >
            {subtitle}
          </span>
        </div>
        <div
          className={`text-[10px] mt-1 ${
            selected ? "text-neutral-400" : "text-neutral-500"
          }`}
        >
          {desc}
        </div>
      </div>
    </button>
  );
}
