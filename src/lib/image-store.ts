"use client";

import { get, set, del, createStore } from "idb-keyval";

const store = createStore("hwadam-images", "kv");

const KEYS = {
  source: "source",
  renderings: "renderings",
  selected: "selected",
} as const;

export async function saveSourceImage(dataUrl: string, mime: string) {
  await set(KEYS.source, { dataUrl, mime }, store);
}

export async function loadSourceImage(): Promise<{
  dataUrl: string;
  mime: string;
} | null> {
  return (await get(KEYS.source, store)) ?? null;
}

export async function saveRenderings(images: { dataUrl: string; mime: string }[]) {
  await set(KEYS.renderings, images, store);
}

export async function loadRenderings(): Promise<
  { dataUrl: string; mime: string }[]
> {
  return (await get(KEYS.renderings, store)) ?? [];
}

export async function saveSelected(image: { dataUrl: string; mime: string } | null) {
  if (image) {
    await set(KEYS.selected, image, store);
  } else {
    await del(KEYS.selected, store);
  }
}

export async function loadSelected(): Promise<{
  dataUrl: string;
  mime: string;
} | null> {
  return (await get(KEYS.selected, store)) ?? null;
}

export async function clearImageStore() {
  await Promise.all([
    del(KEYS.source, store),
    del(KEYS.renderings, store),
    del(KEYS.selected, store),
  ]);
}
