"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PartitionSpec, PartitionPlacement } from "./prompt-builder";
import {
  saveSourceImage,
  saveRenderings,
  saveSelected,
  clearImageStore,
  loadSourceImage,
  loadRenderings,
  loadSelected,
} from "./image-store";

export type SourceKind = "photo" | "drawing";

export interface DimensionAnnotation {
  id: string;
  p1: { x: number; y: number };
  p2: { x: number; y: number };
  mm: number;
}

export interface CompletedSegment {
  sourceImage: string;
  sourceMimeType: string;
  renderings: string[];
  selectedRendering: string | null;
  spec: PartitionSpec;
  placement: PartitionPlacement | null;
}

export interface SessionState {
  sourceImage: string | null;
  sourceMimeType: string | null;
  sourceKind: SourceKind | null;
  drawingImage: string | null;
  drawingMimeType: string | null;
  scale: number | null;
  annotations: DimensionAnnotation[];
  placement: PartitionPlacement | null;

  spec: PartitionSpec;

  renderings: string[];
  selectedRendering: string | null;

  dimension: 1 | 2;
  currentSegment: 1 | 2;
  completedSegments: CompletedSegment[];

  setSource: (img: string, mime: string, kind: SourceKind) => void;
  setDrawing: (img: string | null, mime: string | null) => void;
  setScale: (scale: number) => void;
  addAnnotation: (a: DimensionAnnotation) => void;
  removeAnnotation: (id: string) => void;
  setPlacement: (p: PartitionPlacement | null) => void;
  setSpec: (spec: Partial<PartitionSpec>) => void;
  setRenderings: (imgs: string[]) => void;
  selectRendering: (img: string) => void;
  setDimension: (d: 1 | 2) => void;
  saveCurrentAsSegment: () => void;
  setCurrentSegment: (n: 1 | 2) => void;
  reset: () => void;
  hydrateImages: () => Promise<void>;
}

const DEFAULT_SPEC: PartitionSpec = {
  siteWidthMm: 4000,
  siteHeightMm: 2700,
  panelWidthMm: 1000,
  panelCount: 4,
  heightMm: 2400,
  depthMm: 80,
  frameColor: "black",
  frameTier: 1,
  doorPanelIndex: 2,
  startSide: "right",
  notes: "",
};

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      sourceImage: null,
      sourceMimeType: null,
      sourceKind: null,
      drawingImage: null,
      drawingMimeType: null,
      scale: null,
      annotations: [],
      placement: null,
      spec: DEFAULT_SPEC,
      renderings: [],
      selectedRendering: null,
      dimension: 1,
      currentSegment: 1,
      completedSegments: [],

      setDimension: (d) =>
        set({
          dimension: d,
          currentSegment: 1,
          completedSegments: [],
        }),
      setCurrentSegment: (n) => set({ currentSegment: n }),
      saveCurrentAsSegment: () =>
        set((s) => {
          if (!s.sourceImage || !s.sourceMimeType) return s;
          const segment: CompletedSegment = {
            sourceImage: s.sourceImage,
            sourceMimeType: s.sourceMimeType,
            renderings: s.renderings,
            selectedRendering: s.selectedRendering,
            spec: s.spec,
            placement: s.placement,
          };
          return {
            completedSegments: [...s.completedSegments, segment],
            sourceImage: null,
            sourceMimeType: null,
            sourceKind: null,
            placement: null,
            scale: null,
            annotations: [],
            renderings: [],
            selectedRendering: null,
          };
        }),

      setSource: (img, mime, kind) => {
        set({
          sourceImage: img,
          sourceMimeType: mime,
          sourceKind: kind,
          drawingImage: null,
          drawingMimeType: null,
          annotations: [],
          scale: null,
          placement: null,
          renderings: [],
          selectedRendering: null,
        });
        void saveSourceImage(img, mime);
        void saveRenderings([]);
        void saveSelected(null);
      },
      setDrawing: (img, mime) => set({ drawingImage: img, drawingMimeType: mime }),
      setScale: (scale) => set({ scale }),
      addAnnotation: (a) =>
        set((s) => ({ annotations: [...s.annotations, a] })),
      removeAnnotation: (id) =>
        set((s) => ({ annotations: s.annotations.filter((a) => a.id !== id) })),
      setPlacement: (p) => set({ placement: p }),
      setSpec: (spec) => set((s) => ({ spec: { ...s.spec, ...spec } })),
      setRenderings: (imgs) => {
        set({ renderings: imgs, selectedRendering: imgs[0] ?? null });
        const wrapped = imgs.map((dataUrl) => ({
          dataUrl,
          mime: dataUrl.match(/data:(.*?);/)?.[1] ?? "image/png",
        }));
        void saveRenderings(wrapped);
        void saveSelected(wrapped[0] ?? null);
      },
      selectRendering: (img) => {
        set({ selectedRendering: img });
        void saveSelected({
          dataUrl: img,
          mime: img.match(/data:(.*?);/)?.[1] ?? "image/png",
        });
      },
      reset: () => {
        set({
          sourceImage: null,
          sourceMimeType: null,
          sourceKind: null,
          drawingImage: null,
          drawingMimeType: null,
          scale: null,
          annotations: [],
          placement: null,
          spec: DEFAULT_SPEC,
          renderings: [],
          selectedRendering: null,
          dimension: 1,
          currentSegment: 1,
          completedSegments: [],
        });
        void clearImageStore();
      },
      hydrateImages: async () => {
        const [src, rends, sel] = await Promise.all([
          loadSourceImage(),
          loadRenderings(),
          loadSelected(),
        ]);
        set((s) => ({
          sourceImage: s.sourceImage ?? src?.dataUrl ?? null,
          sourceMimeType: s.sourceMimeType ?? src?.mime ?? null,
          renderings:
            s.renderings.length > 0 ? s.renderings : rends.map((r) => r.dataUrl),
          selectedRendering: s.selectedRendering ?? sel?.dataUrl ?? null,
        }));
      },
    }),
    {
      name: "hwadam-session",
      version: 4,
      migrate: (persistedState: unknown, version: number) => {
        const state = (persistedState ?? {}) as Partial<SessionState>;
        if (version < 2) {
          return { ...state, spec: DEFAULT_SPEC, placement: null };
        }
        if (version < 3) {
          return {
            ...state,
            dimension: 1 as const,
            currentSegment: 1 as const,
            completedSegments: [],
          };
        }
        if (version < 4) {
          return {
            ...state,
            spec: { ...DEFAULT_SPEC, ...(state.spec ?? {}), startSide: "right" as const },
          };
        }
        return state;
      },
      partialize: (s) => ({
        spec: s.spec,
        scale: s.scale,
        annotations: s.annotations,
        placement: s.placement,
        dimension: s.dimension,
        currentSegment: s.currentSegment,
      }),
    },
  ),
);
