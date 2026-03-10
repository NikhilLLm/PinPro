// ─── sharp-pin-builder.ts ────────────────────────────────────────
// Builds Pinterest pins using Sharp + SVG text overlay
// Accepts either an ImageKit URL or base64 string as background
// No CPU blocking — uses async sharp pipeline throughout
// ─────────────────────────────────────────────────────────────────

import sharp from "sharp";
import { LLMPinJSON, LLMLayer, LayoutDefinition, LayoutZone } from "@/types/llm-json";
import {
    calculateYPositions,
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
    MARGIN_X,
    TEXT_WIDTH
} from "./layout-engine";
import { STYLE_PRESETS } from "./styles";

// Set concurrency to 1 to prevent CPU saturation on the server
sharp.concurrency(1);

// ─── Helpers ──────────────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const clean = hex.replace("#", "");
    return {
        r: parseInt(clean.substring(0, 2), 16),
        g: parseInt(clean.substring(2, 4), 16),
        b: parseInt(clean.substring(4, 6), 16),
    };
}

function sanitizeText(text: string): string {
    return text
        .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, "-")
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/\u2026/g, "...")
        .replace(/\u202F/g, " ")
        .replace(/[\u200B-\u200F]/g, "")
        .replace(/[\r\n\t]/g, " ")
        // strip emojis
        .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, "")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Basic word wrap based on character width estimation
 */
function wrapWords(text: string, fontSize: number, maxWidth: number): string[] {
    // Average char width factor for variable-width fonts is ~0.45-0.55
    const charsPerLine = Math.floor(maxWidth / (fontSize * 0.5));
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";

    for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        if (test.length > charsPerLine && current) {
            lines.push(current);
            current = word;
        } else {
            current = test;
        }
    }
    if (current) lines.push(current);
    return lines;
}

/**
 * Escape XML for SVG inclusion
 */
function escapeXML(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

// ─── SVG Overlay Builder ────────────────────────────────────────

function buildSVGOverlay(layers: LLMLayer[], preset: any, layout?: LayoutDefinition): string {
    const svgLines: string[] = [];
    const legacyY = calculateYPositions(layers);

    // Keep track of how many times each role has been used to map to roleMap indices
    const roleUsedCount: Record<string, number> = {};

    layers.forEach((layer, i) => {
        if (!layer.text?.trim()) return;

        const roleStyle = preset.roles[layer.role] ?? preset.roles.body;
        const safeText = sanitizeText(layer.text);

        // ─── STEP 1: Determine Bounding Box ───
        let x = MARGIN_X;
        let y = legacyY[i];
        let width = TEXT_WIDTH;
        let align = layer.align || "left";

        if (layout && layout.zones && layout.roleMap) {
            const currentRole = layer.role;
            roleUsedCount[currentRole] = (roleUsedCount[currentRole] || 0);

            const zoneKeys = layout.roleMap[currentRole];
            const zoneKey = zoneKeys ? zoneKeys[roleUsedCount[currentRole]] : null;
            const zone = zoneKey ? layout.zones[zoneKey] : null;

            if (zone) {
                // Scale normalized 1000x1000 to physical 1000x1500
                x = zone.x;
                y = zone.y * 1.5;
                width = zone.width;
                align = zone.align || align;
            }
            roleUsedCount[currentRole]++;
        }

        // ─── STEP 2: Styling ───
        const fontSize = layer.sizeOverride ?? roleStyle.fs;
        const fontColor = `#${(layer.colorOverride ?? roleStyle.co).replace("#", "")}`;
        const fontWeight = layer.weightOverride ?? roleStyle.fw;
        const rgb = hexToRgb(fontColor);
        const fontFamily = preset.fontFamily || "Inter";

        const lineHeight = fontSize * 1.25;
        const lines = wrapWords(safeText, fontSize, width);

        // ─── STEP 3: SVG Rendering ───
        const textAnchor = align === "center" ? "middle" : align === "right" ? "end" : "start";
        const textX = align === "center" ? x + (width / 2) : align === "right" ? x + width : x;

        lines.forEach((line, lineIdx) => {
            // Adjust lineY so that 'y' acts as the TOP of the text area, not the baseline
            // Adding fontSize ensures the first line is visible even if y is 0.
            const lineY = y + fontSize + (lineIdx * lineHeight);
            const shadowColor = rgb.r + rgb.g + rgb.b > 382 ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.2)";

            // Shadow layer
            svgLines.push(`
                <text
                    x="${textX + 2}"
                    y="${lineY + 2}"
                    font-size="${fontSize}"
                    font-weight="${fontWeight}"
                    font-family="${fontFamily}, sans-serif"
                    fill="${shadowColor}"
                    text-anchor="${textAnchor}"
                    opacity="${roleStyle.alpha}"
                    dominant-baseline="alphabetic"
                >${escapeXML(line)}</text>
            `);

            // Primary text layer
            svgLines.push(`
                <text
                    x="${textX}"
                    y="${lineY}"
                    font-size="${fontSize}"
                    font-weight="${fontWeight}"
                    font-family="${fontFamily}, sans-serif"
                    fill="${fontColor}"
                    text-anchor="${textAnchor}"
                    opacity="${roleStyle.alpha}"
                    dominant-baseline="alphabetic"
                >${escapeXML(line)}</text>
            `);
        });
    });

    return `
        <svg
            width="${CANVAS_WIDTH}"
            height="${CANVAS_HEIGHT}"
            xmlns="http://www.w3.org/2000/svg"
        >
            ${svgLines.join("\n")}
        </svg>
    `;
}

