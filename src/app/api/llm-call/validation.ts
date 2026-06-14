/**
 * Deterministic Validation for Pin JSON
 * No LLM calls — just structural checks for build output.
 */

export interface ValidationFeedback {
    isValid: boolean;
    feedback: string | null;
}

/**
 * Validate build responses deterministically.
 * Only checks <pin_json> structure — no LLM critic needed.
 * For non-build responses, always passes (fail-open).
 */
export function validateBuildResponse(aiDraftResponse: string): ValidationFeedback {
    if (!aiDraftResponse.includes("<pin_json>")) {
        return { isValid: false, feedback: "Missing <pin_json> block for build response." };
    }

    const pinJsonSplit = aiDraftResponse.match(/<pin_json>([\s\S]*?)<\/pin_json>/);
    if (!pinJsonSplit) {
        return { isValid: false, feedback: "Malformed <pin_json> tags in build response." };
    }

    try {
        const parsed = JSON.parse(pinJsonSplit[1].trim());
        if (!parsed?.baseImageUrl || !Array.isArray(parsed?.layers)) {
            return { isValid: false, feedback: "Build JSON must include baseImageUrl and layers array." };
        }
        if (parsed.layers.length === 0) {
            return { isValid: false, feedback: "Build JSON layers cannot be empty." };
        }

        // Check each layer has required fields
        for (const layer of parsed.layers) {
            if (!layer.role || !layer.text) {
                return { isValid: false, feedback: "Each layer must have a 'role' and 'text' field." };
            }
            if (layer.text.length > 60) {
                return { isValid: false, feedback: `Layer "${layer.role}" text exceeds 60 chars: "${layer.text.substring(0, 30)}..."` };
            }
        }
    } catch {
        return { isValid: false, feedback: "Invalid JSON inside <pin_json> block." };
    }

    return { isValid: true, feedback: null };
}
