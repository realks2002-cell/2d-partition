"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Copy, Check, ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openPricingInBrowser } from "@/lib/app-bridge";

interface Props {
  eyebrow?: string;
  title?: string;
  description?: string;
  webPath: string;
  allowOpen?: boolean;
}

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "https://xn--h32bo0e8pg.com";

export default function NativeBlocked({
  eyebrow = "WEB ONLY",
  title = "웹에서 이용 가능",
  description = "이 기능은 PC 또는 모바일 웹브라우저에서 로그인 후 이용해주세요.",
  webPath,
  allowOpen = true,
}: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const url = `${WEB_URL}${webPath}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(url)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <main className="min-h-[100dvh] bg-neutral-50 text-neutral-900 pt-safe pb-safe">
      <div className="mx-auto px-6 pt-14 pb-10" style={{ maxWidth: 480 }}>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-neutral-500 hover:text-neutral-900 mb-8"
        >
          <ArrowLeft size={13} /> 뒤로
        </button>

        <div className="iso-eyebrow mb-3">{eyebrow}</div>
        <h1 className="text-[26px] font-bold tracking-tight mb-3">{title}</h1>
        <p className="text-[13px] text-neutral-600 leading-relaxed mb-8">
          {description}
        </p>

        {allowOpen && webPath === "/pricing" && (
          <Button
            onClick={() => openPricingInBrowser().catch(() => {})}
            className="w-full h-11 bg-neutral-900 hover:bg-[#d43e76] text-white text-[12px] font-bold uppercase tracking-[0.05em] rounded-lg mb-3"
          >
            <ExternalLink size={14} className="mr-1.5" />
            웹 브라우저에서 열기 →
          </Button>
        )}

        <div className="flex flex-col items-center bg-white border border-neutral-200 rounded-2xl p-6 mb-4">
          <div className="iso-eyebrow-muted mb-3">
            {allowOpen && webPath === "/pricing" ? "또는 QR 스캔" : "SCAN QR"}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrSrc}
            alt="웹 주소 QR 코드"
            width={160}
            height={160}
            className="rounded-md bg-white ring-1 ring-neutral-200"
          />
          <div className="text-[11px] mono mt-3 text-neutral-500 break-all text-center">
            {url}
          </div>
        </div>

        <Button
          onClick={copy}
          variant="outline"
          className="w-full h-11 text-[12px] font-medium border-neutral-300 hover:border-neutral-900 hover:text-[#d43e76]"
        >
          {copied ? (
            <Check size={14} className="mr-1.5" />
          ) : (
            <Copy size={14} className="mr-1.5" />
          )}
          {copied ? "복사됨" : "주소 복사"}
        </Button>

        <div className="mt-8 flex items-center justify-center gap-1.5 text-[11px] text-neutral-400">
          <Globe size={11} />
          <span>칸막이Go 웹</span>
        </div>
      </div>
    </main>
  );
}
