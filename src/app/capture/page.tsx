"use client";

import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, type SourceKind } from "@/lib/store";
import { resizeImageFile } from "@/lib/image";
import { Camera, ArrowLeft, ArrowRight, RefreshCw, ImageIcon } from "lucide-react";
import Link from "next/link";

function CaptureInner() {
  const router = useRouter();
  const params = useSearchParams();
  const kind = (params.get("kind") as SourceKind) || "photo";
  const setSource = useSession((s) => s.setSource);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const resized = await resizeImageFile(f);
      setPreview(resized.dataUrl);
      setSource(resized.dataUrl, resized.mimeType, kind);
    } catch (err) {
      alert("이미지 처리 실패: " + (err instanceof Error ? err.message : err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="h-[100dvh] max-w-md mx-auto px-6 pt-safe flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between pt-4 pb-3 rise">
        <Link href="/" className="btn-icon" aria-label="뒤로">
          <ArrowLeft size={18} />
        </Link>
        <div className="mono text-[11px] text-[var(--muted)]">01 / 04</div>
        <div className="w-[44px]" />
      </div>

      <header className="mb-4 rise rise-1">
        <div className="eyebrow mb-2">Capture</div>
        <h1 className="display-tight text-[22px] mb-1.5">현장 사진</h1>
        <p className="text-[12px] text-[var(--muted)] leading-[1.5]">
          벽을 정면에서 촬영하세요.
        </p>
      </header>

      <input
        ref={fileRef}
        type="file"
        accept=".png,.jpg,.jpeg,image/png,image/jpeg"
        capture={kind === "photo" ? "environment" : undefined}
        onChange={handleFile}
        className="hidden"
      />

      {!preview ? (
        <div className="flex-1 min-h-0 flex flex-col rise rise-2">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="relative flex-1 min-h-0 rounded-[var(--radius-xl)] bg-[var(--surface)] border border-[var(--line)] overflow-hidden flex flex-col items-center justify-center gap-4 transition-transform active:scale-[0.99]"
            style={{ boxShadow: "var(--shadow-2)" }}
          >
            <div className="w-16 h-16 rounded-full bg-[var(--ink)] text-[var(--surface)] flex items-center justify-center">
              <Camera size={26} strokeWidth={1.6} />
            </div>
            <div className="text-center">
              <div className="display text-[20px] leading-none mb-1.5">
                촬영 또는 선택
              </div>
              <div className="caption">Tap to open camera</div>
            </div>
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <span className="eyebrow">JPEG · PNG</span>
              <ImageIcon size={14} className="text-[var(--muted)]" />
            </div>
          </button>
          <div className="pb-4" />
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col rise">
          <div className="surface-raised overflow-hidden flex-1 min-h-0">
            <img src={preview} alt="" className="w-full h-full object-contain" />
          </div>
          <div className="flex items-center justify-between px-1 pt-2 pb-3">
            <span className="eyebrow">Source Saved</span>
            <span className="mono text-[11px] text-[var(--muted)]">
              ready for spec
            </span>
          </div>
          <div className="flex gap-3 pb-4">
            <button
              onClick={() => {
                setPreview(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="btn btn-secondary flex-1"
            >
              <RefreshCw size={16} />
              다시 선택
            </button>
            <button
              onClick={() => router.push("/spec")}
              className="btn btn-primary flex-[1.4]"
            >
              다음
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default function CapturePage() {
  return (
    <Suspense fallback={<div className="p-6 eyebrow">로딩...</div>}>
      <CaptureInner />
    </Suspense>
  );
}
