"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";

interface Section {
  title: string;
  body: React.ReactNode;
}

interface Props {
  eyebrow: string;
  title: string;
  updatedAt: string;
  intro?: React.ReactNode;
  sections: Section[];
}

export default function LegalPage({ eyebrow, title, updatedAt, intro, sections }: Props) {
  return (
    <main className="min-h-[100dvh] bg-neutral-50 text-neutral-900 pb-safe">
      <SiteHeader />
      <div className="mx-auto px-6 py-12" style={{ maxWidth: 720 }}>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-neutral-500 hover:text-neutral-900 mb-8"
        >
          <ArrowLeft size={13} /> 홈으로
        </Link>

        <div className="iso-eyebrow mb-3">{eyebrow}</div>
        <h1 className="text-[32px] md:text-[40px] font-black tracking-tight mb-2">
          {title}
        </h1>
        <p className="text-[12px] text-neutral-500 mb-10">최종 개정일 · {updatedAt}</p>

        {intro && (
          <div className="text-[14px] leading-[1.7] text-neutral-700 mb-12 pb-8 border-b border-neutral-200">
            {intro}
          </div>
        )}

        <div className="space-y-10">
          {sections.map((s, i) => (
            <section key={i}>
              <div className="flex items-baseline gap-3 mb-3">
                <span className="text-[11px] font-bold mono text-neutral-400">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h2 className="text-[17px] font-bold tracking-tight">{s.title}</h2>
              </div>
              <div className="text-[13px] leading-[1.75] text-neutral-700 pl-8">
                {s.body}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-neutral-200 text-[11px] text-neutral-400">
          © 2026 칸막이Go · 문의: privacy@kanmakigo.com
        </div>
      </div>
    </main>
  );
}