// ─── Main Builder ────────────────────────────────────────────────

export async function buildPinWithSharp(llmJson: LLMPinJSON): Promise<Buffer> {
    const preset = STYLE_PRESETS[llmJson.style] ?? STYLE_PRESETS.minimal;
    const canvasBg = `#${(llmJson.canvasColor ?? preset.canvasBg).replace("#", "")}`;

    // 1. Resolve Background Buffer
    let bgBuffer: Buffer;

    if (llmJson.baseImageUrl && llmJson.baseImageUrl.startsWith('http')) {
        const res = await fetch(llmJson.baseImageUrl);
        if (!res.ok) throw new Error(`Failed to fetch image: ${res.statusText}`);
        bgBuffer = Buffer.from(await res.arrayBuffer());
    } else if (llmJson.baseImageUrl && llmJson.baseImageUrl.startsWith('data:image')) {
        const b64 = llmJson.baseImageUrl.split(',')[1];
        bgBuffer = Buffer.from(b64, 'base64');
    } else {
        // Solid color fallback if no image provided
        bgBuffer = await sharp({
            create: {
                width: CANVAS_WIDTH,
                height: CANVAS_HEIGHT,
                channels: 3,
                background: canvasBg
            }
        }).png().toBuffer();
    }

    // 2. Initial background process (resize + darkening)
    const pipeline = sharp(bgBuffer)
        .resize(CANVAS_WIDTH, CANVAS_HEIGHT, { fit: "cover" });

    // Add a darkening overlay if it's an actual image (not just a color)
    const composites: sharp.OverlayOptions[] = [];

    if (llmJson.baseImageUrl) {
        // Fixed 35% darken for better text punch
        const darken = Buffer.from(`
            <svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}">
                <rect width="100%" height="100%" fill="rgba(0,0,0,0.35)"/>
            </svg>
        `);
        composites.push({ input: darken, top: 0, left: 0 });
    }

    // 3. Add SVG Text Overlay
    const svgOverlay = buildSVGOverlay(llmJson.layers, preset, llmJson.layout);
    composites.push({
        input: Buffer.from(svgOverlay),
        top: 0,
        left: 0
    });

    // 4. Execute Final Composition
    return await pipeline
        .composite(composites)
        .png({ quality: 90, compressionLevel: 8 })
        .toBuffer();
}
