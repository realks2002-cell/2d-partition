"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Zap, Copy, Check, X, ExternalLink } from "lucide-react";
import { isNative } from "@/lib/native-io";
import { openPricingInBrowser } from "@/lib/app-bridge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(pricingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md bg-white rounded-2xl p-0 gap-0 [&>button]:hidden">
        <div className="p-6">
          <DialogHeader className="mb-1 text-left">
            <div className="flex items-center justify-between mb-2">
              <div className="iso-eyebrow">⚠ QUOTA EXHAUSTED</div>
              <button
                onClick={onClose}
                className="text-neutral-400 hover:text-neutral-900 transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <DialogTitle className="text-[22px] font-bold tracking-tight">
              렌더링 횟수 부족
            </DialogTitle>
            <DialogDescription className="text-[12px] text-neutral-500 mt-1">
              남은 <span className="font-bold text-neutral-900">{remaining ?? 0}회</span>
              <span className="mx-1">·</span>
              필요 <span className="font-bold text-neutral-900">{required ?? 1}회</span>
            </DialogDescription>
          </DialogHeader>

          {native ? (
            <>
              <p className="text-[13px] text-neutral-600 leading-relaxed mt-4 mb-4">
                추가 충전은{" "}
                <span className="font-bold text-neutral-900">웹 브라우저</span>에서 로그인 후
                이용해주세요.
              </p>

              <Button
                onClick={() => { onClose(); openPricingInBrowser().catch(() => {}); }}
                className="w-full h-11 bg-neutral-900 hover:bg-[#d43e76] text-white text-[12px] font-bold uppercase tracking-[0.05em] rounded-lg mb-3"
              >
                <ExternalLink size={14} className="mr-1.5" />
                웹 브라우저에서 열기 →
              </Button>

              <div className="flex flex-col items-center bg-neutral-50 border border-neutral-200 rounded-xl p-4 mb-3">
                <div className="iso-eyebrow-muted mb-3">또는 QR 스캔</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrSrc} alt="웹 주소 QR 코드" width={120} height={120} className="rounded-md bg-white ring-1 ring-neutral-200" />
                <div className="text-[10px] mono mt-2 text-neutral-500">{WEB_URL}/pricing</div>
              </div>

              <Button
                onClick={copyUrl}
                variant="outline"
                className="w-full h-9 text-[11px] font-medium border-neutral-300 hover:border-neutral-900 hover:text-[#d43e76]"
              >
                {copied ? <Check size={12} className="mr-1" /> : <Copy size={12} className="mr-1" />}
                {copied ? "복사됨" : "주소 복사"}
              </Button>
            </>
          ) : (
            <>
              <p className="text-[13px] text-neutral-600 leading-relaxed mt-4 mb-5">
                계속 사용하시려면 렌더링 횟수를 충전해주세요.
                만료 없이 소진할 때까지 사용할 수 있습니다.
              </p>
              <Button
                onClick={() => { onClose(); router.push("/pricing"); }}
                className="w-full h-11 bg-neutral-900 hover:bg-[#d43e76] text-white text-[12px] font-bold uppercase tracking-[0.05em] rounded-lg"
              >
                <Zap size={14} className="mr-1" />
                충전하기 →
              </Button>
            </>
          )}

          <button
            onClick={onClose}
            className="w-full h-9 mt-2 text-[12px] text-neutral-400 hover:text-neutral-900 transition-colors"
          >
            나중에
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
