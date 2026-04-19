"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  Plus,
  Save,
  X,
  Star,
  StarOff,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Trash2,
  Pencil,
  Upload,
  Loader2,
  ImageIcon,
} from "lucide-react";
import { apiUrl, authHeaders, getToken, getUser } from "@/lib/api-client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  is_active: boolean;
}

const PALETTES: { value: string; label: string; bg: string; accent: string }[] = [
  { value: "neutral", label: "Neutral", bg: "bg-neutral-100", accent: "bg-neutral-800" },
  { value: "terracotta", label: "Terracotta", bg: "bg-[#f3eee3]", accent: "bg-[#8b3a2e]" },
  { value: "espresso", label: "Espresso", bg: "bg-[#efeae0]", accent: "bg-[#2d2a27]" },
  { value: "sage", label: "Sage", bg: "bg-[#eaf0ea]", accent: "bg-[#5a6b5a]" },
  { value: "sand", label: "Sand", bg: "bg-[#f5f0e8]", accent: "bg-[#7a6f60]" },
  { value: "graphite", label: "Graphite", bg: "bg-[#e9e6e0]", accent: "bg-[#3a3a3a]" },
];

const CATEGORIES = ["all", "사무실", "상가", "카페", "주택"];

const EMPTY: Omit<Showcase, "id"> = {
  title: "",
  subtitle: "",
  description: "",
  category: "all",
  palette: "neutral",
  image_url: "",
  is_featured: false,
  order_index: 0,
  is_active: true,
};

