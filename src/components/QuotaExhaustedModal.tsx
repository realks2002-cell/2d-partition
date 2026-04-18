"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Zap, ExternalLink, Copy, Check, X } from "lucide-react";
import { isNative } from "@/lib/native-io";

interface Props {
  open: boolean;
  onClose: () => void;
  remaining?: number;
  required?: number;
}

const WEB_URL =
  process.env.NEXT_PUBLIC_WEB_URL ?? "https://xn--h32bo0e8pg.com";

export default function QuotaExhaustedModal({ open, onClose, remaining, required }: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const native = isNative();
  const pricingUrl = `${WEB_URL}/pricing`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(pricingUrl)}`;

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  if (!open) return null;

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(pricingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-[var(--surface)] rounded-xl max-w-sm w-full p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--accent-tint)] flex items-center justify-center">
              <Zap size={15} className="text-[var(--accent)]" />
            </div>
            <div>
              <div className="text-[13px] font-semibold">렌더링 횟수 부족</div>
              <div className="text-[10px] text-[var(--muted)]">
                남은 {remaining ?? 0}회 / 필요 {required ?? 1}회
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--surface-2)]">
            <X size={14} />
          </button>
        </div>

        {native ? (
          <>
            <p className="text-[11px] text-[var(--ink-3)] leading-relaxed mb-3">
              추가 충전은{" "}
              <span className="font-medium text-[var(--ink)]">PC 또는 모바일 웹브라우저</span>에서
              로그인 후 이용해주세요.
            </p>

            <div className="flex flex-col items-center bg-[var(--surface-2)] border border-[var(--line)] rounded-lg p-3 mb-2">
              <div className="text-[9px] text-[var(--muted)] mb-2">QR로 바로 접속</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrSrc} alt="pricing QR" width={160} height={160} className="rounded bg-white" />
              <div className="text-[10px] mono mt-2 text-[var(--ink-3)]">{WEB_URL}/pricing</div>
            </div>

            <button
              onClick={copyUrl}
              className="w-full inline-flex items-center justify-center gap-1.5 h-[30px] rounded-md border border-[var(--line-2)] text-[10px] font-medium hover:bg-[var(--surface-2)]"
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
              {copied ? "복사됨" : "주소 복사"}
            </button>
          </>
        ) : (
          <>
            <p className="text-[11px] text-[var(--ink-3)] leading-relaxed mb-4">
              계속 사용하시려면 렌더링 횟수를 충전해주세요.
            </p>
            <button
              onClick={() => { onClose(); router.push("/pricing"); }}
              className="w-full inline-flex items-center justify-center gap-1.5 h-[36px] bg-[var(--ink)] text-[var(--surface)] rounded-lg text-[12px] font-medium"
            >
              <ExternalLink size={13} />
              충전하기
            </button>
          </>
        )}

        <button
          onClick={onClose}
          className="w-full h-[30px] mt-2 text-[10px] text-[var(--muted)] hover:text-[var(--ink)]"
        >
          나중에
        </button>
      </div>
    </div>
  );
}
