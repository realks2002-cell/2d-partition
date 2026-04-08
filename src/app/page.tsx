"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useSession } from "@/lib/store";

export default function Home() {
  const dimension = useSession((s) => s.dimension);
  const setDimension = useSession((s) => s.setDimension);

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col px-6 pt-safe">
      {/* Top brand bar */}
      <header className="flex items-center justify-between pt-6 pb-2 rise">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[var(--ink)] flex items-center justify-center">
            <span className="serif text-[var(--surface)] text-[13px] font-semibold tracking-tight">
              H
            </span>
          </div>
          <span className="wordmark">Hwadam</span>
        </div>
        <div className="chip-soft">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] dot-pulse" />
          Ready
        </div>
      </header>

      {/* Hero */}
      <section className="pt-16 pb-14 rise rise-1">
        <div className="eyebrow mb-5">Partition Visualizer</div>
        <h1 className="display-tight text-[22px] mb-3">
          칸막이 시뮬레이터
        </h1>
        <p className="text-[15px] leading-[1.65] text-[var(--ink-3)] max-w-[300px]">
          현장 사진 한 장으로 시공 완료 모습을
          <br />
          즉시 렌더링합니다.
        </p>
      </section>

      {/* Dimension selector */}
      <section className="mb-8 rise rise-2">
        <div className="field-label mb-2.5">
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
          <p className="mt-3 caption">
            벽마다 다른 사진 2장을 순차로 촬영해 세그먼트 1 → 2 순으로 진행합니다.
          </p>
        )}
      </section>

      {/* Primary CTA */}
      <Link
        href="/capture?kind=photo"
        className="block rise rise-3 group"
      >
        <div className="surface-raised p-7 transition-all group-active:translate-y-[1px]">
          <div className="flex items-start justify-between mb-10">
            <div>
              <div className="eyebrow mb-2">Start</div>
              <div className="display text-[18px] leading-[1]">
                현장 사진 업로드
              </div>
            </div>
            <div className="btn-icon shrink-0 mt-1">
              <ArrowUpRight size={18} strokeWidth={2} />
            </div>
          </div>
          <div className="flex items-center justify-between pt-5 border-t border-[var(--line)]">
            <span className="caption">카메라 · 갤러리에서 불러오기</span>
            <span className="mono text-[11px] text-[var(--muted)]">01 / 04</span>
          </div>
        </div>
      </Link>

      {/* Footer */}
      <footer className="mt-auto py-8 flex items-center justify-between rise rise-4">
        <span className="text-[12px] text-[var(--muted)]">화담 디자인</span>
        <span className="mono text-[11px] text-[var(--muted)]">
          © 2026
        </span>
      </footer>
    </main>
  );
}
