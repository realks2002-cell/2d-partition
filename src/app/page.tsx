"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useSession } from "@/lib/store";

export default function Home() {
  const dimension = useSession((s) => s.dimension);
  const setDimension = useSession((s) => s.setDimension);

  return (
    <main className="h-[100dvh] max-w-md mx-auto flex flex-col px-6 pt-safe pb-safe">
      {/* Hero */}
      <section className="pt-10 pb-6 rise rise-1">
        <div className="eyebrow mb-3">Partition Visualizer</div>
        <h1 className="display-tight text-[22px] mb-2">칸막이 시뮬레이터</h1>
        <p className="text-[13px] leading-[1.55] text-[var(--ink-3)]">
          현장 사진 한 장으로 시공 후 모습을 즉시 렌더링합니다.
        </p>
      </section>

      {/* Dimension selector */}
      <section className="mb-5 rise rise-2">
        <div className="field-label mb-2">
          <span>형태 선택</span>
          <span className="unit">Dimension</span>
        </div>
        <div className="seg grid-cols-2">
          <button
            onClick={() => setDimension(1)}
            data-active={dimension === 1}
          >
            1차원 · 직선
          </button>
          <button
            onClick={() => setDimension(2)}
            data-active={dimension === 2}
          >
            2차원 · ㄴ 형태
          </button>
        </div>
        {dimension === 2 && (
          <p className="mt-2 text-[11.5px] leading-[1.5] text-[var(--muted)]">
            벽마다 다른 사진 2장을 순차로 촬영합니다.
          </p>
        )}
      </section>

      {/* Primary CTA — fills remaining space */}
      <Link
        href="/capture?kind=photo"
        className="flex-1 min-h-0 flex rise rise-3 group"
      >
        <div className="surface-raised p-6 w-full flex flex-col justify-between transition-all group-active:translate-y-[1px]">
          <div className="flex items-start justify-between">
            <div>
              <div className="eyebrow mb-2">Start</div>
              <div className="display text-[18px] leading-[1.15]">
                현장 사진 업로드
              </div>
            </div>
            <div className="btn-icon shrink-0">
              <ArrowUpRight size={18} strokeWidth={2} />
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-[var(--line)]">
            <span className="caption">카메라 · 갤러리</span>
            <span className="mono text-[11px] text-[var(--muted)]">01 / 04</span>
          </div>
        </div>
      </Link>

      {/* Footer */}
      <footer className="pt-4 pb-3 flex items-center justify-between rise rise-4">
        <span className="text-[11px] text-[var(--muted)]">화담 디자인</span>
        <span className="mono text-[11px] text-[var(--muted)]">© 2026</span>
      </footer>
    </main>
  );
}
