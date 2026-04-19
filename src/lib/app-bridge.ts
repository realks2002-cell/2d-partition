"use client";

import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { App, type URLOpenListenerEvent } from "@capacitor/app";
import { apiUrl, authHeaders, getToken, saveToken, saveUser } from "@/lib/api-client";
import { getDeviceId } from "@/lib/device-id";

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "https://xn--h32bo0e8pg.com";
const APP_SCHEME = "kanmakigo";

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * 앱에서 웹 pricing 페이지를 Custom Tabs로 엶.
 * 이미 앱 JWT가 있으면 60초 exchange token을 발급받아 URL에 첨부.
 */
export async function openPricingInBrowser(): Promise<void> {
  if (!isNative()) {
    window.location.href = `${WEB_URL}/pricing`;
    return;
  }

  let url = `${WEB_URL}/pricing?from=app`;
  if (getToken()) {
    try {
      const res = await fetch(apiUrl("/api/auth/exchange-token"), {
        method: "POST",
        headers: authHeaders(),
      });
      if (res.ok) {
        const { exchange_token } = await res.json();
        if (exchange_token) {
          // Fragment(#)에 담아 referrer/server log 유출 방지
          url = `${WEB_URL}/pricing?from=app#t=${encodeURIComponent(exchange_token)}`;
        }
      }
    } catch {}
  }

  await Browser.open({ url, presentationStyle: "fullscreen" });
}

let listenerInitialized = false;

/**
 * 앱 전역에서 한 번만 호출. 딥링크 수신 시 토큰 갱신 + Browser 닫기.
 * kanmakigo://payment/success?token=<newJwt>
 */
export function initAppUrlListener(): () => void {
  if (typeof window === "undefined") return () => {};
  if (!isNative()) return () => {};
  if (listenerInitialized) return () => {};
  listenerInitialized = true;

  const SUCCESS_PREFIX = `${APP_SCHEME}://payment/success`;

  const handle = App.addListener("appUrlOpen", async (event: URLOpenListenerEvent) => {
    try {
      if (!event.url.startsWith(SUCCESS_PREFIX)) return;

      let code: string | null = null;
      try {
        const u = new URL(event.url);
        code = u.searchParams.get("code");
      } catch {
        const qs = event.url.split("?")[1] ?? "";
        code = new URLSearchParams(qs).get("code");
      }

      if (code) {
        const prev = getToken();
        try {
          const deviceId = await getDeviceId();
          const res = await fetch(apiUrl("/api/auth/app-claim"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, device_id: deviceId }),
          });
          if (!res.ok) throw new Error("claim failed");
          const data = await res.json();
          if (!data.token || !data.user) throw new Error("invalid response");
          saveToken(data.token);
          saveUser(data.user);
          window.dispatchEvent(new Event("quota-changed"));
        } catch {
          if (prev) saveToken(prev);
        }
      }

      try {
        await Browser.close();
      } catch {}
    } catch {}
  });

  return () => {
    handle.then((h) => h.remove()).catch(() => {});
    listenerInitialized = false;
  };
}
