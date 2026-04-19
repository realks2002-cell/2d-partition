"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Zap,
  Layers,
  Smartphone,
  Infinity as InfinityIcon,
} from "lucide-react";
import SiteHeader from "./SiteHeader";
import { getToken, apiUrl } from "@/lib/api-client";
import { useNative } from "@/lib/use-native";

interface Showcase {
  id: number;
  title: string;
  subtitle: string | null;
  description: string | null;
  category: string;
  palette: string;
  image_url: string | null;
  is_featured: boolean;
  order_index: number;
}

const PALETTE_MAP: Record<string, { bg: string; accent: string }> = {
  neutral: { bg: "bg-neutral-100", accent: "bg-neutral-800" },
  terracotta: { bg: "bg-[#f3eee3]", accent: "bg-[#8b3a2e]" },
  espresso: { bg: "bg-[#efeae0]", accent: "bg-[#2d2a27]" },
  sage: { bg: "bg-[#eaf0ea]", accent: "bg-[#5a6b5a]" },
  sand: { bg: "bg-[#f5f0e8]", accent: "bg-[#7a6f60]" },
  graphite: { bg: "bg-[#e9e6e0]", accent: "bg-[#3a3a3a]" },
};

const FILTERS = ["ALL", "사무실", "상가", "카페", "주택"];

