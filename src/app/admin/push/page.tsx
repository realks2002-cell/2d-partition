"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, ArrowLeft } from "lucide-react";
import { apiUrl, authHeaders, getUser } from "@/lib/api-client";

export default function PushPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    sent: number;
    failed: number;
  } | null>(null);

  useEffect(() => {
    const user = getUser();
    if (!user || user.role !== "admin") {
      router.replace("/");
    }
  }, [router]);

  const handleSend = async () => {
    if (!title || !body) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(apiUrl("/api/admin/push"), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ title, body }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        setTitle("");
        setBody("");
      }
    } catch {
      /* empty */
    }
    setBusy(false);
  };

  return (
    <main className="min-h-[100dvh] max-w-md mx-auto px-6 pt-safe pb-safe">
      <header className="flex items-center gap-3 py-4">
        <button
          onClick={() => router.push("/admin")}
          className="btn-icon"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="display text-[18px]">FCM 푸시 발송</h1>
      </header>

      <section className="flex flex-col gap-4 mt-4">
        <div className="field">
          <label className="field-label">제목</label>
          <input
            type="text"
            className="text-input"
            placeholder="알림 제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label">내용</label>
          <textarea
            className="text-input"
            rows={4}
            placeholder="알림 내용을 입력하세요"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            style={{ minHeight: "100px", resize: "vertical" }}
          />
        </div>

        <button
          onClick={handleSend}
          disabled={busy || !title || !body}
          className="btn btn-primary w-full"
        >
          <Send size={18} />
          {busy ? "발송 중…" : "전체 발송"}
        </button>

        {result && (
          <div className="surface p-4 text-center">
            <p className="text-[14px]">
              <span className="text-[var(--success)] font-medium">
                {result.sent}건 발송 성공
              </span>
              {result.failed > 0 && (
                <span className="text-[var(--danger)] ml-2">
                  {result.failed}건 실패
                </span>
              )}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
