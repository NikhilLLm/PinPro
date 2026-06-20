/**
 * CRITIC AGENT
 * Validates outputs from all other agents
 * Deterministic checks only — no LLM calls
 * Input: any agent output
 * Output: CriticOutput with validation score
 */

import { AgentResult, CriticOutput } from "./types";


export function criticizeContentOutput(output: any): CriticOutput {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!output.headline || output.headline.length === 0) {
        errors.push("Headline is empty");
    } else if (output.headline.length > 60) {
        errors.push(`Headline exceeds limit: ${output.headline.length} > 60 chars`);
    }

    if (!Array.isArray(output.steps) || output.steps.length === 0) {
        errors.push("Steps array is empty");
    } else {
        output.steps.forEach((step: string, i: number) => {
            if (step.length > 100) {
                errors.push(`Step ${i + 1} exceeds limit: ${step.length} > 100 chars`);
            }
        });
    }

    if (!output.cta || output.cta.length === 0) {
        errors.push("CTA is empty");
    } else if (output.cta.length > 30) {
        errors.push(`CTA exceeds limit: ${output.cta.length} > 30 chars`);
    }

    const score = Math.max(0, 100 - errors.length * 25 - warnings.length * 5);

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        score
    };
}

export function criticizeVisualOutput(output: any): CriticOutput {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!output.backgroundUrl) {
        errors.push("Background URL is missing");
    } else if (!isValidUrl(output.backgroundUrl)) {
        errors.push("Background URL is not valid");
    }

    if (!output.backgroundSource) {
        warnings.push("Background source not documented");
    }

    const score = Math.max(0, 100 - errors.length * 40 - warnings.length * 10);

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        score
    };
}

export function criticizeLayoutOutput(output: any): CriticOutput {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!output.layoutId && !output.id) {
        errors.push("Layout ID is missing");
    }
    if (!output.layoutName && !output.name) {
        errors.push("Layout name is missing");
    }
    const zones = output.layoutZones || output.zones;
    if (!zones || Object.keys(zones).length === 0) {
        errors.push("Layout has no zones defined");
    } else {
        // Validate zone structure
        for (const [key, zone] of Object.entries(zones)) {
            const z = zone as any;
            if (typeof z.x !== "number" || typeof z.y !== "number") {
                errors.push(`Zone "${key}" missing x or y coordinate`);
            }
            if (typeof z.width !== "number" || typeof z.height !== "number") {
                errors.push(`Zone "${key}" missing width or height`);
            }
        }
    }

    const score = Math.max(0, 100 - errors.length * 35 - warnings.length * 5);

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        score
    };
}

export function criticizeGeneratorOutput(output: any): CriticOutput {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!output.variants || !Array.isArray(output.variants)) {
        errors.push("variants is missing or not an array");
    } else if (output.variants.length === 0) {
        errors.push("variants array is empty — no pins were rendered");
    } else {
        output.variants.forEach((v: any, i: number) => {
            if (!v.id) {
                errors.push(`Variant ${i} missing id`);
            }
            if (!v.url) {
                errors.push(`Variant ${i} missing url`);
            }
        });

        if (output.variants.length < 3) {
            warnings.push(
                `Only ${output.variants.length}/3 variants rendered`
            );
        }
    }

    const score = Math.max(0, 100 - errors.length * 30 - warnings.length * 5);

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        score
    };
}

// ─── HELPERS ───────────────────────────────────────────────────────

function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return url.startsWith("http") || url.startsWith("data:");
    } catch {
        return false;
    }
}
