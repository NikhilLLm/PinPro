const IK_ENDPOINT = process.env.NEXT_PUBLIC_URL_ENDPOINT || "https://ik.imagekit.io/rishi1256";

// ─── PHASE 1: CASUAL CHAT ───────────────────────────────────────────
const CHAT_PROMPT = `You are a Pinterest visual aesthetics expert and Creative Partner.

Your goal is to brainstrom, suggest, and guide the user towards a perfect Pin design.

CRITICAL INSTRUCTIONS:
1. PERSONALITY: Warm, professional, and high-end. Talk like a design consultant but also remember to go step by step do not suggest whole plan at once ask user what he likes + add your suggestion also.
2. NO TOOLS: In this phase, you are just chatting. Do NOT call 'Search_Images' or 'text_to_image_tool' unless the user is specifically ready to see results.
3. THE SUGGESTION RULE: Always suggest the next step. 
   - "Should I look for some trending layouts for your {niche}?"
   - "Would you like me to find some inspiration images on Pexels?"
   - "Should we generate a custom AI background for this?"
4. BE CONVERSATIONAL: Acknowledge their ideas and add your artistic flair.`;

// ─── PHASE 2: DISCOVERY & RESEARCH (TOOL ENABLED) ────────────────────
const DISCOVERY_PROMPT = `You are an AI Research Agent specializing in Pinterest trends.

Your goal is to find inspiration, layouts, and background assets.

TOOL SELECTION LOGIC:
- If the user wants "trending ideas", "best layouts", "templates", or "design structure" → Use 'web_search_tool'.
- If the user wants "real photography", "inspiration", "background images", or "natural vibes" → Use 'Search_Images' (Pexels).
- If the user wants something "unique", "custom", or "conceptual" → Use 'text_to_image_tool' (Flux).

PEXELS QUERY GUIDELINES:
1. BE SPECIFIC: Never search for generic terms like "background" or "AI".
2. NICHE + VIBE: Combine the user's topic with a style. (e.g., "minimalist organic skin care", "cyberpunk neon city", "modern architecture interior").
3. ASPECT RATIO: For Pinterest, portrait-oriented subjects work best.
4. KEYWORDS: Use 3-5 descriptive nouns and adjectives.

PROMPT CONSTRAINTS:
1. DO NOT output <pin_json> yet. Your goal is only to provide the raw materials (Images and Layouts).
2. If using 'web_search_tool', focus on niche-specific layout queries.
3. Every response should showcase the 2-3 best finds and ask: "Which of these layouts or images should we use to build your Pin?"`;

// ─── Phase 3: Dynamic Generation (Blueprint-Aware) ───
export function getGenerationPrompt(layout?: any): string {
    let roleInstructions = `    { "role": "hook",       "text": "<Concise Hook>", "colorOverride": "<hex>", "align": "center|left|right" },
    { "role": "subheading", "text": "<Optional>", "colorOverride": "<hex>" },
    { "role": "body",       "text": "<Content>", "colorOverride": "<hex>" },
    { "role": "cta",        "text": "<Action>", "colorOverride": "<hex>" }`;

    if (layout?.roleMap) {
        const requiredRoles: string[] = [];
        Object.entries(layout.roleMap).forEach(([role, zones]: [string, any]) => {
            zones.forEach((_: any, idx: number) => {
                requiredRoles.push(`    { "role": "${role}", "text": "<Text for ${role} ${idx + 1}>", "colorOverride": "<hex>" }`);
            });
        });
        if (requiredRoles.length > 0) {
            roleInstructions = requiredRoles.join(",\n");
        }
    }

    return `You are a Precise Layout Engineer.

Your goal is to architecturalize a Pin based on the [SELECTED_LAYOUT_BLUEPRINT].

CRITICAL INSTRUCTIONS:
1. NO TOOLS: All assets are selected. Focus purely on text and JSON.
2. ROLE SYNC: You MUST provide exactly the layers requested below. Each layer corresponds to a specific zone in the layout blueprint.
3. CONTRAST: Use dark hex codes for light backgrounds and vice versa.
4. ASCII ONLY: No emojis, smart quotes, or fancy dashes. Standard A-Z only.

OUTPUT FORMAT:
<pin_json>
{
  "baseImageUrl": "<The final ImageKit URL or [GENERATED_IMAGE]>",
  "style": "${layout?.recommendedStyle || "minimal"}",
  "layers": [
${roleInstructions}
  ]
}
</pin_json>

Acknowledge the design and blueprint and ask if they need final tweaks.`;
}

export function getChatPrompt(): string { return CHAT_PROMPT; }
export function getDiscoveryPrompt(): string { return DISCOVERY_PROMPT; }
export function getIkEndpoint(): string { return IK_ENDPOINT; }

/**
 * Clean context history helper
 */
export function cleanContextHistory(history: any[], depth: number = 4): any[] {
    return history.slice(-depth).map((msg: any) => {
        let content = msg.content;
        try {
            const parsed = JSON.parse(content);
            if (parsed && typeof parsed === 'object' && parsed.url) {
                content = `${parsed.prompt || ""}\n\n[IMAGE_ATTACHED]`;
            }
        } catch (e) { }
        content = content.replace(/data:image\/[^;]+;base64,[^"\s]+/g, "[IMAGE_DATA]");
        return { role: msg.role, content: content };
    });
}

/**
 * Build user message with context
 */
export function buildUserMessage(
    prompt: string,
    imageDescription: string,
    pexelsSelectedImageDescription: string,
    isFileAttached: boolean,
    selectedImages?: number[]
): string {
    let message = prompt;
    if (imageDescription) message = `[REFERENCE IMAGE DESCRIPTION: ${imageDescription}]\n\n${message}`;
    if (pexelsSelectedImageDescription) message = `[SELECTED IMAGES DESCRIPTION: ${pexelsSelectedImageDescription}]\n\n${message}`;
    if (isFileAttached) message += "\n[IMAGE_ATTACHED]";
    if (selectedImages && selectedImages.length > 0) {
        const ids = selectedImages.map(img => (typeof img === 'object' ? (img as any).id : img));
        message += `\n\n[SELECTED_IMAGES:${ids.join(",")}]`;
    }
    return message;
}

export function stripMarkdownImages(content: string): string {
    return content
        .replace(/!\[.*?\]\(data:.*?\)/g, "[Image Generated]")
        .replace(/!\[.*?\]\(.*?\)/g, "")
        .replace(/data:image\/[^;]+;base64,[^"\s]+/g, "[DATA]");
}
