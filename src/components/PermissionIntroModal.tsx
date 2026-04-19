"use client";

import { Camera, Image as ImageIcon, ShieldCheck } from "lucide-react";
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
  onCancel: () => void;
  onAllow: () => void;
}

export default function PermissionIntroModal({ open, onCancel, onAllow }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-md bg-white rounded-2xl p-0 gap-0 [&>button]:hidden">
        <div className="p-6">
          <DialogHeader className="text-left mb-4">
            <div className="iso-eyebrow mb-2">CAMERA & PHOTOS</div>
            <DialogTitle className="text-[20px] font-bold tracking-tight">
              카메라·사진 접근 권한이 필요합니다
            </DialogTitle>
            <DialogDescription className="sr-only">
              이 앱이 카메라와 사진 라이브러리에 접근하려는 이유를 설명합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mb-5">
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
                <Camera size={16} className="text-neutral-700" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-bold">현장 사진 촬영</div>
                <p className="text-[12px] text-neutral-600 leading-[1.55]">
                  파티션 설치 전 실내 공간을 촬영해 렌더링 기반 이미지로 사용합니다.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
                <ImageIcon size={16} className="text-neutral-700" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-bold">기존 사진 선택</div>
                <p className="text-[12px] text-neutral-600 leading-[1.55]">
                  이미 촬영한 현장 사진을 갤러리에서 선택해 렌더링에 사용할 수 있습니다.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                <ShieldCheck size={16} className="text-emerald-600" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-bold text-emerald-700">서버에 저장하지 않음</div>
                <p className="text-[12px] text-neutral-600 leading-[1.55]">
                  선택·촬영한 이미지는 렌더링 처리 후 즉시 폐기되며 저장되지 않습니다.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              onClick={onAllow}
              className="w-full h-11 bg-neutral-900 hover:bg-[#d43e76] text-white text-[12px] font-bold uppercase tracking-[0.05em] rounded-lg"
            >
              계속하기 →
            </Button>
            <button
              onClick={onCancel}
              className="w-full h-9 text-[12px] text-neutral-400 hover:text-neutral-900 transition-colors"
            >
              나중에
            </button>
          </div>

          <p className="text-[10px] text-neutral-400 text-center mt-4">
            권한은 OS 설정에서 언제든지 변경할 수 있습니다.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
