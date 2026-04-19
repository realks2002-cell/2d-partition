"use client";

import { useCallback, useState } from "react";
import { isNative } from "@/lib/native-io";

const ACK_KEY = "camera_intro_ack";

export function useCameraGate() {
  const [open, setOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const triggerCamera = useCallback((action: () => void) => {
    // 웹: OS 권한 프롬프트가 브라우저에서 충분 → 바로 실행
    if (!isNative()) {
      action();
      return;
    }
    // 이미 설명을 본 사용자는 바로 실행
    try {
      if (localStorage.getItem(ACK_KEY) === "1") {
        action();
        return;
      }
    } catch {}
    setPendingAction(() => action);
    setOpen(true);
  }, []);

  const allow = useCallback(() => {
    try {
      localStorage.setItem(ACK_KEY, "1");
    } catch {}
    setOpen(false);
    const fn = pendingAction;
    setPendingAction(null);
    fn?.();
  }, [pendingAction]);

  const cancel = useCallback(() => {
    setOpen(false);
    setPendingAction(null);
  }, []);

  return { open, triggerCamera, allow, cancel };
}