const FEATURES = [
  {
    icon: Zap,
    title: "Real-time AI",
    desc: "Gemini 2.5 Flash Image 엔진이 30~60초 안에 시공 후 모습을 시뮬레이션해드립니다.",
  },
  {
    icon: Layers,
    title: "도면 · 사진 듀얼 입력",
    desc: "도면만 있어도, 현장 사진만 있어도 OK. 두 입력 모두 지원해 최적의 결과를 냅니다.",
  },
  {
    icon: Smartphone,
    title: "Mobile-First",
    desc: "현장에서 스마트폰으로, 고객 앞에서 실시간 재안. 설치 없이 브라우저에서 바로.",
  },
  {
    icon: InfinityIcon,
    title: "만료 없는 렌더링 횟수",
    desc: "충전한 렌더링 횟수는 기간 제한 없이 소진 시까지. 바쁠 때 쓰고, 한가할 때 남겨두세요.",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [filter, setFilter] = useState("ALL");
  const [showcases, setShowcases] = useState<Showcase[]>([]);
  const native = useNative();

  useEffect(() => {
    fetch(apiUrl("/api/showcases"))
      .then((r) => (r.ok ? r.json() : { showcases: [] }))
      .then((d) => setShowcases(d.showcases ?? []))
      .catch(() => {});
  }, []);

  const featured = useMemo(() => showcases.find((s) => s.is_featured) ?? null, [showcases]);
  const gridItems = useMemo(
    () => showcases.filter((s) => !s.is_featured),
    [showcases],
  );
  const visibleGrid = useMemo(() => {
    if (filter === "ALL") return gridItems;
    return gridItems.filter((s) => s.category === filter);
  }, [gridItems, filter]);

  const startProject = () => {
    const token = getToken();
    if (token) router.push("/studio");
    else router.push("/signup");
  };

  return (
    <main className="min-h-[100dvh] bg-white text-neutral-900">
      <SiteHeader />

      {/* ============ HERO ============ */}
      <section className="border-b border-neutral-200">
        <div className="mx-auto px-6 pt-20 pb-24 text-center" style={{ maxWidth: 1024 }}>
          <div className="iso-eyebrow mb-6">IN PROGRESS — NOW LIVE</div>
          <h1 className="iso-display text-[35px] md:text-[58px] mb-7 max-w-4xl mx-auto">
            Everything Starts
            <br />
            with a Single Photo.
          </h1>
          <p className="text-[14px] md:text-[15px] text-neutral-600 leading-[1.7] max-w-xl mx-auto mb-9">
            사진 한 장이면 충분합니다. 자체 AI Rendering Engine이
            <br />
            당신의 현장을 실시간 시공 시뮬레이션으로 바꿔드립니다.
            <br />
            No 3D software. No 대기. 현장에서 바로.
          </p>
          <div className="inline-flex items-center gap-2">
            <button
              onClick={startProject}
              className="inline-flex items-center gap-2 h-11 px-5 bg-neutral-900 hover:bg-[#d43e76] text-white text-[12px] font-bold uppercase tracking-[0.08em] transition-colors"
            >
              START PROJECT <ArrowRight size={14} />
            </button>
            <Link
              href="/how-to"
              className="inline-flex items-center h-11 px-5 border border-neutral-300 hover:border-neutral-900 hover:text-[#d43e76] text-[12px] font-bold uppercase tracking-[0.08em] transition-colors"
            >
              VIEW SHOWCASES
            </Link>
          </div>
        </div>
      </section>

      {/* ============ FEATURED SHOWCASE ============ */}
      {featured && (
        <section className="border-b border-neutral-200">
          <div className="mx-auto px-6 py-20" style={{ maxWidth: 1024 }}>
            <div className="text-center mb-10">
              <div className="iso-eyebrow-muted">· FEATURED SHOWCASE ·</div>
            </div>

            <div className="grid md:grid-cols-[1fr_1.2fr] gap-10 items-center max-w-4xl mx-auto">
              <div className="max-w-[420px]">
                <IsoShowcase
                  palette={PALETTE_MAP[featured.palette] ?? PALETTE_MAP.neutral}
                  imageUrl={featured.image_url}
                  large
                />
              </div>
              <div className="px-2">
                {featured.subtitle && (
                  <div className="iso-eyebrow-muted mb-3">{featured.subtitle}</div>
                )}
                <h2 className="text-[26px] md:text-[32px] font-bold tracking-tight leading-[1.1] mb-4">
                  {featured.title}
                </h2>
                {featured.description && (
                  <p className="text-[13px] text-neutral-600 leading-[1.6] mb-6 max-w-md">
                    {featured.description}
                  </p>
                )}
                <Link
                  href="/how-to"
                  className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.1em] text-neutral-900 hover:text-[#d43e76] transition-colors"
                >
                  READ MORE <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ============ LATEST SHOWCASES ============ */}
      <section className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto px-6 py-20" style={{ maxWidth: 1024 }}>
          <div className="flex items-end justify-between border-b border-neutral-900 pb-4 mb-6">
            <div>
              <div className="iso-eyebrow mb-2">LATEST</div>
              <h2 className="text-[26px] md:text-[29px] font-bold tracking-tight">Showcases</h2>
            </div>
            <Link
              href="/how-to"
              className="text-[12px] font-bold uppercase tracking-[0.1em] text-neutral-700 hover:text-[#d43e76]"
            >
              VIEW ALL →
            </Link>
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-2 mb-8 flex-wrap">
            <span className="iso-eyebrow-muted mr-2">FILTER</span>
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3.5 h-8 rounded-full text-[11px] font-bold uppercase tracking-[0.05em] border transition-colors ${
                  filter === f
                    ? "bg-neutral-900 border-neutral-900 text-white"
                    : "bg-white border-neutral-300 text-neutral-700 hover:border-neutral-900"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Portfolio grid — dynamic from DB */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {visibleGrid.length === 0 ? (
              <div className="col-span-full py-16 text-center text-[12px] text-neutral-400 border border-dashed border-neutral-300">
                해당 카테고리의 쇼케이스가 없습니다
              </div>
            ) : (
              visibleGrid.map((s) => (
                <PortfolioCard
                  key={s.id}
                  palette={PALETTE_MAP[s.palette] ?? PALETTE_MAP.neutral}
                  title={s.title}
                  imageUrl={s.image_url}
                />
              ))
            )}
          </div>
        </div>
      </section>

      {/* ============ WHY ISOPLAN ============ */}
      <section className="border-b border-neutral-200">
        <div className="mx-auto px-6 py-20" style={{ maxWidth: 1024 }}>
          <div className="text-center mb-14">
            <div className="iso-eyebrow mb-3">ABOUT THE ENGINE</div>
            <h2 className="text-[26px] md:text-[35px] font-bold tracking-tight">
              Why 칸막이Go
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
            {FEATURES.map((f, i) => (
              <div key={i} className="border-t-2 border-neutral-900 pt-5">
                <f.icon size={22} strokeWidth={2} className="text-[#d43e76] mb-4" />
                <div className="text-[14px] font-bold tracking-tight mb-2">
                  {f.title}
                </div>
                <p className="text-[12px] text-neutral-600 leading-[1.6]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="bg-neutral-900 text-neutral-300">
        <div className="mx-auto px-6 py-14" style={{ maxWidth: 1024 }}>
          <div className="grid md:grid-cols-[1.5fr_1fr_1fr_1fr] gap-10 mb-12">
            {/* Wordmark + subscribe */}
            <div>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-[22px] font-bold tracking-tight text-white">칸막이Go</span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d43e76]">
                  STUDIO
                </span>
              </div>
              <p className="text-[12px] text-neutral-500 leading-[1.6] mb-5 max-w-xs">
                도면 한 장으로 시작하는 파티션 시공 시뮬레이터.
                현장에서, 스마트폰으로, 실시간으로.
              </p>
              <form
                onSubmit={(e) => { e.preventDefault(); }}
                className="flex gap-0"
              >
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="flex-1 h-10 px-3 bg-neutral-800 border border-neutral-700 text-white text-[12px] placeholder:text-neutral-500 focus:outline-none focus:border-neutral-500"
                />
                <button
                  type="submit"
                  className="h-10 px-5 bg-[#d43e76] hover:bg-[#b93366] text-white text-[11px] font-bold uppercase tracking-[0.1em] transition-colors"
                >
                  Subscribe
                </button>
              </form>
            </div>

            <FooterCol
              title="EXPLORE"
              links={[
                { label: "Featured", href: "/how-to" },
                { label: "Showcases", href: "/how-to" },
                { label: "Engine", href: "/how-to" },
                ...(native ? [] : [{ label: "Pricing", href: "/pricing" }]),
              ]}
            />
            <FooterCol
              title="ACCOUNT"
              links={[
                { label: "로그인", href: "/login" },
                { label: "회원가입", href: "/signup" },
                { label: "Studio", href: "/studio" },
                ...(native ? [] : [{ label: "결제 내역", href: "/billing" }]),
              ]}
            />
            <FooterCol
              title="LEGAL"
              links={[
                { label: "이용약관", href: "/terms" },
                { label: "개인정보처리방침", href: "/privacy" },
                { label: "Contact", href: "mailto:privacy@kanmakigo.com" },
              ]}
            />
          </div>

          <div className="pt-6 border-t border-neutral-800 flex items-center justify-between text-[10px] text-neutral-500">
            <span>© 2026 칸막이Go. All rights reserved.</span>
            <span className="uppercase tracking-[0.15em]">
              Built in Seoul · Powered by In-House Rendering Engine
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}

// ============ Sub components ============

interface Palette {
  bg: string;
  accent: string;
}

function IsoShowcase({
  palette,
  imageUrl,
  large = false,
}: {
  palette: Palette;
  imageUrl?: string | null;
  large?: boolean;
}) {
  if (imageUrl) {
    return (
      <div
        className={`relative w-full ${large ? "aspect-[5/4]" : "aspect-[4/3]"} overflow-hidden bg-neutral-100`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className={`relative w-full ${large ? "aspect-[5/4]" : "aspect-[4/3]"} ${palette.bg} overflow-hidden`}>
      {/* Stylized iso diagram — floor plan seen at angle */}
      <svg
        viewBox="0 0 400 340"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id={`wall-${palette.accent}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.85" />
          </linearGradient>
        </defs>
        <g transform="translate(200 80)">
          {/* Floor (iso parallelogram) */}
          <polygon
            points="0,0 170,85 0,170 -170,85"
            fill="#ffffff"
            opacity="0.9"
            stroke="#d4d4d4"
            strokeWidth="1"
          />
          {/* Back-left wall */}
          <polygon
            points="-170,85 0,0 0,-80 -170,5"
            className={palette.accent.replace("bg-", "text-")}
            fill="currentColor"
            opacity="0.95"
          />
          {/* Back-right wall */}
          <polygon
            points="0,0 170,85 170,5 0,-80"
            className={palette.accent.replace("bg-", "text-")}
            fill="currentColor"
            opacity="0.85"
          />
          {/* Inner partition (the product!) */}
          <polygon
            points="-85,42 0,85 0,165 -85,122"
            className={palette.accent.replace("bg-", "text-")}
            fill="currentColor"
            opacity="0.7"
          />
          <polygon
            points="0,85 85,42 85,122 0,165"
            className={palette.accent.replace("bg-", "text-")}
            fill="currentColor"
            opacity="0.75"
          />
          {/* Floor panel lines */}
          <line x1="-85" y1="42" x2="85" y2="127" stroke="#ffffff" strokeWidth="1" opacity="0.5" />
          <line x1="-85" y1="122" x2="85" y2="207" stroke="#ffffff" strokeWidth="0.5" opacity="0.3" />
        </g>
      </svg>
    </div>
  );
}

function PortfolioCard({
  palette,
  title,
  imageUrl,
}: {
  palette: Palette;
  title: string;
  imageUrl?: string | null;
}) {
  return (
    <div className="group cursor-pointer">
      <div className="overflow-hidden">
        <div className="transition-transform duration-500 group-hover:scale-[1.04]">
          <IsoShowcase palette={palette} imageUrl={imageUrl} />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-neutral-900">{title}</span>
        <ArrowRight size={12} className="text-neutral-400 group-hover:text-[#d43e76] transition-colors" />
      </div>
    </div>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-500 mb-4">
        {title}
      </div>
      <ul className="space-y-2.5">
        {links.map((l) => (
          <li key={l.label}>
            <Link
              href={l.href}
              className="text-[12px] text-neutral-300 hover:text-[#d43e76] transition-colors"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

