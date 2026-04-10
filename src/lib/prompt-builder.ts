export type PanelWidthMm = number;
export type FrameColor = "black" | "white" | "dark-gray";
export type FrameTier = 1 | 2;
export type StartSide = "left" | "right" | "center";

export interface WallPlacement {
  // normalized 0..1 image coordinates — bottom line
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  // optional top line (for perspective trapezoid)
  topX1?: number;
  topY1?: number;
  topX2?: number;
  topY2?: number;
}

// 1D: flat WallPlacement. 2D corner: wallB holds the second wall.
export interface PartitionPlacement extends WallPlacement {
  wallB?: WallPlacement;
}

export interface WallSpec {
  siteWidthMm: number;
  panelWidthMm: number;
  panelCount: number;
  doorPanelIndex: number;
  startSide: StartSide;
}

export interface PartitionSpec {
  // Shared
  siteHeightMm: number;
  heightMm: number;
  depthMm: number;
  frameColor: FrameColor;
  frameTier: FrameTier;
  notes?: string;

  // Wall A (also used as the single wall in 1D mode)
  siteWidthMm: number;
  panelWidthMm: PanelWidthMm;
  panelCount: number;
  doorPanelIndex: number; // 1-based; 0 = no door
  startSide: StartSide;

  // Wall B (2D corner mode only)
  wallB?: WallSpec;
}

const FRAME_COLOR_LABEL: Record<FrameColor, string> = {
  black: "matte black",
  white: "matte white",
  "dark-gray": "dark graphite gray (near-black)",
};

export function totalWidthMm(spec: PartitionSpec): number {
  return spec.panelCount * spec.panelWidthMm;
}

export function wallTotalWidthMm(wall: WallSpec): number {
  return wall.panelCount * wall.panelWidthMm;
}

function describeTier(frameTier: FrameTier): string {
  return frameTier === 1
    ? "ONE-TIER (1단) construction: each glass panel is ONE SINGLE CONTINUOUS clear glass pane from floor to the very top of the partition. There are ZERO horizontal mullions inside the partition — no transom, no middle rail, no bottom rail, no header, no divider of any kind horizontally. Only vertical mullions between panels. Count of horizontal bars inside the glass area: EXACTLY ZERO."
    : "TWO-TIER (2단) construction with HEADER BAR NEAR THE TOP: there is EXACTLY ONE horizontal steel mullion, and it is positioned NEAR THE TOP of the partition — specifically at about 20% down from the top edge (NOT in the middle, NOT at 50%). This creates a SHORT NARROW upper section (only ~20% of total partition height, like a header/transom strip) and a MUCH LARGER lower section (~80% of total partition height, the main glass area). The upper section must be clearly the SHORTER one, the lower section must be clearly the TALLER one — the ratio is roughly 1:4. CRITICAL: the horizontal bar is NOT centered, NOT at mid-height, NOT at 50%. It is near the TOP only. NO other horizontal bars, NO bottom rail, NO middle rail, NO additional dividers. Both sections are CLEAR transparent glass. Exactly 2 horizontal glass strips per panel — a short one on top, a tall one below.";
}

function describeWall(
  label: "A" | "B",
  panelCount: number,
  panelWidthMm: number,
  doorPanelIndex: number,
): string {
  const widthMm = panelCount * panelWidthMm;
  const doorText =
    doorPanelIndex >= 1
      ? `Wall ${label} has a SINGLE hinged swing door at panel #${doorPanelIndex} (numbered 1 to ${panelCount} from left to right within Wall ${label}'s own magenta region). The door is floor-to-top, full height, with a single large clear glass pane, visible metal handle, and visible hinges. All other panels in Wall ${label} are fixed glass without doors.`
      : `Wall ${label} has NO door — every panel is fixed glass, no openings, no handles, no hinges.`;
  return `Wall ${label}: ${panelCount} equal vertical panels, each approximately ${panelWidthMm}mm wide, total ${widthMm}mm. ${doorText}`;
}

