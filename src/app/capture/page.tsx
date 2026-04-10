"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/store";
import { resizeImageFile } from "@/lib/image";
import { Camera, ArrowLeft } from "lucide-react";

export default function CapturePage() {
  const router = useRouter();
  const setSource = useSession((s) => s.setSource);
  const dimension = useSession((s) => s.dimension);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

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
    <main className="h-[100dvh] max-w-md mx-auto flex flex-col px-6 pt-safe pb-safe">
      {/* Top bar */}
      <div className="flex items-center justify-between pt-4 pb-2 rise">
        <Link href="/" className="btn-icon" aria-label="뒤로">
          <ArrowLeft size={18} />
        </Link>
        <div className="mono text-[11px] text-[var(--muted)]">01 / 04</div>
        <div className="w-[44px]" />
      </div>

      <section className="pt-6 pb-6 rise rise-1">
        <div className="eyebrow mb-3">Capture</div>
        <h1 className="display-tight text-[22px] mb-2">현장 사진</h1>
        <p className="text-[13px] leading-[1.55] text-[var(--ink-3)]">
          {dimension === 2
            ? "코너를 포함해서 양쪽 벽이 모두 보이게 촬영하세요."
            : "벽을 정면에서 촬영하세요."}
        </p>
      </section>

      <input
        ref={fileRef}
        type="file"
        accept=".png,.jpg,.jpeg,image/png,image/jpeg"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />

      <div className="flex-1 min-h-0 flex items-center justify-center rise rise-2">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="flex flex-col items-center gap-5 active:scale-95 transition disabled:opacity-50"
        >
          <div
            className="w-28 h-28 rounded-full bg-[var(--ink)] text-[var(--bg)] flex items-center justify-center"
            style={{ boxShadow: "var(--shadow-cta)" }}
          >
            <Camera size={44} strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <div className="display text-[20px] leading-none mb-1.5">
              {busy ? "불러오는 중…" : "촬영 또는 선택"}
            </div>
            <div className="eyebrow">Tap to start</div>
          </div>
        </button>
      </div>

      <footer className="pt-4 pb-3 flex items-center justify-between rise rise-3">
        <span className="text-[11px] text-[var(--muted)]">화담 디자인</span>
        <span className="mono text-[11px] text-[var(--muted)]">© 2026</span>
      </footer>
    </main>
  );
}
