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
    <main className="min-h-screen max-w-md mx-auto px-6 pt-safe pb-40">
      {/* Top bar */}
      <div className="flex items-center justify-between pt-5 pb-4 rise">
        <Link href="/" className="btn-icon" aria-label="뒤로">
          <ArrowLeft size={18} />
        </Link>
        <div className="mono text-[11px] text-[var(--muted)]">01 / 04</div>
        <div className="w-[44px]" />
      </div>

      <header className="mb-8 rise rise-1">
        <div className="eyebrow mb-3">Capture</div>
        <h1 className="display-tight text-[22px] mb-2">
          현장 사진
        </h1>
        <p className="caption max-w-[320px]">
          칸막이가 설치될 벽을 정면에서 촬영하세요. 수평·수직이 맞으면 렌더링 정확도가 높아집니다.
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
        <div className="rise rise-2">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="relative w-full aspect-[4/5] rounded-[var(--radius-xl)] bg-[var(--surface)] border border-[var(--line)] overflow-hidden flex flex-col items-center justify-center gap-6 transition-transform active:scale-[0.99]"
            style={{ boxShadow: "var(--shadow-2)" }}
          >
            <div className="w-20 h-20 rounded-full bg-[var(--ink)] text-[var(--surface)] flex items-center justify-center">
              <Camera size={32} strokeWidth={1.6} />
            </div>
            <div className="text-center">
              <div className="display text-[24px] leading-none mb-2">
                촬영 또는 선택
              </div>
              <div className="caption">Tap to open camera</div>
            </div>
            <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between">
              <span className="eyebrow">Portrait · 4:5</span>
              <ImageIcon size={14} className="text-[var(--muted)]" />
            </div>
          </button>
          <p className="mt-4 caption text-center">
            JPEG · PNG / 최대 20MB · 자동 리사이즈됩니다
          </p>
        </div>
      ) : (
        <div className="space-y-4 rise">
          <div className="surface-raised overflow-hidden">
            <img src={preview} alt="" className="w-full block" />
          </div>
          <div className="flex items-center justify-between px-1">
            <span className="eyebrow">Source Saved</span>
            <span className="mono text-[11px] text-[var(--muted)]">
              ready for spec
            </span>
          </div>
        </div>
      )}

      {preview && (
        <div className="action-bar">
          <div className="inner flex gap-3">
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
              다음 단계
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
