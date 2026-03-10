
/**
 * Layer 3: Stage-Aware Validation
 * Light for chat, medium for discovery, strict for build.
 */

const CLOUDFLARE_ENDPOINT = `https://api.cloudflare.com/client/v4/accounts/`;
const REASONING_MODEL = "@cf/meta/llama-3.1-70b-instruct";

export interface ValidationFeedback {
    isValid: boolean;
    feedback: string | null;
}

export async function validateResponse(
    userInput: string,
    historyContext: string,
    aiDraftResponse: string,
    requestType: string
): Promise<ValidationFeedback> {

    let specificRules = "";

    // ─── STAGE: BUILD (strict) ───────────────────────────────────────
    if (requestType === "build-pin") {
        specificRules = `
STRICT VALIDATION — every rule must pass:
1. JSON STRUCTURE: Must contain valid <pin_json> tags with baseImageUrl, style, and layers array.
2. LAYER COUNT: The layers array MUST match the number of zones in the [SELECTED_LAYOUT_BLUEPRINT]. Exampl:-If blueprint has 5 steps → exactly 5 layers with role "step". Count and compare.
3. ROLE SYNC: Each layer's "role" must correspond to a zone in the blueprint's roleMap. No extra or missing roles.
4. TEXT CONSTRAINTS: ASCII only, no emojis, no fancy quotes or dashes, max 45 chars per layer text.
5. COLOR CONTROL: "colorOverride" must be set for every layer. Must contrast with the background — dark text on light backgrounds, light text on dark backgrounds.
6. CONTENT RELEVANCE: Text must match the user's original request topic.`;
    }
    // ─── STAGE: DISCOVERY (medium) ───────────────────────────────────
    else if (requestType === "pexels" || requestType === "ai-image" || requestType === "layout-search") {
        specificRules = `
MEDIUM VALIDATION:
1. RELEVANCE: Search keywords or generated image must match the user's specific niche/topic.
2. RESULTS PRESENT: The response should reference actual results (image URLs, layout descriptions). If no results, flag as invalid.
3. ORIENTATION: For Pinterest, images should be portrait/tall orientation where possible.
4. NO PREMATURE PIN: The response must NOT contain <pin_json> tags. Discovery phase only provides raw materials.`;
    }
    // ─── STAGE: CHAT (light) ─────────────────────────────────────────
    else {
        specificRules = `
LIGHT VALIDATION:
1. RELEVANCE: The response must address the user's question or topic.
2. NO HALLUCINATION: Do not invent features, URLs, or capabilities that don't exist.
3. NO UNWANTED OUTPUT: The response must NOT contain <pin_json> tags in a chat response.
4. HELPFULNESS: The response should guide the user towards next steps (suggesting layouts, images, etc).`;
    }

    const systemPrompt = `You are a Quality Critic for a Pinterest Design Agent.
Compare the User's Request and Chat History against the AI's Draft Response.

RULES TO CHECK:
${specificRules}

Output ONLY valid JSON:
{
  "isValid": boolean,
  "feedback": "Concise explanation of what is wrong, or null if valid"
}`;

    try {
        const response = await fetch(`${CLOUDFLARE_ENDPOINT}${process.env.ACCOUNT_ID}/ai/run/${REASONING_MODEL}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.CLOUDEFARE_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `CONTEXT:\n${historyContext}\n\nUSER REQUEST: ${userInput}\n\nAI DRAFT: ${aiDraftResponse}` }
                ]
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Validation] API error (${response.status}):`, errorText);
            throw new Error(`Cloudflare API error: ${response.status}`);
        }

        const result = await response.json();
        const content = result?.result?.response;

        if (!content) {
            console.error("[Validation] Unexpected API response structure:", result);
            return { isValid: true, feedback: null };
        }

        const jsonMatch = content.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch (e) {
        console.error("Validation failed:", e);
    }

    return { isValid: true, feedback: null }; // Pass on error to avoid blocking
}
