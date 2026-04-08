"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/store";
import { useHydrateImages } from "@/lib/use-hydrate-images";
import { authHeaders } from "@/lib/api-client";
import { ArrowRight, ArrowLeft, Loader2, RotateCw, Check } from "lucide-react";

export default function ResultPage() {
  useHydrateImages();
  const router = useRouter();
  const {
    sourceImage,
    spec,
    renderings,
    selectedRendering,
    selectRendering,
    setRenderings,
    dimension,
    currentSegment,
    saveCurrentAsSegment,
    setCurrentSegment,
  } = useSession();
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!renderings.length) {
    return (
      <main className="p-6 max-w-md mx-auto pt-safe">
        <p className="caption">렌더링 결과가 없습니다.</p>
        <button onClick={() => router.push("/")} className="btn btn-primary mt-4">
          홈으로
        </button>
      </main>
    );
  }

  const refine = async () => {
    if (!selectedRendering || !instruction.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const [, b64] = selectedRendering.split(",");
      const res = await fetch("/api/render", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          mode: "C",
          spec: { ...spec, notes: instruction },
          imageBase64: b64,
          imageMimeType: "image/png",
          editInstruction: instruction,
          count: 1,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "재생성 실패");
      setRenderings(json.images);
      setInstruction("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const ctaLabel =
    dimension === 2 && currentSegment === 1
      ? "다음 세그먼트"
      : dimension === 2
        ? "모두 완료"
        : "확정 · 공유";

  const onNext = () => {
    if (dimension === 2 && currentSegment === 1) {
      saveCurrentAsSegment();
      setCurrentSegment(2);
      router.push("/capture?kind=photo");
    } else if (dimension === 2 && currentSegment === 2) {
      saveCurrentAsSegment();
      router.push("/share");
    } else {
      router.push("/share");
    }
  };

  return (
    <main className="min-h-screen max-w-md mx-auto px-6 pt-safe pb-52">
      <div className="flex items-center justify-between pt-5 pb-4">
        <Link href="/spec" className="btn-icon" aria-label="뒤로">
          <ArrowLeft size={18} />
        </Link>
        <div className="mono text-[11px] text-[var(--muted)]">03 / 04</div>
        <div className="w-[44px]" />
      </div>

      <header className="mb-7">
        <div className="eyebrow mb-3">Result</div>
        <h1 className="display-tight text-[22px]">결과 선택</h1>
      </header>

      {sourceImage && (
        <div className="mb-6">
          <div className="field-label">
            <span>시공 전</span>
            <span className="unit">Before</span>
          </div>
          <div className="surface overflow-hidden">
            <img src={sourceImage} alt="" className="w-full max-h-40 object-cover" />
          </div>
        </div>
      )}

      <div className="mb-5">
        <div className="field-label">
          <span>AI 렌더링</span>
          <span className="unit">
            {renderings.length} image{renderings.length > 1 ? "s" : ""}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {renderings.map((src, i) => {
            const isSelected = src === selectedRendering;
            return (
              <button
                key={i}
                onClick={() => selectRendering(src)}
                className="relative rounded-[var(--radius-md)] overflow-hidden border transition-all"
                style={{
                  borderColor: isSelected ? "var(--ink)" : "var(--line)",
                  borderWidth: isSelected ? "2px" : "1px",
                  boxShadow: isSelected ? "var(--shadow-2)" : "var(--shadow-1)",
                }}
              >
                <img src={src} alt={`결과 ${i + 1}`} className="w-full block" />
                {isSelected && (
                  <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[var(--ink)] text-[var(--surface)] flex items-center justify-center">
                    <Check size={16} strokeWidth={2.5} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div
          className="p-4 rounded-[var(--radius-md)] text-[13px]"
          style={{
            background: "var(--accent-tint)",
            color: "var(--accent)",
          }}
        >
          {error}
        </div>
      )}

      <div className="action-bar">
        <div className="inner space-y-2.5">
          <div className="flex gap-2">
            <input
              type="text"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="수정 지시 (예: 프레임 얇게)"
              className="text-input flex-1"
              disabled={busy}
            />
            <button
              onClick={refine}
              disabled={busy || !instruction.trim()}
              className="btn btn-secondary shrink-0 !min-h-[52px] !px-4"
              aria-label="재생성"
            >
              {busy ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <RotateCw size={18} />
              )}
            </button>
          </div>
          <button
            onClick={onNext}
            disabled={!selectedRendering}
            className="btn btn-primary w-full"
          >
            {ctaLabel}
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </main>
  );
}