export default function AdminShowcasesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Showcase[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Omit<Showcase, "id">>(EMPTY);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<Omit<Showcase, "id">>(EMPTY);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(apiUrl("/api/admin/showcases"), { headers: authHeaders() });
    if (res.ok) {
      const data = await res.json();
      setRows(data.showcases);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const u = getUser();
    if (!u || u.role !== "admin") {
      router.replace("/admin/login");
      return;
    }
    load();
  }, [load, router]);

  const startEdit = (s: Showcase) => {
    setEditId(s.id);
    setEditForm({
      title: s.title,
      subtitle: s.subtitle ?? "",
      description: s.description ?? "",
      category: s.category,
      palette: s.palette,
      image_url: s.image_url ?? "",
      is_featured: s.is_featured,
      order_index: s.order_index,
      is_active: s.is_active,
    });
    setError("");
  };

  const saveEdit = async () => {
    if (!editId) return;
    setError("");
    const res = await fetch(apiUrl(`/api/admin/showcases/${editId}`), {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(editForm),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "저장 실패");
      return;
    }
    setEditId(null);
    load();
  };

  const addOne = async () => {
    setError("");
    if (!addForm.title) {
      setError("제목은 필수입니다");
      return;
    }
    const res = await fetch(apiUrl("/api/admin/showcases"), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(addForm),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "추가 실패");
      return;
    }
    setShowAdd(false);
    setAddForm(EMPTY);
    load();
  };

  const toggleField = async (id: number, field: "is_featured" | "is_active", value: boolean) => {
    await fetch(apiUrl(`/api/admin/showcases/${id}`), {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ [field]: value }),
    });
    load();
  };

  const reorder = async (id: number, direction: -1 | 1) => {
    const idx = rows.findIndex((r) => r.id === id);
    if (idx < 0) return;
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= rows.length) return;
    const a = rows[idx];
    const b = rows[swapIdx];
    await Promise.all([
      fetch(apiUrl(`/api/admin/showcases/${a.id}`), {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ order_index: b.order_index }),
      }),
      fetch(apiUrl(`/api/admin/showcases/${b.id}`), {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ order_index: a.order_index }),
      }),
    ]);
    load();
  };

  const del = async (id: number, title: string) => {
    if (!confirm(`"${title}" 삭제?`)) return;
    await fetch(apiUrl(`/api/admin/showcases/${id}`), {
      method: "DELETE",
      headers: authHeaders(),
    });
    load();
  };

  const renderPalette = (value: string) => {
    const p = PALETTES.find((x) => x.value === value);
    if (!p) return null;
    return (
      <div className={`inline-flex w-16 h-6 rounded ${p.bg} border border-neutral-200 items-center justify-center`}>
        <div className={`w-3 h-3 rounded ${p.accent}`} />
      </div>
    );
  };

  return (
    <main className="min-h-[100dvh] bg-neutral-50 text-neutral-900 pt-safe pb-safe">
      <div className="sticky top-0 z-40 bg-white border-b border-neutral-200">
        <div className="mx-auto flex items-center justify-between px-6 h-14" style={{ maxWidth: 1200 }}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/admin")}
              className="inline-flex items-center gap-2 text-neutral-700 hover:text-[#d43e76] text-sm font-medium"
            >
              <ArrowLeft size={16} /> 관리자
            </button>
            <span className="text-neutral-300">|</span>
            <span className="iso-eyebrow">SHOWCASES</span>
          </div>
          <Button
            onClick={() => { setShowAdd(true); setAddForm(EMPTY); setError(""); }}
            className="h-9 px-4 bg-neutral-900 hover:bg-[#d43e76] text-white text-[11px] font-bold uppercase tracking-[0.05em] rounded-md"
          >
            <Plus size={12} className="mr-1" /> 쇼케이스 추가
          </Button>
        </div>
      </div>

      <div className="mx-auto px-6 py-10" style={{ maxWidth: 1200 }}>
        <h1 className="iso-h1 text-[26px] mb-1">쇼케이스 관리</h1>
        <p className="text-[13px] text-neutral-600 mb-6">
          랜딩페이지의 Featured Showcase와 Showcases 그리드를 편집합니다.
        </p>

        {error && (
          <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 text-red-700 text-[12px] rounded-md">
            {error}
          </div>
        )}

        {showAdd && (
          <div className="mb-5 bg-white border border-neutral-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="iso-eyebrow-muted mb-0.5">NEW SHOWCASE</div>
                <span className="font-bold text-[14px]">쇼케이스 추가</span>
              </div>
              <button onClick={() => setShowAdd(false)} className="w-7 h-7 rounded hover:bg-neutral-100 flex items-center justify-center">
                <X size={14} />
              </button>
            </div>
            <ShowcaseForm form={addForm} setForm={setAddForm} />
            <Button
              onClick={addOne}
              className="mt-4 h-9 px-4 bg-neutral-900 hover:bg-[#d43e76] text-white text-[11px] font-bold uppercase tracking-[0.05em] rounded-md"
            >
              <Plus size={12} className="mr-1" /> 추가하기 →
            </Button>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-[13px] text-neutral-500 bg-white border border-neutral-200">
            불러오는 중…
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-[13px] text-neutral-500 border border-dashed border-neutral-300">
            쇼케이스가 없습니다
          </div>
        ) : (
          <div className="bg-white border border-neutral-200 overflow-x-auto">
            <table className="w-full text-[12px]" style={{ minWidth: 1100 }}>
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-[10px] uppercase tracking-[0.05em] text-neutral-500">
                  <th className="py-2.5 px-2 w-12 text-center">#</th>
                  <th className="py-2.5 px-2 text-left">제목 · 부제</th>
                  <th className="py-2.5 px-2 text-left">설명</th>
                  <th className="py-2.5 px-2 text-left">카테고리</th>
                  <th className="py-2.5 px-2 text-center">팔레트</th>
                  <th className="py-2.5 px-2 text-center">Featured</th>
                  <th className="py-2.5 px-2 text-center">Active</th>
                  <th className="py-2.5 px-2 text-center">순서</th>
                  <th className="py-2.5 px-2 text-center">처리</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const isEditing = editId === r.id;
                  if (isEditing) {
                    return (
                      <tr key={r.id} className="border-b border-neutral-100 bg-neutral-50/80">
                        <td colSpan={9} className="p-4">
                          <ShowcaseForm form={editForm} setForm={setEditForm} />
                          <div className="flex items-center justify-end gap-2 mt-3">
                            <Button
                              onClick={() => setEditId(null)}
                              variant="outline"
                              className="h-9 px-3 text-[11px] font-medium border-neutral-300"
                            >
                              취소
                            </Button>
                            <Button
                              onClick={saveEdit}
                              className="h-9 px-4 bg-neutral-900 hover:bg-[#d43e76] text-white text-[11px] font-bold uppercase tracking-[0.05em] rounded-md"
                            >
                              <Save size={11} className="mr-1" /> 저장
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={r.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                      <td className="py-2 px-2 text-center text-[10px] text-neutral-400 mono">{r.id}</td>
                      <td className="py-2 px-2">
                        <div className="font-semibold">{r.title}</div>
                        {r.subtitle && (
                          <div className="text-[10px] text-neutral-500">{r.subtitle}</div>
                        )}
                      </td>
                      <td className="py-2 px-2 max-w-[240px] truncate text-neutral-600" title={r.description ?? ""}>
                        {r.description || <span className="text-neutral-300">-</span>}
                      </td>
                      <td className="py-2 px-2">
                        <span className="inline-block px-2 py-0.5 bg-neutral-100 border border-neutral-200 rounded-full text-[10px] font-semibold">
                          {r.category}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center">{renderPalette(r.palette)}</td>
                      <td className="py-2 px-2 text-center">
                        <button
                          onClick={() => toggleField(r.id, "is_featured", !r.is_featured)}
                          className={`${r.is_featured ? "text-[#d43e76]" : "text-neutral-300 hover:text-neutral-600"}`}
                          title={r.is_featured ? "Featured 해제" : "Featured 지정"}
                        >
                          {r.is_featured ? <Star size={16} fill="currentColor" /> : <StarOff size={16} />}
                        </button>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          onClick={() => toggleField(r.id, "is_active", !r.is_active)}
                          className={r.is_active ? "text-emerald-600" : "text-neutral-400"}
                          title={r.is_active ? "노출 중" : "숨김"}
                        >
                          {r.is_active ? <Eye size={15} /> : <EyeOff size={15} />}
                        </button>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <div className="inline-flex items-center gap-0.5">
                          <button
                            onClick={() => reorder(r.id, -1)}
                            disabled={i === 0}
                            className="w-6 h-6 flex items-center justify-center text-neutral-500 hover:text-neutral-900 disabled:opacity-30"
                          >
                            <ArrowUp size={12} />
                          </button>
                          <span className="text-[10px] text-neutral-400 mono mx-0.5">{r.order_index}</span>
                          <button
                            onClick={() => reorder(r.id, 1)}
                            disabled={i === rows.length - 1}
                            className="w-6 h-6 flex items-center justify-center text-neutral-500 hover:text-neutral-900 disabled:opacity-30"
                          >
                            <ArrowDown size={12} />
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => startEdit(r)}
                            className="text-neutral-500 hover:text-neutral-900 hover:scale-110 transition-transform"
                            title="편집"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => del(r.id, r.title)}
                            className="text-red-400 hover:text-red-600 hover:scale-110 transition-transform"
                            title="삭제"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

function ShowcaseForm({
  form,
  setForm,
}: {
  form: Omit<Showcase, "id">;
  setForm: (v: Omit<Showcase, "id">) => void;
}) {
  const set = <K extends keyof Omit<Showcase, "id">>(k: K, v: Omit<Showcase, "id">[K]) => setForm({ ...form, [k]: v });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="space-y-1">
        <Label className="text-[11px] font-semibold">제목 *</Label>
        <Input
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          className="h-9 text-[13px]"
          maxLength={100}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-[11px] font-semibold">부제 (Featured용)</Label>
        <Input
          value={form.subtitle || ""}
          onChange={(e) => set("subtitle", e.target.value)}
          placeholder="예: CASE · 001"
          className="h-9 text-[13px]"
          maxLength={100}
        />
      </div>
      <div className="md:col-span-2 space-y-1">
        <Label className="text-[11px] font-semibold">설명 (Featured용)</Label>
        <textarea
          value={form.description || ""}
          onChange={(e) => set("description", e.target.value)}
          rows={3}
          className="w-full px-3 py-2 text-[13px] border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900"
          placeholder="판교 42평 상가 파티션 리모델링…"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-[11px] font-semibold">카테고리</Label>
        <select
          value={form.category}
          onChange={(e) => set("category", e.target.value)}
          className="w-full h-9 px-2 text-[13px] bg-white border border-neutral-300 rounded-md"
        >
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <Label className="text-[11px] font-semibold">팔레트</Label>
        <div className="flex flex-wrap gap-2">
          {PALETTES.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => set("palette", p.value)}
              className={`inline-flex items-center gap-1.5 px-2 h-9 border rounded-md text-[11px] font-semibold transition-colors ${
                form.palette === p.value
                  ? "border-neutral-900 bg-neutral-50"
                  : "border-neutral-300 hover:border-neutral-500"
              }`}
            >
              <div className={`w-4 h-4 rounded ${p.bg} border border-neutral-200 flex items-center justify-center`}>
                <div className={`w-2 h-2 rounded ${p.accent}`} />
              </div>
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="md:col-span-2 space-y-1">
        <Label className="text-[11px] font-semibold">이미지 (선택)</Label>
        <ImageUploader
          value={form.image_url || ""}
          onChange={(v) => set("image_url", v)}
        />
        <p className="text-[10px] text-neutral-500 mt-1">
          JPG/PNG/WebP/GIF · 5MB 이하 · 비우면 팔레트 기반 SVG 자동 렌더링
        </p>
      </div>
      <div className="flex items-center gap-4">
        <label className="inline-flex items-center gap-2 text-[12px] cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_featured}
            onChange={(e) => set("is_featured", e.target.checked)}
            className="w-4 h-4 rounded accent-[#d43e76]"
          />
          <span className="font-semibold">Featured</span>
          <span className="text-[10px] text-neutral-500">(메인 쇼케이스)</span>
        </label>
        <label className="inline-flex items-center gap-2 text-[12px] cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => set("is_active", e.target.checked)}
            className="w-4 h-4 rounded accent-emerald-500"
          />
          <span className="font-semibold">Active</span>
        </label>
      </div>
    </div>
  );
}

function ImageUploader({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");

  const pick = () => inputRef.current?.click();

  const upload = async (file: File) => {
    setErr("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const token = getToken();
      const res = await fetch(apiUrl("/api/admin/upload"), {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "업로드 실패");
        return;
      }
      onChange(data.url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "업로드 실패");
    } finally {
      setUploading(false);
    }
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = "";
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={onFile}
        className="hidden"
      />
      <div className="flex items-start gap-3">
        <div className="relative w-28 h-28 shrink-0 border border-neutral-300 rounded-md bg-neutral-50 flex items-center justify-center overflow-hidden">
          {value ? (
            <Image
              src={value}
              alt="preview"
              fill
              sizes="112px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <ImageIcon size={24} className="text-neutral-300" />
          )}
          {uploading && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
              <Loader2 size={18} className="animate-spin text-neutral-700" />
            </div>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={pick}
              disabled={uploading}
              className="h-9 px-3 bg-neutral-900 hover:bg-[#d43e76] text-white text-[11px] font-bold uppercase tracking-[0.05em] rounded-md"
            >
              <Upload size={11} className="mr-1" />
              {value ? "교체" : "업로드"}
            </Button>
            {value && (
              <Button
                type="button"
                onClick={() => onChange("")}
                variant="outline"
                disabled={uploading}
                className="h-9 px-3 text-[11px] font-medium border-neutral-300"
              >
                <X size={11} className="mr-1" /> 제거
              </Button>
            )}
          </div>
          {value && (
            <Input
              readOnly
              value={value}
              className="h-8 text-[10px] mono text-neutral-500 bg-neutral-50"
              onClick={(e) => (e.currentTarget as HTMLInputElement).select()}
            />
          )}
          {err && <p className="text-[11px] text-red-600">{err}</p>}
        </div>
      </div>
    </div>
  );
}