export function buildRenderPrompt(
  spec: PartitionSpec,
  placement?: PartitionPlacement | null,
): string {
  const {
    siteHeightMm,
    heightMm,
    depthMm,
    frameColor,
    frameTier,
    notes,
  } = spec;

  const isTwoWall = !!(spec.wallB && placement?.wallB);
  const frameColorLabel = FRAME_COLOR_LABEL[frameColor];
  const tierDesc = describeTier(frameTier);

  // ========== 2-WALL (CORNER) MODE ==========
  if (isTwoWall && placement?.wallB && spec.wallB) {
    const wallA = {
      panelCount: spec.panelCount,
      panelWidthMm: spec.panelWidthMm,
      doorPanelIndex: spec.doorPanelIndex,
      siteWidthMm: spec.siteWidthMm,
    };
    const wallB = spec.wallB;

    const isQuadA =
      placement.topX1 !== undefined &&
      placement.topY1 !== undefined &&
      placement.topX2 !== undefined &&
      placement.topY2 !== undefined;
    const isQuadB =
      placement.wallB.topX1 !== undefined &&
      placement.wallB.topY1 !== undefined &&
      placement.wallB.topX2 !== undefined &&
      placement.wallB.topY2 !== undefined;

    const parts: string[] = [
      `TASK: This is a strict IMAGE EDITING task on a CORNER PHOTO showing TWO perpendicular walls meeting at an inside corner (ㄴ/L-shape). Your job is to install TWO SEPARATE glass partitions — one on Wall A and one on Wall B — in a single edit. Start from the exact reference photo pixels and only ADD the two partitions. Do NOT regenerate, redraw, or reinterpret the space. Preserve 100% of the reference photo's pixels except where the new partitions are placed.`,
      `HANDLING USER MARKUP: Any hand-drawn colored lines or marks on the reference photo are USER INSTRUCTIONS indicating WHERE to place the partitions. Do NOT render those marks in the output — remove them and replace with the actual partition geometry.`,
      `PLACEMENT PLACEHOLDERS (CRITICAL — TWO INDEPENDENT REGIONS DISTINGUISHED BY COLOR): The reference photo has been marked with UI overlays showing exactly how to build BOTH partitions. The two partition regions are distinguished ONLY by their fill color: (1) The BRIGHT MAGENTA/PINK semi-transparent ${isQuadA ? "QUADRILATERAL" : "RECTANGLE"} marks Wall A's partition footprint (the left wall in the corner). (2) The BRIGHT CYAN semi-transparent ${isQuadB ? "QUADRILATERAL" : "RECTANGLE"} marks Wall B's partition footprint (the right wall in the corner). These are TWO INDEPENDENT partitions — each must be rendered separately inside its own colored marker. Inside each marker there are dark ${frameColorLabel}-colored thin vertical lines marking the vertical mullion positions for that wall, and if present, a dark horizontal line marking the single horizontal mullion. A thicker dark rectangle inside one panel marks the door position for that wall. PROCEDURE: Replace both the magenta fill AND the cyan fill (and their dashed outlines, corner markers, white halos) with photorealistic glass partitions — each with clear tempered glass and a ${frameColorLabel} steel frame. The two partitions meet at the inside corner of the room. The areas OUTSIDE both colored markers must remain IDENTICAL to the original reference photo pixels. ALL frame elements on BOTH walls MUST use ONE SINGLE uniform color: ${frameColorLabel}. COMPLETELY REMOVE all magenta, cyan, pink, and white halo colors from the output — ZERO colored overlay artifacts may remain. ALL glass must be CLEAR TRANSPARENT — never blue, never tinted, never cyan. DO NOT render any letters, text, labels, or characters anywhere in the output image — the output must contain NO alphabetic characters of any kind.`,
      `The reference photo shows an interior corner. The wall ceiling height is ${siteHeightMm}mm.`,
      `ABSOLUTE PRESERVATION RULES — these elements from the reference photo MUST remain pixel-accurately identical: the inside corner line, all walls, ceiling, floor, all existing doors, windows, fixtures, furniture, outlets, light sources, shadows, reflections, wall colors and textures, floor material and pattern.`,
      `DO NOT extend, crop, widen, or reframe the image. Keep the exact same camera position, focal length, aspect ratio, and framing.`,
      `PARTITIONS TO ADD — TWO SEPARATE PARTITIONS:`,
      describeWall("A", wallA.panelCount, wallA.panelWidthMm, wallA.doorPanelIndex),
      describeWall("B", wallB.panelCount, wallB.panelWidthMm, wallB.doorPanelIndex),
      `- Both partitions share the same partition height: ${heightMm}mm, depth ${depthMm}mm, material: tempered clear glass panels with a steel frame (fixed). GLASS RENDERING (CRITICAL FOR REALISM): Each glass panel must look like REAL 10-12mm tempered glass — NOT frosted, NOT opaque, NOT a solid color. Render these visual properties: (1) HIGH TRANSPARENCY — wall, floor, objects behind visible through the glass. (2) SURFACE REFLECTIONS — subtle mirror-like reflections of the room (ceiling lights, windows). (3) EDGE HIGHLIGHT — thin bright green-blue line where glass meets the steel frame. (4) SPECULAR HIGHLIGHTS — small bright spots where light sources reflect. (5) SLIGHT GREEN TINT at the edges. (6) Glass is almost invisible except for its reflections, highlights, and steel frame.`,
      `- Frame color for BOTH walls: ${frameColorLabel}.`,
      `- Frame style for BOTH walls: ${tierDesc}`,
      `- Vertical mullions between every panel are clearly visible on BOTH walls.`,
      `- Both partitions' bases must sit on the existing floor line. The two partitions meet at the inside corner so that Wall A's right edge (or left edge depending on orientation) and Wall B's adjacent edge touch the corner. Glass reflections and shadows must match the existing lighting in the reference photo.`,
      `COLOR UNIFORMITY (CRITICAL): Every single frame element on BOTH partitions — outer perimeters, every vertical mullion, horizontal mullions (if 2단), door frames — MUST be the EXACT SAME color: ${frameColorLabel}. No white parts, no silver parts, no lighter or darker shades.`,
      `FORBIDDEN: do NOT change camera angle; do NOT add perspective distortion; do NOT remove, move, or alter any existing element; do NOT change wall colors or textures; do NOT extend the room; do NOT replace walls with the partitions; do NOT add people, text, logos, letters, alphabetic characters, or watermarks; do NOT leave any magenta, pink, cyan, or neon colors in the output. If you see any letter or character in the input overlays (like "A", "B", or any text), do NOT copy it to the output — these are UI markers that must be completely erased.`,
      notes ? `Additional requirements: ${notes}` : "",
    ];
    return parts.filter(Boolean).join(" ");
  }

  // ========== 1-WALL (SINGLE) MODE — existing logic ==========
  const {
    siteWidthMm,
    panelWidthMm,
    panelCount,
    doorPanelIndex,
    startSide,
  } = spec;

  const widthMm = totalWidthMm(spec);
  const widthRatio = siteWidthMm > 0 ? widthMm / siteWidthMm : 0;
  const heightRatio = siteHeightMm > 0 ? heightMm / siteHeightMm : 0;
  const widthPct = Math.round(widthRatio * 100);
  const heightPct = Math.round(heightRatio * 100);
  const corridorMm = Math.max(0, siteWidthMm - widthMm);
  const hasCorridor = corridorMm > 0;
  const oppositeSide =
    startSide === "left" ? "right" : startSide === "right" ? "left" : "both sides";
  const corridorDesc = hasCorridor
    ? `PARTIAL WALL PARTITION (CRITICAL): The wall in the reference photo is ${siteWidthMm}mm wide, but the partition only covers ${widthMm}mm starting from the ${startSide} side of the wall. The remaining ${corridorMm}mm on the ${oppositeSide} side is an OPEN CORRIDOR/PASSAGE with absolutely NO partition — leave that corridor area exactly as the original photo (walls, floor, ceiling untouched, open space). Only install the glass partition within the magenta rectangle area, never beyond it.`
    : "";

  const isQuad =
    !!placement &&
    placement.topX1 !== undefined &&
    placement.topY1 !== undefined &&
    placement.topX2 !== undefined &&
    placement.topY2 !== undefined;
  const shapeWord = isQuad ? "QUADRILATERAL (4-sided perspective polygon)" : "RECTANGLE";
  const placementDesc = placement
    ? `PLACEMENT PLACEHOLDER WITH INTERNAL STRUCTURE (CRITICAL — FOLLOW EXACTLY): The reference photo has been marked with UI overlays showing exactly how to build the partition. YOU MUST READ THESE VISUAL MARKERS: (A) A BRIGHT MAGENTA semi-transparent ${shapeWord} marks the overall partition footprint in the photo's perspective. ${isQuad ? "The magenta shape is a 4-corner polygon that follows the perspective of the room. It is NOT an axis-aligned rectangle; it is projected to match the 3D perspective of the space." : ""} (B) Inside the shape, dark ${frameColorLabel}-colored thin VERTICAL LINES mark where each vertical steel mullion must go — count them and place a mullion at each one. (C) If a dark HORIZONTAL LINE exists inside the shape, it marks the ONE horizontal mullion position. If none, there are ZERO horizontal mullions. (D) A thicker dark rectangle inside one panel marks the door position — the swing door goes in that exact panel. Its glass is CLEAR TRANSPARENT like the other panels, only the frame outline is visible. PROCEDURE: (1) Replace the magenta fill and its dashed outline with a photorealistic glass partition — the inside of the magenta area becomes clear tempered glass with a ${frameColorLabel} steel frame around the perimeter. (2) The dark mullion lines already inside the shape are the CORRECT mullion positions in the final color — render steel mullions along them. You may leave those dark lines as-is; they represent the final frame color. (3) Place the swing door exactly in the cyan highlighted column. (4) The partition in the output must fill the magenta shape pixel-for-pixel — do NOT shift, resize, rotate, or reposition. ${isQuad ? "Respect the trapezoidal outline — the partition is a flat rectangle in 3D but projects to this shape in the photo's perspective." : ""} (5) ALL frame elements MUST use ONE SINGLE uniform color: ${frameColorLabel}. No white bars, no silver, no mixed colors. (6) COMPLETELY REMOVE all magenta fill, magenta dashed outline, white halo, and corner L-markers from the output. ZERO magenta artifacts may remain. ALL door and panel glass must be CLEAR TRANSPARENT — never blue, never tinted, never cyan. If you see any cyan or blue tint in the door area, it is a UI marker and must be replaced with clear glass. (7) The area OUTSIDE the magenta shape must remain IDENTICAL to the original reference photo pixels.`
    : "";

  const parts: string[] = [
    `TASK: This is a strict IMAGE EDITING task. Start from the exact reference photo pixels and only ADD a new office partition. Do NOT regenerate, redraw, or reinterpret the space. Preserve 100% of the reference photo's pixels except where the new partition is placed.`,
    `HANDLING USER MARKUP: Any hand-drawn colored lines or marks on the reference photo (orange, red, blue, etc.) are USER INSTRUCTIONS indicating WHERE to place the partition. Do NOT render those marks in the output — remove them and replace with the actual partition geometry.`,
    placementDesc,
    corridorDesc,
    `The reference photo is a STRAIGHT-ON FRONT ELEVATION view (not a perspective view) of an interior space with real dimensions ${siteWidthMm}mm wide x ${siteHeightMm}mm tall.`,
    `ABSOLUTE PRESERVATION RULES — these elements from the reference photo MUST remain pixel-accurately identical: left wall, right wall, back wall, ceiling, floor, all existing doors, windows, fixtures, furniture, outlets, light sources, shadows, reflections, wall colors and textures, floor material and pattern. If the original photo shows walls on the left and right sides of the frame, those walls MUST remain visible at the exact same position and width.`,
    `DO NOT extend, crop, widen, or reframe the image. Keep the exact same camera position, focal length, aspect ratio, and framing.`,
    `PARTITION TO ADD:`,
    `- ${panelCount} equal vertical panels, each approximately ${panelWidthMm}mm wide (total ${widthMm}mm wide).`,
    `- Height: ${heightMm}mm, Depth: ${depthMm}mm.`,
    `- Material: tempered clear glass panels with a steel frame (fixed). GLASS RENDERING (CRITICAL FOR REALISM): Each glass panel must look like REAL 10-12mm tempered glass — NOT frosted, NOT opaque, NOT a solid color. Render these visual properties: (1) HIGH TRANSPARENCY: the wall, floor, and objects behind the partition must be clearly visible THROUGH the glass, only slightly softened. (2) SURFACE REFLECTIONS: subtle mirror-like reflections of the room (ceiling lights, windows, nearby objects) on the glass surface, especially at oblique viewing angles. The reflections should be soft and semi-transparent, not mirror-sharp. (3) EDGE HIGHLIGHT: where glass panels meet the steel frame, show a thin bright edge catch (the glass edge refracts light and appears as a thin bright green-blue line). (4) SPECULAR HIGHLIGHTS: small bright spots or streaks where direct light sources (overhead lights, windows) reflect off the glass surface. (5) SLIGHT GREEN TINT: real tempered glass has a very subtle green tint visible at the edges and where glass overlaps — include this. (6) The overall effect should be that the glass is almost invisible except for its reflections, highlights, and the steel frame holding it.`,
    `- Frame color: ${frameColorLabel}.`,
    `- Frame style: ${tierDesc}.`,
    `- Vertical mullions between every panel are clearly visible.`,
    doorPanelIndex >= 1
      ? `- DOOR POSITION (CRITICAL): Number the panels from 1 to ${panelCount}, starting at panel 1 on the FAR LEFT side of the partition (the viewer's left, the side with the smallest x-coordinate) and ending at panel ${panelCount} on the FAR RIGHT side. The hinged SWING door MUST occupy panel #${doorPanelIndex} ONLY. The door's left edge is at ${(((doorPanelIndex - 1) / panelCount) * 100).toFixed(1)}% of the partition's total width measured from the partition's left edge, and the door's right edge is at ${((doorPanelIndex / panelCount) * 100).toFixed(1)}%. Do NOT place the door at any other panel. All other panels are fixed glass without doors.`
      : `- NO DOOR: The partition has NO door of any kind. EVERY panel is fixed glass. Do NOT add any hinged door, sliding door, opening, handle, or hinges anywhere on the partition. The partition is a continuous fixed glass wall with no openings.`,
    doorPanelIndex >= 1
      ? `- DOOR GEOMETRY (CRITICAL): The door is a SINGLE hinged swing door (one leaf) — floor to the top of the partition, full height. The door has its own clean frame (two vertical stiles + top rail + bottom rail) and contains ONE single large clear glass pane with NO horizontal divisions inside the door (even if the rest of the partition is 2단, the door glass is NOT divided). The door has a visible metal handle on one vertical side and visible hinges on the other vertical side. The door frame uses the same ${frameColorLabel} steel as the rest of the partition.`
      : "",
    widthRatio && heightRatio && !placement
      ? `The partition must occupy approximately ${widthPct}% of the total image width and ${heightPct}% of the total image height, centered horizontally between the existing left and right walls.`
      : "",
    `The partition's base must sit on the existing floor line. Glass reflections, refractions, and shadows must match the existing lighting in the reference photo. The glass must be TRANSPARENT — the space behind the partition must be visible through it. If there are ceiling lights or windows in the photo, show their reflections as soft bright patches on the glass surface.`,
    `COLOR UNIFORMITY (CRITICAL): Every single frame element of the partition — the outer perimeter frame, every vertical mullion, the horizontal mullion (if 2단), the door frame (stiles, top rail, bottom rail) — MUST be the EXACT SAME color: ${frameColorLabel}. No white parts, no silver parts, no lighter shade, no darker shade, no mixed colors. One single uniform ${frameColorLabel} for every frame piece. Do NOT use white for the horizontal bar even if there is wall behind it.`,
    `FORBIDDEN: do NOT change camera angle; do NOT add perspective distortion; do NOT remove, move, or alter any existing element; do NOT change wall colors or textures; do NOT extend the room or change its dimensions; do NOT replace side walls with the partition; do NOT add people, text, logos, or watermarks; do NOT change the time of day or lighting direction; do NOT leave any magenta, lime green, or cyan neon colors in the output.`,
    notes ? `Additional requirements: ${notes}` : "",
  ];

  return parts.filter(Boolean).join(" ");
}

export function buildEditPrompt(instruction: string): string {
  return `Modify the rendered partition based on the following instruction while keeping the rest of the image identical: ${instruction}. Maintain the same perspective, lighting, and surrounding room.`;
}

export function buildSpaceDetectionPrompt(): string {
  return `Analyze this interior photo and identify the most suitable area to install an office partition. Return a JSON object with keys: bbox (array of 4 numbers: x, y, width, height as percentages 0-100), confidence (0-1), reasoning (short string). Only return the JSON, no other text.`;
}
