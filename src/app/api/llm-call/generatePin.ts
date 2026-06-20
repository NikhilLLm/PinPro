/**
 * GENERATE PIN ORCHESTRATOR
 *
 * Wires the Generator Agent + SEO Agent together.
 * Accepts either a full PinProjectState or raw frontend input
 * and produces { variants, seo }.
 */

import {
    PinProjectState,
    ContentOutput,
    LayoutOutput,
    VisualOutput,
    PinVariant,
    SEOOutput,
    runGeneratorAgent
} from "@/lib/agents";
import { runSEOAgent } from "@/lib/agents/seoagent";
import { LayoutDefinition } from "@/types/llm-json";

// ─────────────────────────────────────────────
// Input shape matching what the frontend sends
// ─────────────────────────────────────────────

export interface GeneratePinInput {
    projectId: string;
    topic: string;
    content: { headline: string; body: string[]; cta: string };
    layout: LayoutDefinition;
    background: { url: string; prompt: string };
}

// ─────────────────────────────────────────────
// Map frontend shapes → agent shapes
// ─────────────────────────────────────────────

function mapToProjectState(
    input: GeneratePinInput,
    userId: string
): PinProjectState {
    const selectedContent: ContentOutput = {
        id: "user-content",
        headline: input.content.headline,
        steps: input.content.body,
        cta: input.content.cta
    };

    const selectedLayout: LayoutOutput = {
        id: input.layout.id || "user-layout",
        layoutName: input.layout.name,
        layoutZones: input.layout,
        reasoning: input.layout.description || ""
    };

    const selectedBackground: VisualOutput = {
        id: "user-bg",
        backgroundUrl: input.background.url,
        backgroundSource: "user-upload",
        description: input.background.prompt
    };

    return {
        projectId: input.projectId || crypto.randomUUID(),
        userId,
        topic: input.topic,

        contentOptions: [selectedContent],
        layoutOptions: [selectedLayout],
        backgroundOptions: [selectedBackground],

        selectedContent,
        selectedLayout,
        selectedBackground,

        generatedPins: [],
        createdAt: new Date(),
        updatedAt: new Date()
    };
}

// ─────────────────────────────────────────────
// Main orchestrator
// ─────────────────────────────────────────────

export async function generatePins(
    input: GeneratePinInput,
    userId: string
): Promise<{
    success: boolean;
    variants: PinVariant[];
    seo: SEOOutput | null;
    error?: string;
}> {
    console.log("[generatePins] Starting orchestration...");

    // 1. Build project state from frontend input
    const project = mapToProjectState(input, userId);

    console.log("[generatePins] Project state built:", project.projectId);

    // 2. Run Generator Agent
    const generatorContext = {
        userId: project.userId,
        projectId: project.projectId,
        project,
        input: {
            selectedContent: project.selectedContent,
            selectedLayout: project.selectedLayout,
            selectedBackground: project.selectedBackground,
            runGenerator: true
        }
    };

    const pinResult = await runGeneratorAgent(generatorContext);

    if (!pinResult.success || !pinResult.data) {
        console.error("[generatePins] Generator failed:", pinResult.error);
        return {
            success: false,
            variants: [],
            seo: null,
            error: pinResult.error || "Generator agent failed"
        };
    }

    console.log(
        `[generatePins] Generator produced ${pinResult.data.variants.length} variants`
    );

    // 3. Run SEO Agent
    let seo: SEOOutput | null = null;
    try {
        seo = await runSEOAgent({
            topic: project.topic,
            headline:
                project.selectedContent?.headline || project.topic,
            body: project.selectedContent?.steps || [],
            cta: project.selectedContent?.cta
        });
        console.log("[generatePins] SEO generated successfully");
    } catch (err: any) {
        console.error(
            "[generatePins] SEO generation failed:",
            err.message
        );
    }

    // 4. Update project state
    project.generatedPins = [pinResult.data];
    project.seo = seo ?? undefined;
    project.updatedAt = new Date();

    return {
        success: true,
        variants: pinResult.data.variants,
        seo
    };
}