"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Bell,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Search,
  Receipt,
  Zap,
  Image as ImageIcon,
} from "lucide-react";
import { apiUrl, authHeaders, getUser, clearToken } from "@/lib/api-client";

interface User {
  id: number;
  login_id: string;
  password: string;
  name: string;
  phone: string;
  memo: string | null;
  email: string;
  company: string | null;
  region: string;
  role: string;
  status: string;
  expired_at: string | null;
  created_at: string;
  render_quota?: number;
  plan?: string;
  total_rendered?: number;
}

const REGIONS = [
  "서울", "경기", "인천", "부산", "대구", "대전", "광주", "울산", "세종",
  "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
];

const EMPTY_FORM = {
  login_id: "", password: "", name: "", phone: "", memo: "",
  email: "", company: "", region: "", expired_at: "", status: "active",
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${mi}`;
}

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [regionFilter, setRegionFilter] = useState("");

  const fetchUsers = useCallback(async () => {
    const res = await fetch(apiUrl("/api/admin/users"), { headers: authHeaders() });
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const u = getUser();
    if (!u || u.role !== "admin") { router.replace("/admin/login"); return; }
    fetchUsers();
  }, [fetchUsers, router]);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (search) {
        const q = search.toLowerCase();
        const match = u.name.toLowerCase().includes(q)
          || u.phone.includes(q)
          || u.login_id.toLowerCase().includes(q)
          || u.email.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (regionFilter && u.region !== regionFilter) return false;
      if (dateFrom) {
        const from = new Date(dateFrom);
        if (new Date(u.created_at) < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setDate(to.getDate() + 1);
        if (new Date(u.created_at) >= to) return false;
      }
      return true;
    });
  }, [users, search, regionFilter, dateFrom, dateTo]);

  const updateStatus = async (id: number, status: string) => {
    await fetch(apiUrl(`/api/admin/users/${id}`), {
      method: "PATCH", headers: authHeaders(), body: JSON.stringify({ status }),
    });
    fetchUsers();
  };

  const startEdit = (u: User) => {
    setEditId(u.id);
    setEditForm({
      login_id: u.login_id, password: u.password, name: u.name, phone: u.phone,
      memo: u.memo || "", email: u.email, company: u.company || "", region: u.region,
      expired_at: u.expired_at ? u.expired_at.slice(0, 10) : "", status: u.status,
    });
    setError("");
  };

  const saveEdit = async () => {
    if (!editId) return;
    setError("");
    const res = await fetch(apiUrl(`/api/admin/users/${editId}`), {
      method: "PATCH", headers: authHeaders(), body: JSON.stringify(editForm),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setEditId(null);
    fetchUsers();
  };

  const deleteUser = async (id: number, loginId: string) => {
    if (!confirm(`"${loginId}" 회원을 삭제하시겠습니까?`)) return;
    await fetch(apiUrl(`/api/admin/users/${id}`), { method: "DELETE", headers: authHeaders() });
    fetchUsers();
  };

  const addUser = async () => {
    setError("");
    const { login_id, password, name, phone, email, region } = addForm;
    if (!login_id || !password || !name || !phone || !email || !region) {
      setError("필수 항목을 모두 입력해주세요"); return;
    }
    const res = await fetch(apiUrl("/api/admin/users"), {
      method: "POST", headers: authHeaders(), body: JSON.stringify(addForm),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setShowAdd(false);
    setAddForm(EMPTY_FORM);
    fetchUsers();
  };

  const saveMemo = async (id: number, memo: string) => {
    await fetch(apiUrl(`/api/admin/users/${id}`), {
      method: "PATCH", headers: authHeaders(), body: JSON.stringify({ memo }),
    });
  };

  const adjustQuota = async (id: number, name: string) => {
    const raw = prompt(`"${name}" 회원의 횟수 조정 (+충전 / -회수)\n예: 30 또는 -5`);
    if (!raw) return;
    const delta = Number(raw.trim());
    if (!Number.isFinite(delta) || delta === 0) { alert("숫자를 입력하세요"); return; }
    const note = prompt("사유 (선택)") || "";
    const res = await fetch(apiUrl(`/api/admin/users/${id}/quota`), {
      method: "POST", headers: authHeaders(), body: JSON.stringify({ delta, note }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error || "실패"); return; }
    alert(`완료. 잔여 ${data.balance}회`);
    fetchUsers();
  };

  const handleLogout = () => { clearToken(); router.replace("/login"); };

  const statusText = (s: string) => {
    if (s === "active") return "활성";
    if (s === "blocked") return "차단";
    return "대기중";
  };

  const statusCls = (s: string) => {
    if (s === "active") return "text-[var(--success)]";
    if (s === "blocked") return "text-[var(--danger)]";
    return "text-[var(--muted)]";
  };

  if (loading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-neutral-50">
        <div className="text-[13px] text-neutral-500">불러오는 중…</div>
      </div>
    );
  }

  const inputCls = "w-full h-[28px] px-2 text-[11px] bg-white border border-neutral-300 rounded-md focus:outline-none focus:border-neutral-900 transition-colors";
  const editInputCls = "w-full h-[24px] px-1.5 text-[10px] bg-white border border-neutral-300 rounded focus:outline-none focus:border-neutral-900";

  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === "active").length,
    pending: users.filter((u) => u.status === "pending").length,
    blocked: users.filter((u) => u.status === "blocked").length,
  };

  return (
    <main className="min-h-[100dvh] bg-neutral-50 text-neutral-900 pt-safe pb-safe">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-white border-b border-neutral-200">
        <div className="mx-auto flex items-center justify-between px-5 h-14" style={{ maxWidth: 1120 }}>
          <div className="flex items-center gap-3">
            <div className="flex items-baseline gap-2">
              <span className="text-[20px] font-bold tracking-tight">칸막이Go</span>
              <span className="iso-eyebrow">ADMIN</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowAdd(true); setAddForm(EMPTY_FORM); setError(""); }}
              className="inline-flex items-center gap-1 px-3 h-8 bg-neutral-900 hover:bg-[#d43e76] text-white text-[11px] font-bold uppercase tracking-[0.05em] rounded-md transition-colors"
            >
              <Plus size={11} /> 회원 추가
            </button>
            <button
              onClick={() => router.push("/admin/payments")}
              className="inline-flex items-center gap-1 px-3 h-8 border border-neutral-300 hover:border-neutral-900 hover:text-[#d43e76] text-[11px] font-semibold rounded-md transition-colors"
            >
              <Receipt size={11} /> 결제
            </button>
            <button
              onClick={() => router.push("/admin/showcases")}
              className="inline-flex items-center gap-1 px-3 h-8 border border-neutral-300 hover:border-neutral-900 hover:text-[#d43e76] text-[11px] font-semibold rounded-md transition-colors"
            >
              <ImageIcon size={11} /> 쇼케이스
            </button>
            <button
              onClick={() => router.push("/admin/push")}
              className="inline-flex items-center gap-1 px-3 h-8 border border-neutral-300 hover:border-neutral-900 hover:text-[#d43e76] text-[11px] font-semibold rounded-md transition-colors"
            >
              <Bell size={11} /> 푸시
            </button>
            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center px-3 h-8 text-[11px] font-semibold text-neutral-600 hover:text-[#d43e76] rounded-md transition-colors"
            >
              앱으로 →
            </button>
            <button
              onClick={handleLogout}
              className="w-8 h-8 rounded-md border border-neutral-300 hover:border-neutral-900 hover:text-[#d43e76] flex items-center justify-center transition-colors"
            >
              <LogOut size={12} />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto px-5 py-6" style={{ maxWidth: 1120 }}>
        {/* Page header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="iso-eyebrow mb-2">MEMBERS · MANAGEMENT</div>
            <h1 className="iso-h1 text-[22px]">회원 관리</h1>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <div className="iso-eyebrow-muted mb-1">TOTAL</div>
            <div className="text-[21px] font-bold tracking-tight">{stats.total}</div>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <div className="iso-eyebrow-muted mb-1">ACTIVE</div>
            <div className="text-[21px] font-bold tracking-tight text-emerald-600">{stats.active}</div>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <div className="iso-eyebrow-muted mb-1">PENDING</div>
            <div className="text-[21px] font-bold tracking-tight text-neutral-500">{stats.pending}</div>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <div className="iso-eyebrow-muted mb-1">BLOCKED</div>
            <div className="text-[21px] font-bold tracking-tight text-red-600">{stats.blocked}</div>
          </div>
        </div>

        {/* 필터 바 */}
        <div className="flex items-center gap-2 py-3 bg-white border border-neutral-200 rounded-xl px-3 mb-4">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="이름 · 아이디 · 전화 · 이메일"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${inputCls} pl-7`}
              style={{ width: 220 }}
            />
          </div>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className={inputCls}
            style={{ width: 140 }}
          />
          <span className="text-neutral-400 text-[11px]">~</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className={inputCls}
            style={{ width: 140 }}
          />
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className={inputCls}
            style={{ width: 120 }}
          >
            <option value="">전체 지역</option>
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <div className="flex-1" />
          <span className="text-[11px] text-neutral-500 font-medium">{filtered.length}건</span>
        </div>

        {error && (
          <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-[12px] rounded-md">{error}</div>
        )}

        {/* 회원 추가 폼 */}
        {showAdd && (
          <div className="mb-4 bg-white border border-neutral-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="iso-eyebrow-muted mb-0.5">NEW MEMBER</div>
                <span className="font-bold text-[14px]">새 회원 추가</span>
              </div>
              <button onClick={() => setShowAdd(false)} className="w-7 h-7 rounded-md hover:bg-neutral-100 flex items-center justify-center"><X size={14} /></button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {[
                { label: "아이디 *", key: "login_id", ph: "아이디" },
                { label: "비밀번호 *", key: "password", ph: "비밀번호" },
                { label: "이름 *", key: "name", ph: "이름" },
                { label: "전화번호 *", key: "phone", ph: "010-0000-0000" },
                { label: "메모", key: "memo", ph: "간단메모" },
                { label: "이메일 *", key: "email", ph: "email@example.com" },
                { label: "상호명", key: "company", ph: "선택" },
              ].map(({ label, key, ph }) => (
                <div key={key}>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">{label}</label>
                  <input className={inputCls} placeholder={ph}
                    value={addForm[key as keyof typeof addForm]}
                    onChange={(e) => setAddForm((p) => ({ ...p, [key]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">종료일</label>
                <input type="date" className={inputCls} value={addForm.expired_at}
                  onChange={(e) => setAddForm((p) => ({ ...p, expired_at: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">지역 *</label>
                <select className={inputCls} value={addForm.region}
                  onChange={(e) => setAddForm((p) => ({ ...p, region: e.target.value }))}>
                  <option value="">선택</option>
                  {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">상태</label>
                <select className={inputCls} value={addForm.status}
                  onChange={(e) => setAddForm((p) => ({ ...p, status: e.target.value }))}>
                  <option value="active">활성</option>
                  <option value="pending">대기</option>
                </select>
              </div>
            </div>
            <button onClick={addUser}
              className="inline-flex items-center gap-1 px-3 h-8 bg-neutral-900 hover:bg-[#d43e76] text-white text-[11px] font-bold uppercase tracking-[0.05em] rounded-md mt-4 transition-colors">
              <Plus size={11} /> 추가하기 →
            </button>
          </div>
        )}

        {/* 테이블 */}
        <div className="bg-white border border-neutral-200 overflow-x-auto">
          <table className="w-full text-[11px]" style={{ minWidth: 1100 }}>
            <thead>
              <tr className="border-b border-neutral-200 text-center bg-neutral-50 text-neutral-500">
                <th className="py-2.5 px-1.5 font-semibold w-8 text-[10px] uppercase tracking-[0.05em]">#</th>
                <th className="py-2.5 px-1.5 font-semibold text-left text-[10px] uppercase tracking-[0.05em]">아이디</th>
                <th className="py-2.5 px-1.5 font-semibold text-left text-[10px] uppercase tracking-[0.05em]">비번</th>
                <th className="py-2.5 px-1.5 font-semibold text-left text-[10px] uppercase tracking-[0.05em]">이름</th>
                <th className="py-2.5 px-1.5 font-semibold text-left text-[10px] uppercase tracking-[0.05em]">전화</th>
                <th className="py-2.5 px-1.5 font-semibold text-left text-[10px] uppercase tracking-[0.05em]" style={{ width: "12%" }}>메모</th>
                <th className="py-2.5 px-1.5 font-semibold text-left text-[10px] uppercase tracking-[0.05em]">이메일</th>
                <th className="py-2.5 px-1.5 font-semibold text-left text-[10px] uppercase tracking-[0.05em]">상호명</th>
                <th className="py-2.5 px-1.5 font-semibold text-left text-[10px] uppercase tracking-[0.05em]">지역</th>
                <th className="py-2.5 px-1.5 font-semibold text-[10px] uppercase tracking-[0.05em]">가입</th>
                <th className="py-2.5 px-1.5 font-semibold text-[10px] uppercase tracking-[0.05em]">잔여</th>
                <th className="py-2.5 px-1.5 font-semibold text-[10px] uppercase tracking-[0.05em]">종료</th>
                <th className="py-2.5 px-1.5 font-semibold text-[10px] uppercase tracking-[0.05em]">상태</th>
                <th className="py-2.5 px-1.5 font-semibold text-[10px] uppercase tracking-[0.05em]">처리</th>
              </tr>
            </thead>
          <tbody>
            {filtered.map((u) => {
              const isEditing = editId === u.id;

              if (isEditing) {
                return (
                  <tr key={u.id} className="border-b border-neutral-100 bg-neutral-50">
                    <td className="py-2 px-1.5 text-center mono text-neutral-400 text-[10px]">{u.id}</td>
                    {(["login_id", "password", "name", "phone", "memo", "email", "company"] as const).map((k) => (
                      <td key={k} className="py-2 px-1.5">
                        <input className={editInputCls} value={editForm[k]}
                          onChange={(e) => setEditForm((p) => ({ ...p, [k]: e.target.value }))} />
                      </td>
                    ))}
                    <td className="py-2 px-1.5">
                      <select className={editInputCls} value={editForm.region}
                        onChange={(e) => setEditForm((p) => ({ ...p, region: e.target.value }))}>
                        {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td className="py-2 px-1.5 text-center text-[10px] text-neutral-500 mono">{fmtDate(u.created_at)}</td>
                    <td className="py-2 px-1.5 text-center text-[10px] text-neutral-500 mono">{u.render_quota ?? 0}</td>
                    <td className="py-2 px-1.5">
                      <input type="date" className={editInputCls} value={editForm.expired_at}
                        onChange={(e) => setEditForm((p) => ({ ...p, expired_at: e.target.value }))} />
                    </td>
                    <td className="py-2 px-1.5 text-center">
                      <select className={editInputCls} value={editForm.status}
                        onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}>
                        <option value="active">활성</option>
                        <option value="pending">대기</option>
                        <option value="blocked">차단</option>
                      </select>
                    </td>
                    <td className="py-2 px-1.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={saveEdit} className="text-emerald-600 hover:scale-110 transition-transform" title="저장">
                          <Save size={13} />
                        </button>
                        <button onClick={() => setEditId(null)} className="text-neutral-400 hover:text-neutral-900 hover:scale-110 transition-transform" title="취소">
                          <X size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }

              const statusBadge = u.status === "active"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : u.status === "blocked"
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-neutral-100 text-neutral-500 border-neutral-200";

              return (
                <tr key={u.id} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                  <td className="py-2.5 px-1.5 text-center mono text-neutral-400 text-[10px]">{u.id}</td>
                  <td className="py-2.5 px-1.5 font-semibold">{u.login_id}</td>
                  <td className="py-2.5 px-1.5 mono text-neutral-500 text-[10px]">{u.password}</td>
                  <td className="py-2.5 px-1.5 text-[#d43e76] font-semibold">{u.name}</td>
                  <td className="py-2.5 px-1.5 mono text-[10px] text-neutral-600">{u.phone}</td>
                  <td className="py-1 px-1">
                    <input
                      className="w-full h-[24px] px-1.5 text-[10px] bg-transparent border border-transparent rounded hover:border-neutral-300 focus:border-neutral-900 focus:bg-white outline-none transition-colors"
                      defaultValue={u.memo || ""}
                      placeholder="메모 입력"
                      onBlur={(e) => {
                        if (e.target.value !== (u.memo || "")) {
                          saveMemo(u.id, e.target.value);
                          u.memo = e.target.value;
                        }
                      }}
                      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                    />
                  </td>
                  <td className="py-2.5 px-1.5 text-neutral-600 text-[10px]">{u.email}</td>
                  <td className="py-2.5 px-1.5 text-neutral-400 text-[10px]">{u.company || "-"}</td>
                  <td className="py-2.5 px-1.5 text-neutral-600">{u.region}</td>
                  <td className="py-2.5 px-1.5 text-center text-[10px] text-neutral-500 mono">{fmtDate(u.created_at)}</td>
                  <td className="py-2.5 px-1.5 text-center font-bold">
                    <span className={u.render_quota !== undefined && u.render_quota <= 3 ? "text-red-600" : "text-neutral-900"}>
                      {u.render_quota ?? 0}
                    </span>
                  </td>
                  <td className="py-2.5 px-1.5 text-center text-[10px] text-neutral-500 mono">{u.expired_at ? u.expired_at.slice(0, 10) : "-"}</td>
                  <td className="py-2.5 px-1.5 text-center">
                    <span className={`inline-block px-2 py-0.5 border rounded-full text-[9px] font-semibold ${statusBadge}`}>
                      {statusText(u.status)}
                    </span>
                  </td>
                  <td className="py-2.5 px-1.5">
                    {u.role !== "admin" ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => adjustQuota(u.id, u.name)}
                          className="text-[#d43e76] hover:scale-110 transition-transform" title="횟수 조정">
                          <Zap size={13} />
                        </button>
                        <button onClick={() => startEdit(u)}
                          className="text-neutral-500 hover:text-neutral-900 hover:scale-110 transition-transform" title="편집">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => deleteUser(u.id, u.login_id)}
                          className="text-red-400 hover:text-red-600 hover:scale-110 transition-transform" title="삭제">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-neutral-400 italic">admin</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </main>
  );
}
