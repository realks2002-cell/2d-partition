import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Modality } from "@google/genai";
import {
  buildRenderPrompt,
  buildEditPrompt,
  buildDrawingPrompt,
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
  drawingBase64B?: string;
  drawingMimeTypeB?: string;
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
  drawingABase64?: string,
  drawingAMimeType?: string,
  drawingBBase64?: string,
  drawingBMimeType?: string,
): Promise<string[]> {
  const parts: Array<
    { text: string } | { inlineData: { data: string; mimeType: string } }
  > = [
    { text: prompt },
    { inlineData: { data: refImageBase64, mimeType: refMimeType } },
  ];
  if (drawingABase64 && drawingAMimeType) {
    parts.push({
      inlineData: { data: drawingABase64, mimeType: drawingAMimeType },
    });
  }
  if (drawingBBase64 && drawingBMimeType) {
    parts.push({
      inlineData: { data: drawingBBase64, mimeType: drawingBMimeType },
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
  const auth = await checkAuth(req);
  if (auth instanceof NextResponse) return withCors(auth);
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
      drawingBase64B,
      drawingMimeTypeB,
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

    const isCorner = !!(spec.wallB && placement?.wallB);
    const hasDrawingA = !!(drawingBase64 && drawingMimeType);
    const hasDrawingB = !!(drawingBase64B && drawingMimeTypeB);
    const useDrawingMode = !editInstruction && (hasDrawingA || hasDrawingB);

    if (useDrawingMode && isCorner && !(hasDrawingA && hasDrawingB)) {
      return withCors(
        NextResponse.json(
          { error: "ㄴ 형태는 벽 A, B 도면을 모두 올려야 합니다" },
          { status: 400 },
        ),
      );
    }
    if (useDrawingMode && !isCorner && !hasDrawingA) {
      return withCors(
        NextResponse.json(
          { error: "도면 A가 필요합니다" },
          { status: 400 },
        ),
      );
    }

    const ai = getClient();
    const basePrompt = useDrawingMode
      ? buildDrawingPrompt(spec.frameColor, placement, isCorner)
      : buildRenderPrompt(spec, placement);

    let images: string[] = [];

    if (mode === "A") {
      images = await generateWithImagen(ai, basePrompt, count);
    } else if (mode === "C") {
      const prompt = editInstruction
        ? buildEditPrompt(editInstruction)
        : basePrompt;
      const tasks = Array.from({ length: count }, () =>
        generateWithGeminiImage(
          ai,
          prompt,
          imageBase64,
          imageMimeType,
          editInstruction ? undefined : drawingBase64,
          editInstruction ? undefined : drawingMimeType,
          editInstruction ? undefined : drawingBase64B,
          editInstruction ? undefined : drawingMimeTypeB,
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
