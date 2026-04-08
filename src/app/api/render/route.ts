import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Modality } from "@google/genai";
import {
  buildRenderPrompt,
  buildEditPrompt,
  type PartitionSpec,
  type PartitionPlacement,
} from "@/lib/prompt-builder";
import { checkAuth, checkRateLimit } from "@/lib/api-guard";

export const runtime = "nodejs";
export const maxDuration = 300;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

function withCors(res: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(CORS_HEADERS)) {
    res.headers.set(k, v);
  }
  return res;
}

type Mode = "A" | "B" | "C";

interface RenderRequest {
  mode: Mode;
  spec: PartitionSpec;
  placement?: PartitionPlacement | null;
  imageBase64: string;
  imageMimeType: string;
  drawingBase64?: string;
  drawingMimeType?: string;
  editInstruction?: string;
  count?: number;
}

function getClient() {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY (or GEMINI_API_KEY) is not set");
  }
  return new GoogleGenAI({ apiKey });
}

async function generateWithImagen(
  ai: GoogleGenAI,
  prompt: string,
  count: number,
): Promise<string[]> {
  const result = await ai.models.generateImages({
    model: "imagen-4.0-generate-001",
    prompt,
    config: {
      numberOfImages: count,
      aspectRatio: "4:3",
    },
  });
  return (
    result.generatedImages
      ?.map((g) => g.image?.imageBytes)
      .filter((b): b is string => !!b) ?? []
  );
}

async function generateWithGeminiImage(
  ai: GoogleGenAI,
  prompt: string,
  refImageBase64: string,
  refMimeType: string,
  drawingBase64?: string,
  drawingMimeType?: string,
): Promise<string[]> {
  const parts: Array<
    { text: string } | { inlineData: { data: string; mimeType: string } }
  > = [
    { text: prompt },
    { inlineData: { data: refImageBase64, mimeType: refMimeType } },
  ];
  if (drawingBase64 && drawingMimeType) {
    parts.push({
      text: "The SECOND image below is a DESIGN REFERENCE drawing showing the exact visual appearance of the partition to create (panel count, frame proportions, mullion layout, door position, overall style). Copy the partition's APPEARANCE from this second image into the first image at the magenta rectangle location. Ignore any dimension lines, numbers, measurements, text, or annotations in the second image — use only the visual style and layout. Do NOT copy the second image's background, colors, or anything outside the partition itself.",
    });
    parts.push({
      inlineData: { data: drawingBase64, mimeType: drawingMimeType },
    });
  }
  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: [{ role: "user", parts }],
    config: {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });

  const images: string[] = [];
  const candidates = result.candidates ?? [];
  for (const cand of candidates) {
    for (const part of cand.content?.parts ?? []) {
      if (part.inlineData?.data) {
        images.push(part.inlineData.data);
      }
    }
  }
  return images;
}

export async function POST(req: NextRequest) {
  const authErr = checkAuth(req);
  if (authErr) return withCors(authErr);
  const rateErr = checkRateLimit(req);
  if (rateErr) return withCors(rateErr);
  try {
    const body = (await req.json()) as RenderRequest;
    const {
      mode,
      spec,
      placement,
      imageBase64,
      imageMimeType,
      drawingBase64,
      drawingMimeType,
      editInstruction,
      count = 4,
    } = body;

    if (!imageBase64 || !spec) {
      return withCors(
        NextResponse.json(
          { error: "imageBase64 and spec are required" },
          { status: 400 },
        ),
      );
    }

    const ai = getClient();
    const basePrompt = buildRenderPrompt(spec, placement);

    let images: string[] = [];

    if (mode === "A") {
      images = await generateWithImagen(ai, basePrompt, count);
    } else if (mode === "C") {
      const tasks = Array.from({ length: count }, () =>
        generateWithGeminiImage(
          ai,
          basePrompt,
          imageBase64,
          imageMimeType,
          drawingBase64,
          drawingMimeType,
        ),
      );
      const results = await Promise.all(tasks);
      images = results.flat();
    } else {
      // Mode B: Imagen 4 initial + Gemini Flash Image refinement
      const initial = await generateWithImagen(ai, basePrompt, count);
      const editPrompt = editInstruction
        ? buildEditPrompt(editInstruction)
        : `Refine this rendering to better match the existing space shown in the reference photo. Improve perspective, lighting, and integration with the original room.`;
      const refined = await Promise.all(
        initial.map((img) =>
          generateWithGeminiImage(ai, editPrompt, img, "image/png"),
        ),
      );
      images = refined.flat().length > 0 ? refined.flat() : initial;
    }

    return withCors(
      NextResponse.json({
        mode,
        prompt: basePrompt,
        images: images.map((b64) => `data:image/png;base64,${b64}`),
      }),
    );
  } catch (err) {
    console.error("[/api/render] error", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return withCors(NextResponse.json({ error: message }, { status: 500 }));
  }
}
