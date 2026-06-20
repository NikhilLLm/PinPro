/**
 * GENERATOR AGENT
 * Deterministic pin rendering: builds layers from content,
 * renders 3 style variants with Sharp, uploads to ImageKit.
 *
 * No LLM call — content/layout/background are already finalised
 * by the time this agent runs.
 */

import ImageKit from "imagekit";

import {
    AgentContext,
    AgentResult,
    GeneratorOutput,
    PinVariant
} from "./types";

import { buildPinWithSharp } from "@/lib/sharp-pin-builder";
import { LLMPinJSON, LLMLayer, StyleType } from "@/types/llm-json";

// ─────────────────────────────────────────────
// ImageKit Client
// ─────────────────────────────────────────────

const imagekit = new ImageKit({
    publicKey: process.env.NEXT_PUBLIC_PUBLIC_KEY!,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
    urlEndpoint: process.env.NEXT_PUBLIC_URL_ENDPOINT!
});

// ─────────────────────────────────────────────
// Style Variants
// ─────────────────────────────────────────────

const VARIANT_STYLES: { id: string; name: string; style: StyleType }[] = [
    { id: "v1", name: "Bold Preset", style: "bold" },
    { id: "v2", name: "Editorial Preset", style: "editorial" },
    { id: "v3", name: "Minimal Preset", style: "minimal" }
];

// ─────────────────────────────────────────────
// ImageKit Upload
// ─────────────────────────────────────────────

async function uploadToImageKit(
    file: string
): Promise<string | null> {
    try {
        const res = await imagekit.upload({
            file,
            fileName: `pin_${Date.now()}.png`,
            folder: "/ai-pins",
            useUniqueFileName: true
        });
        return res?.url || null;
    } catch (e: any) {
        console.error(
            "[GENERATOR] ImageKit upload error:",
            e.message
        );
        return null;
    }
}

// ─────────────────────────────────────────────
// Main Agent
// ─────────────────────────────────────────────

export async function runGeneratorAgent(
    context: AgentContext
): Promise<AgentResult<GeneratorOutput>> {
    const { project, input } = context;

    console.log("[GENERATOR] Running generator agent...");

    // ─── Resolve Selections ──────────────────

    const selectedContent =
        input.selectedContent ||
        project.selectedContent;

    const selectedLayout =
        input.selectedLayout ||
        project.selectedLayout;

    const selectedBackground =
        input.selectedBackground ||
        project.selectedBackground;

    // ─── Validation ──────────────────────────

    if (!selectedContent) {
        return {
            success: false,
            error: "No content selected. Cannot generate pin.",
            validationErrors: ["Missing content"]
        };
    }

    if (!selectedLayout || !selectedLayout.layoutZones) {
        return {
            success: false,
            error: "No layout selected. Cannot generate pin.",
            validationErrors: ["Missing layout"]
        };
    }

    if (!selectedBackground) {
        return {
            success: false,
            error: "No background selected. Cannot generate pin.",
            validationErrors: ["Missing background"]
        };
    }

    const bgUrl = selectedBackground.backgroundUrl;

    if (!bgUrl) {
        return {
            success: false,
            error: "Background image URL missing.",
            validationErrors: ["Invalid background"]
        };
    }

    // ─── Build Text Layers ───────────────────

    const layers: LLMLayer[] = [];

    layers.push({
        role: "hook",
        text: selectedContent.headline,
        colorOverride: "#ffffff",
        sizeOverride: 52
    });

    if (Array.isArray(selectedContent.steps)) {
        selectedContent.steps.forEach((line: string) => {
            layers.push({
                role: "body",
                text: line,
                colorOverride: "#e2e8f0",
                sizeOverride: 28
            });
        });
    }

    if (selectedContent.cta) {
        layers.push({
            role: "cta",
            text: selectedContent.cta,
            colorOverride: "#fbbf24",
            sizeOverride: 26
        });
    }

    // ─── Render 3 Variants ───────────────────

    const variants: PinVariant[] = [];

    for (const variant of VARIANT_STYLES) {
        try {
            const pinConfig: LLMPinJSON = {
                baseImageUrl: bgUrl,
                style: variant.style,
                layers,
                layout: selectedLayout.layoutZones
            };

            console.log(
                `[GENERATOR] Rendering variant: ${variant.name}`
            );

            const buffer = await buildPinWithSharp(pinConfig);
            const base64 = `data:image/png;base64,${buffer.toString("base64")}`;
            const uploadedUrl = await uploadToImageKit(base64);

            if (uploadedUrl) {
                variants.push({
                    id: variant.id,
                    name: variant.name,
                    url: uploadedUrl
                });
            } else {
                console.warn(
                    `[GENERATOR] Upload failed for ${variant.name}, using base64 fallback`
                );
                variants.push({
                    id: variant.id,
                    name: variant.name,
                    url: base64
                });
            }
        } catch (err: any) {
            console.error(
                `[GENERATOR] Variant ${variant.name} failed:`,
                err.message
            );
        }
    }

    if (variants.length === 0) {
        return {
            success: false,
            error: "All pin variants failed to render",
            validationErrors: ["Render failure"]
        };
    }

    console.log(
        `[GENERATOR] ${variants.length} variants rendered successfully`
    );

    return {
        success: true,
        data: { variants }
    };
}