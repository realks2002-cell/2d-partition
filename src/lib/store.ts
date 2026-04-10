"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  PartitionSpec,
  PartitionPlacement,
  WallSpec,
} from "./prompt-builder";
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

  setSource: (img: string, mime: string, kind: SourceKind) => void;
  setDrawing: (img: string | null, mime: string | null) => void;
  setScale: (scale: number) => void;
  addAnnotation: (a: DimensionAnnotation) => void;
  removeAnnotation: (id: string) => void;
  setPlacement: (p: PartitionPlacement | null) => void;
  setSpec: (spec: Partial<PartitionSpec>) => void;
  setWallB: (wall: Partial<WallSpec>) => void;
  setRenderings: (imgs: string[]) => void;
  selectRendering: (img: string) => void;
  setDimension: (d: 1 | 2) => void;
  reset: () => void;
  hydrateImages: () => Promise<void>;
}

const DEFAULT_WALL_B: WallSpec = {
  siteWidthMm: 4000,
  panelWidthMm: 800,
  panelCount: 5,
  doorPanelIndex: 0,
  startSide: "left",
};

const DEFAULT_SPEC: PartitionSpec = {
  siteHeightMm: 2700,
  heightMm: 2400,
  depthMm: 80,
  frameColor: "black",
  frameTier: 1,
  siteWidthMm: 4000,
  panelWidthMm: 800,
  panelCount: 5,
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

      setDimension: (d) =>
        set((s) => ({
          dimension: d,
          spec:
            d === 2
              ? { ...s.spec, wallB: s.spec.wallB ?? { ...DEFAULT_WALL_B } }
              : { ...s.spec, wallB: undefined },
          placement: null,
        })),

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
      setWallB: (wall) =>
        set((s) => ({
          spec: {
            ...s.spec,
            wallB: { ...(s.spec.wallB ?? DEFAULT_WALL_B), ...wall },
          },
        })),
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
      version: 7,
      migrate: (persistedState: unknown, version: number) => {
        const state = (persistedState ?? {}) as Record<string, unknown>;
        if (version < 2) {
          return { ...state, spec: DEFAULT_SPEC, placement: null };
        }
        if (version < 3) {
          return { ...state, dimension: 1 };
        }
        if (version < 4) {
          const prevSpec = (state.spec as Partial<PartitionSpec>) ?? {};
          return {
            ...state,
            spec: { ...DEFAULT_SPEC, ...prevSpec, startSide: "right" },
          };
        }
        if (version < 5) {
          // v4 → v5: remove currentSegment/completedSegments, ensure wallB default
          const { currentSegment, completedSegments, ...rest } = state;
          void currentSegment;
          void completedSegments;
          const prevSpec = (rest.spec as Partial<PartitionSpec>) ?? {};
          return {
            ...rest,
            spec: { ...DEFAULT_SPEC, ...prevSpec, wallB: undefined },
            dimension: 1,
          };
        }
        if (version < 6) {
          // v5 → v6: reset panelCount default to 5 (was 4)
          return { ...state, spec: DEFAULT_SPEC };
        }
        if (version < 7) {
          // v6 → v7: force reset spec to new defaults (panelCount 5, panelWidth 800)
          return { ...state, spec: DEFAULT_SPEC, placement: null };
        }
        return state;
      },
      partialize: (s) => ({
        spec: s.spec,
        scale: s.scale,
        annotations: s.annotations,
        placement: s.placement,
        dimension: s.dimension,
      }),
    },
  ),
);
