"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, type CompletedSegment } from "@/lib/store";
import { useHydrateImages } from "@/lib/use-hydrate-images";
import { totalWidthMm } from "@/lib/prompt-builder";
import { ElevationSvg } from "@/components/elevation-svg";
import { saveImage, shareImage } from "@/lib/native-io";
import { Download, Share2, Home, ArrowLeft } from "lucide-react";

export default function SharePage() {
  useHydrateImages();
  const router = useRouter();
  const {
    sourceImage,
    selectedRendering,
    spec,
    reset,
    dimension,
    completedSegments,
  } = useSession();

  const isTwoDim = dimension === 2 && completedSegments.length === 2;

  if (!isTwoDim && !selectedRendering) {
    return (
      <main className="p-6 max-w-md mx-auto pt-safe">
        <p className="caption">선택된 결과가 없습니다.</p>
      </main>
    );
  }

  const downloadBlob = async (url: string, name: string) => {
    try {
      await saveImage(url, name);
    } catch (e) {
      alert("저장 실패: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  const shareSingle = async (url: string, label: string) => {
    try {
      await shareImage(url, `${label}.png`, "칸막이 시뮬레이션");
    } catch (e) {
      console.error(e);
      alert("공유 실패: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  const reload = () => {
    reset();
    router.push("/");
  };

  // 2차원 모드
  if (isTwoDim) {
    return (
      <main className="min-h-screen max-w-md mx-auto px-6 pt-safe pb-32">
        <div className="flex items-center justify-between pt-5 pb-4">
          <Link href="/result" className="btn-icon" aria-label="뒤로">
            <ArrowLeft size={18} />
          </Link>
          <div className="mono text-[11px] text-[var(--muted)]">04 / 04</div>
          <div className="w-[44px]" />
        </div>

        <header className="mb-6">
          <div className="eyebrow mb-3">Deliverable · 2D</div>
          <h1 className="display-tight text-[22px]">ㄴ 형태 결과</h1>
        </header>

        {completedSegments.map((seg, i) => (
          <SegmentCard
            key={i}
            index={i + 1}
            segment={seg}
            onShare={() =>
              shareSingle(
                seg.selectedRendering ?? seg.sourceImage,
                `partition-seg${i + 1}`,
              )
            }
            onDownload={() =>
              downloadBlob(
                seg.selectedRendering ?? seg.sourceImage,
                `partition-seg${i + 1}-${Date.now()}.png`,
              )
            }
          />
        ))}

        <div className="action-bar">
          <div className="inner">
            <button onClick={reload} className="btn btn-primary w-full">
              <Home size={18} />
              새 작업 시작
            </button>
          </div>
        </div>
      </main>
    );
  }

  // 1차원 모드
  return (
    <main className="min-h-screen max-w-md mx-auto px-6 pt-safe pb-40">
      <div className="flex items-center justify-between pt-5 pb-4">
        <Link href="/result" className="btn-icon" aria-label="뒤로">
          <ArrowLeft size={18} />
        </Link>
        <div className="mono text-[11px] text-[var(--muted)]">04 / 04</div>
        <div className="w-[44px]" />
      </div>

      <header className="mb-7">
        <div className="eyebrow mb-3">Deliverable</div>
        <h1 className="display-tight text-[22px]">시공 결과</h1>
      </header>

      {sourceImage && (
        <div className="mb-6">
          <div className="field-label">
            <span>시공 전</span>
            <span className="unit">Before</span>
          </div>
          <div className="surface overflow-hidden">
            <img src={sourceImage} alt="" className="w-full block" />
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="field-label">
          <span>AI 렌더링</span>
          <span className="unit">After</span>
        </div>
        <div className="surface-raised overflow-hidden">
          <img src={selectedRendering!} alt="" className="w-full block" />
        </div>
      </div>

      <div className="mb-6">
        <div className="field-label">
          <span>입면도</span>
          <span className="unit">Elevation</span>
        </div>
        <div className="surface p-4 bg-[var(--surface)]">
          <ElevationSvg spec={spec} />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="eyebrow">Specification</span>
          <span className="numeric text-[13px] text-[var(--ink-3)]">
            {totalWidthMm(spec).toLocaleString()} × {spec.heightMm.toLocaleString()} mm · {spec.panelCount}칸
          </span>
        </div>
      </div>

      <div className="action-bar">
        <div className="inner grid grid-cols-3 gap-2">
          <button
            onClick={() =>
              shareSingle(
                selectedRendering!,
                `${totalWidthMm(spec)}x${spec.heightMm}mm-칸막이`,
              )
            }
            className="btn btn-primary flex-col !gap-1 !px-0 !min-h-[64px]"
          >
            <Share2 size={18} />
            <span className="text-[11px] font-medium">공유</span>
          </button>
          <button
            onClick={() =>
              downloadBlob(selectedRendering!, `partition-${Date.now()}.png`)
            }
            className="btn btn-secondary flex-col !gap-1 !px-0 !min-h-[64px]"
          >
            <Download size={18} />
            <span className="text-[11px] font-medium">저장</span>
          </button>
          <button
            onClick={reload}
            className="btn btn-secondary flex-col !gap-1 !px-0 !min-h-[64px]"
          >
            <Home size={18} />
            <span className="text-[11px] font-medium">새작업</span>
          </button>
        </div>
      </div>
    </main>
  );
}

function SegmentCard({
  index,
  segment,
  onShare,
  onDownload,
}: {
  index: number;
  segment: CompletedSegment;
  onShare: () => void;
  onDownload: () => void;
}) {
  return (
    <section className="mb-5 surface p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="chip">세그먼트 {index}</div>
        <div className="flex gap-2">
          <button
            onClick={onShare}
            className="btn btn-primary !min-h-[36px] !px-3 text-[12px]"
          >
            <Share2 size={13} />
            공유
          </button>
          <button
            onClick={onDownload}
            className="btn btn-secondary !min-h-[36px] !px-3 text-[12px]"
          >
            <Download size={13} />
            저장
          </button>
        </div>
      </div>
      <div className="mb-3">
        <div className="eyebrow mb-1.5">Before</div>
        <img
          src={segment.sourceImage}
          alt=""
          className="w-full rounded-[var(--radius-sm)] border border-[var(--line)] max-h-36 object-cover"
        />
      </div>
      {segment.selectedRendering && (
        <div className="mb-3">
          <div className="eyebrow mb-1.5">After</div>
          <img
            src={segment.selectedRendering}
            alt=""
            className="w-full rounded-[var(--radius-sm)] border border-[var(--line)]"
          />
        </div>
      )}
      <div>
        <div className="eyebrow mb-1.5">Elevation</div>
        <div className="rounded-[var(--radius-sm)] border border-[var(--line)] p-2 bg-[var(--surface)]">
          <ElevationSvg spec={segment.spec} />
        </div>
      </div>
    </section>
  );
}
