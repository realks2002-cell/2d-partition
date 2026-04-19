"use client";

import Link from "next/link";
import { Camera, Ruler, Palette, Sparkles, ArrowRight } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";

const STEPS = [
  {
    idx: "01",
    label: "CAPTURE",
    title: "현장 촬영",
    desc: "시공할 위치의 벽을 정면에서 촬영합니다. ㄴ 형태 코너라면 두 벽을 각각 한 장씩 촬영하세요.",
    icon: Camera,
  },
  {
    idx: "02",
    label: "SPEC",
    title: "치수 · 칸 구성 입력",
    desc: "현장 가로·세로(mm)와 칸 개수, 문 위치를 입력합니다. 도면이 있다면 바로 업로드해도 됩니다.",
    icon: Ruler,
  },
  {
    idx: "03",
    label: "STYLE",
    title: "프레임 색상 선택",
    desc: "블랙 / 화이트 / 다크 그레이 중 프레임 색을 고르고 단수(1단/2단)를 설정합니다.",
    icon: Palette,
  },
  {
    idx: "04",
    label: "RENDER",
    title: "AI 렌더링 · 공유",
    desc: "30~60초 후 시공 후 모습이 완성됩니다. PNG 저장 혹은 카카오톡/메일로 바로 고객에게 전달하세요.",
    icon: Sparkles,
  },
];

export default function HowToPage() {
  return (
    <main className="min-h-[100dvh] bg-neutral-50 text-neutral-900 pb-safe">
      <SiteHeader />

      <div className="mx-auto px-6 py-16" style={{ maxWidth: 920 }}>
        {/* Hero */}
        <div className="max-w-2xl">
          <div className="iso-eyebrow mb-4">HOW IT WORKS · 4 STEPS</div>
          <h1 className="iso-display text-[35px] md:text-[45px] mb-4">
            사진 한 장으로<br />
            시공 후를 보여주세요.
          </h1>
          <p className="text-[15px] text-neutral-600 leading-[1.6]">
            복잡한 3D 소프트웨어 없이, 현장에서 바로 고객에게 완성된 모습을 보여줄 수 있습니다.
          </p>
        </div>

        {/* Steps */}
        <div className="mt-14 border-t border-neutral-900 pt-10">
          <div className="grid md:grid-cols-2 gap-6">
            {STEPS.map((s) => (
              <div
                key={s.idx}
                className="bg-white rounded-2xl border border-neutral-200 p-5 flex flex-col"
              >
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <div className="iso-eyebrow mb-1">{s.label}</div>
                    <div className="text-[10px] font-bold tracking-[0.2em] text-neutral-400">
                      STEP {s.idx}
                    </div>
                  </div>
                  <div className="w-11 h-11 rounded-full bg-neutral-900 text-white flex items-center justify-center">
                    <s.icon size={18} strokeWidth={1.8} />
                  </div>
                </div>
                <h3 className="text-[18px] font-bold tracking-tight mb-2">{s.title}</h3>
                <p className="text-[13px] text-neutral-600 leading-[1.6]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-14 pt-10 border-t border-neutral-900 flex flex-col items-center text-center">
          <div className="iso-eyebrow mb-3">START NOW</div>
          <h2 className="iso-h2 text-[26px] mb-6">
            무료 5회로 지금 시작하세요.
          </h2>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 h-12 px-7 bg-neutral-900 hover:bg-[#d43e76] text-white rounded-lg text-[13px] font-bold uppercase tracking-[0.05em] transition-colors"
          >
            무료로 시작하기 <ArrowRight size={14} />
          </Link>
          <Link
            href="/pricing"
            className="mt-4 text-[12px] font-semibold text-neutral-500 hover:text-[#d43e76]"
          >
            요금제 보기 →
          </Link>
        </div>
      </div>
    </main>
  );
}
