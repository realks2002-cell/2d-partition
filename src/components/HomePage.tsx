"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, LogOut, Shield } from "lucide-react";
import { useSession } from "@/lib/store";
import { resizeImageFile } from "@/lib/image";
import { getUser, getToken, clearToken } from "@/lib/api-client";

export default function HomePage() {
  const router = useRouter();
  const dimension = useSession((s) => s.dimension);
  const setDimension = useSession((s) => s.setDimension);
  const setSource = useSession((s) => s.setSource);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const user = getUser();
  const isLoggedIn = !!getToken();

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
      {/* 상단 로그인 상태 */}
      <div className="flex items-center justify-end gap-2 pt-3" style={{ minHeight: 28 }}>
        {isLoggedIn && user ? (
          <>
            <span className="text-[11px] text-[var(--ink-3)]">{user.name}</span>
            {user.role === "admin" && (
              <button
                onClick={() => router.push("/admin")}
                className="btn-icon"
                style={{ width: 28, height: 28 }}
                title="관리자"
              >
                <Shield size={13} />
              </button>
            )}
            <button
              onClick={() => { clearToken(); router.push("/login"); }}
              className="btn-icon"
              style={{ width: 28, height: 28 }}
              title="로그아웃"
            >
              <LogOut size={13} />
            </button>
          </>
        ) : (
          <button
            onClick={() => router.push("/login")}
            className="text-[11px] text-[var(--accent)] font-medium underline underline-offset-2"
          >
            로그인
          </button>
        )}
      </div>

      <section className="pt-4 pb-6">
        <div className="eyebrow mb-3">Partition Visualizer</div>
        <h1 className="display-tight text-[22px] mb-2">칸막이 시뮬레이터</h1>
        <p className="text-[13px] leading-[1.55] text-[var(--ink-3)]">
          현장 사진 한 장으로 시공 후 모습을 즉시 렌더링합니다.
        </p>
      </section>

      <section className="mb-5">
        <div className="field-label mb-2">
          <span>형태 선택</span>
          <span className="unit">Dimension</span>
        </div>
        <div className="seg grid-cols-2">
          <button onClick={() => setDimension(1)} data-active={dimension === 1}>
            1차원 · 직선
          </button>
          <button onClick={() => setDimension(2)} data-active={dimension === 2}>
            2차원 · ㄴ 형태
          </button>
        </div>
        {dimension === 2 && (
          <p className="mt-2 text-[11.5px] leading-[1.5] text-[var(--muted)]">
            벽마다 다른 사진 2장을 순차로 촬영합니다.
          </p>
        )}
      </section>

      <input
        ref={fileRef}
        type="file"
        accept=".png,.jpg,.jpeg,image/png,image/jpeg"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />

      <div className="flex-1 min-h-0 flex items-center justify-center" style={{ pointerEvents: "none" }}>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="flex flex-col items-center gap-5 active:scale-95 transition disabled:opacity-50"
          style={{ pointerEvents: "auto" }}
        >
          <div
            className="w-14 h-14 rounded-full bg-[var(--ink)] text-[var(--bg)] flex items-center justify-center"
            style={{ boxShadow: "var(--shadow-cta)" }}
          >
            <Camera size={22} strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <div className="display text-[20px] leading-none mb-1.5">
              {busy ? "불러오는 중…" : "촬영 또는 선택"}
            </div>
            <div className="eyebrow">Tap to start</div>
          </div>
        </button>
      </div>

      <footer className="pt-4 pb-3 flex items-center justify-between">
        <span className="text-[11px] text-[var(--muted)]">비즈스타트</span>
        <span className="mono text-[11px] text-[var(--muted)]">© 2026</span>
      </footer>
    </main>
  );
}
