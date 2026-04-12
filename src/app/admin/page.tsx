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

  const currentUser = getUser();

  const fetchUsers = useCallback(async () => {
    const res = await fetch(apiUrl("/api/admin/users"), { headers: authHeaders() });
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!currentUser || currentUser.role !== "admin") { router.replace("/"); return; }
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
    return <div className="h-[100dvh] flex items-center justify-center"><div className="text-[var(--muted)]">불러오는 중…</div></div>;
  }

  const inputCls = "w-full h-[26px] px-2 text-[9px] bg-[var(--surface)] border border-[var(--line-2)] rounded-md focus:outline-none focus:border-[var(--ink)] transition-colors";
  const editInputCls = "w-full h-[22px] px-1.5 text-[8px] bg-[var(--surface)] border border-[var(--line-2)] rounded focus:outline-none focus:border-[var(--ink)]";

  return (
    <main className="min-h-[100dvh] mx-auto px-5 pt-safe pb-safe" style={{ maxWidth: 1400 }}>
      {/* 헤더 */}
      <header className="flex items-center justify-between py-2">
        <div className="flex items-center gap-1.5">
          <Shield size={12} />
          <span className="font-semibold text-[11px]">회원 관리</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => { setShowAdd(true); setAddForm(EMPTY_FORM); setError(""); }}
            className="inline-flex items-center gap-1 px-2 h-[23px] bg-[var(--ink)] text-[var(--surface)] text-[8px] font-medium rounded-md">
            <Plus size={9} /> 회원 추가
          </button>
          <button onClick={() => router.push("/admin/push")}
            className="inline-flex items-center gap-1 px-2 h-[23px] border border-[var(--line-2)] text-[8px] font-medium rounded-md hover:bg-[var(--surface-2)]">
            <Bell size={9} /> 푸시
          </button>
          <button onClick={() => router.push("/")}
            className="inline-flex items-center px-1.5 h-[23px] text-[8px] rounded-md hover:bg-[var(--surface-2)]">앱으로</button>
          <button onClick={handleLogout}
            className="inline-flex items-center px-1 h-[23px] rounded-md hover:bg-[var(--surface-2)]"><LogOut size={10} /></button>
        </div>
      </header>

      {/* 필터 바 */}
      <div className="flex items-center gap-1.5 py-2 border-y border-[var(--line)]">
        <div className="relative">
          <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input type="text" placeholder="이름, 전화번호 검색..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputCls} !pl-6`} style={{ width: 150 }} />
        </div>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          className={inputCls} style={{ width: 130 }} />
        <span className="text-[var(--muted)] text-[9px]">~</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          className={inputCls} style={{ width: 130 }} />
        <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}
          className={inputCls} style={{ width: 110 }}>
          <option value="">전체 지역</option>
          {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <div className="flex-1" />
        <span className="text-[9px] text-[var(--muted)]">{filtered.length}건</span>
      </div>

      {error && (
        <div className="mt-1.5 p-2 bg-[var(--accent-tint)] text-[var(--danger)] text-[8px] rounded-md">{error}</div>
      )}

      {/* 회원 추가 폼 */}
      {showAdd && (
        <div className="mt-2 bg-[var(--surface)] border border-[var(--line)] rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-[9px]">새 회원 추가</span>
            <button onClick={() => setShowAdd(false)} className="p-0.5 rounded hover:bg-[var(--surface-2)]"><X size={10} /></button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
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
                <label className="block text-[8px] font-medium text-[var(--ink-3)] mb-0.5">{label}</label>
                <input className={inputCls} placeholder={ph}
                  value={addForm[key as keyof typeof addForm]}
                  onChange={(e) => setAddForm((p) => ({ ...p, [key]: e.target.value }))} />
              </div>
            ))}
            <div>
              <label className="block text-[8px] font-medium text-[var(--ink-3)] mb-0.5">종료일</label>
              <input type="date" className={inputCls} value={addForm.expired_at}
                onChange={(e) => setAddForm((p) => ({ ...p, expired_at: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[8px] font-medium text-[var(--ink-3)] mb-0.5">지역 *</label>
              <select className={inputCls} value={addForm.region}
                onChange={(e) => setAddForm((p) => ({ ...p, region: e.target.value }))}>
                <option value="">선택</option>
                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[8px] font-medium text-[var(--ink-3)] mb-0.5">상태</label>
              <select className={inputCls} value={addForm.status}
                onChange={(e) => setAddForm((p) => ({ ...p, status: e.target.value }))}>
                <option value="active">활성</option>
                <option value="pending">대기</option>
              </select>
            </div>
          </div>
          <button onClick={addUser}
            className="inline-flex items-center gap-1 px-2 h-[23px] bg-[var(--ink)] text-[var(--surface)] text-[8px] font-medium rounded-md mt-2">
            <Plus size={9} /> 추가하기
          </button>
        </div>
      )}

      {/* 테이블 */}
      <div className="overflow-x-auto mt-1 pb-8">
        <table className="w-full text-[9px]" style={{ minWidth: 1100 }}>
          <thead>
            <tr className="border-b border-[var(--line)] text-center text-[var(--ink-3)]">
              <th className="py-2 px-1.5 font-medium w-6">#</th>
              <th className="py-2 px-1.5 font-medium text-left">아이디</th>
              <th className="py-2 px-1.5 font-medium text-left">비번</th>
              <th className="py-2 px-1.5 font-medium text-left">이름</th>
              <th className="py-2 px-1.5 font-medium text-left">전화번호</th>
              <th className="py-2 px-1.5 font-medium text-left" style={{ width: "14%" }}>간단 메모</th>
              <th className="py-2 px-1.5 font-medium text-left">이메일</th>
              <th className="py-2 px-1.5 font-medium text-left">상호명</th>
              <th className="py-2 px-1.5 font-medium text-left">지역</th>
              <th className="py-2 px-1.5 font-medium">가입일</th>
              <th className="py-2 px-1.5 font-medium">종료일</th>
              <th className="py-2 px-1.5 font-medium">상태</th>
              <th className="py-2 px-1.5 font-medium">처리</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const isEditing = editId === u.id;

              if (isEditing) {
                return (
                  <tr key={u.id} className="border-b border-[var(--line)] bg-[var(--surface-2)]">
                    <td className="py-1.5 px-1.5 text-center mono text-[var(--muted)]">{u.id}</td>
                    {(["login_id", "password", "name", "phone", "memo", "email", "company"] as const).map((k) => (
                      <td key={k} className="py-1.5 px-1.5">
                        <input className={editInputCls} value={editForm[k]}
                          onChange={(e) => setEditForm((p) => ({ ...p, [k]: e.target.value }))} />
                      </td>
                    ))}
                    <td className="py-1.5 px-1.5">
                      <select className={editInputCls} value={editForm.region}
                        onChange={(e) => setEditForm((p) => ({ ...p, region: e.target.value }))}>
                        {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td className="py-1.5 px-1.5 text-center text-[8px] text-[var(--muted)]">{fmtDate(u.created_at)}</td>
                    <td className="py-1.5 px-1.5">
                      <input type="date" className={editInputCls} value={editForm.expired_at}
                        onChange={(e) => setEditForm((p) => ({ ...p, expired_at: e.target.value }))} />
                    </td>
                    <td className="py-1.5 px-1.5 text-center">
                      <select className={editInputCls} value={editForm.status}
                        onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}>
                        <option value="active">활성</option>
                        <option value="pending">대기</option>
                        <option value="blocked">차단</option>
                      </select>
                    </td>
                    <td className="py-1.5 px-1.5">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={saveEdit} className="text-[var(--success)] hover:scale-110 transition-transform" title="저장">
                          <Save size={12} />
                        </button>
                        <button onClick={() => setEditId(null)} className="text-[var(--muted)] hover:scale-110 transition-transform" title="취소">
                          <X size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={u.id} className="border-b border-[var(--line)] hover:bg-[var(--surface-2)] transition-colors">
                  <td className="py-2.5 px-1.5 text-center mono text-[var(--muted)]">{u.id}</td>
                  <td className="py-2.5 px-1.5 font-medium">{u.login_id}</td>
                  <td className="py-2.5 px-1.5 mono text-[var(--ink-3)]">{u.password}</td>
                  <td className="py-2.5 px-1.5 text-[var(--accent)] font-medium">{u.name}</td>
                  <td className="py-2.5 px-1.5 mono">{u.phone}</td>
                  <td className="py-1 px-1">
                    <input
                      className="w-full h-[22px] px-1.5 text-[8px] bg-transparent border border-transparent rounded hover:border-[var(--line-2)] focus:border-[var(--ink)] focus:bg-[var(--surface)] outline-none transition-colors"
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
                  <td className="py-2.5 px-1.5">{u.email}</td>
                  <td className="py-2.5 px-1.5 text-[var(--muted)]">{u.company || "-"}</td>
                  <td className="py-2.5 px-1.5">{u.region}</td>
                  <td className="py-2.5 px-1.5 text-center text-[8px] text-[var(--muted)]">{fmtDate(u.created_at)}</td>
                  <td className="py-2.5 px-1.5 text-center text-[8px] text-[var(--muted)]">{u.expired_at ? u.expired_at.slice(0, 10) : "-"}</td>
                  <td className={`py-2.5 px-1.5 text-center font-medium ${statusCls(u.status)}`}>{statusText(u.status)}</td>
                  <td className="py-2.5 px-1.5">
                    {u.role !== "admin" ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => startEdit(u)}
                          className="text-[var(--muted)] hover:text-[var(--ink)] hover:scale-110 transition-transform" title="편집">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => deleteUser(u.id, u.login_id)}
                          className="text-red-400 hover:text-red-600 hover:scale-110 transition-transform" title="삭제">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[8px] text-[var(--muted)]">관리자</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
