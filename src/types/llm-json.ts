// ─── types.ts ───────────────────────────────────────

export type StyleType = "minimal" | "bold" | "editorial" | "dark" | "pastel" | "nature";

// What LLM always returns (fixed contract)
export interface LLMPinJSON {
    baseImageUrl: string;
    canvasColor?: string;
    style: StyleType;
    layers: LLMLayer[];
    layout?: LayoutDefinition;
}

export interface LLMLayer {
    role: RoleType;
    text: string;
    align?: AlignType;
    colorOverride?: string;   // specific hex color
    sizeOverride?: number;    // font size in px
    weightOverride?: string;  // e.g. "800", "bold"
}

// What ImageKit SDK expects per layer
export interface ImageKitTextLayer {
    type: "text";
    input: string;
    fontSize: number;
    fontWeight?: string;
    color: string;
    fontFamily?: string;
    position: { x: number | string; y: number | string };
    width?: number;
    background?: string;
    padding?: number;
    alpha?: number;
}

// ─── STAGE 2: ADVANCED LAYOUT TYPES ──────────────────

export type RoleType =
    | "hook"
    | "subheading"
    | "body"
    | "tip"
    | "cta"
    | "label"
    | "step"
    | "column"
    | "center"
    | "annotation";

export type AlignType = "left" | "center" | "right";

export type LayoutType =
    | "classic"
    | "overlay"
    | "split"
    | "three_column"
    | "two_col_list"
    | "card_grid"
    | "step_grid"
    | "magazine"
    | "bottom_heavy"
    | "radial"
    | "annotated"
    | "custom";       // ← Vision AI discovered layouts

export interface LayoutZone {
    x: number;
    y: number;
    width: number;
    height: number;
    align: AlignType;
    role: RoleType;    // ← zone knows its own role
    index?: number;      // ← for repeated roles: body[0], body[1], body[2]
}

export interface LayoutDefinition {
    // identity
    id?: string;
    name: string;
    description?: string;
    layoutType: LayoutType;

    // grid structure
    columnCount: number;
    rowCount?: number;

    // dynamic zones — Record not hardcoded object
    zones: Record<string, LayoutZone>;

    // role mapping
    roleMap: Partial<Record<RoleType, string[]>>;

    // meta
    recommendedStyle: StyleType;
    niche_tags?: string[];
    content_tags?: string[];
    source_url?: string;      // where Vision AI found it
    discovered?: boolean;     // true if Vision AI generated it
    times_used?: number;
}