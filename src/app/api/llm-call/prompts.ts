const IK_ENDPOINT = process.env.NEXT_PUBLIC_URL_ENDPOINT || "https://ik.imagekit.io/rishi1256";

// ─── UNIFIED PHASE-BASED SYSTEM PROMPT (token-optimized) ────────────
const UNIFIED_PROMPT = `You are a Pinterest design expert. Help users create stunning Pins through 4 phases.

PHASES:
1. EXPLORE: User forming idea. Chat only, NO tools. Suggest next steps. Stay here until user confirms direction.
   Exit→ user says "go ahead"/"find me"/"search for" → add <phase_transition>gather</phase_transition>

2. GATHER: Goal clear. Use tools to find layouts/images. You pick which tool + how many results. Tell user what you're doing.
   Exit→ user has layout + background + text content → add <phase_transition>build</phase_transition>

3. BUILD: All assets ready. Output <pin_json> only. No tools. Follow [BUILD INSTRUCTIONS] below.
   Exit→ user wants changes → add <phase_transition>refine</phase_transition>

4. REFINE: User wants changes. DIAGNOSE first:
   - Wrong info/images → <phase_transition>gather</phase_transition>
   - Reinterpret content → stay, regenerate pin_json
   - Vague feedback → ask ONE question

RULES: ASCII only in pin text. Be concise. Add <phase_transition> tag at END of response when transitioning.
CRITICAL: NEVER search for literal 'pins', 'push-pins', or 'corkboards'. Use terms like 'layout', 'aesthetic', 'design', or 'photography'. When using tools, strip 'pin' or 'generation' from your search queries. For example, search for 'banana lifestyle' or 'banana aesthetic', NOT 'banana pin'.`;

// ─── BUILD FORMAT SPEC ──────────────────────────────────────────────
export function getGenerationPrompt(layout?: any): string {
    let roleInstructions = `    { "role": "hook", "text": "<Hook>", "colorOverride": "<hex>" },
    { "role": "body", "text": "<Content>", "colorOverride": "<hex>" },
    { "role": "cta", "text": "<Action>", "colorOverride": "<hex>" }`;

    if (layout?.roleMap) {
        const requiredRoles: string[] = [];
        Object.entries(layout.roleMap).forEach(([role, zones]: [string, any]) => {
            zones.forEach((_: any, idx: number) => {
                requiredRoles.push(`    { "role": "${role}", "text": "<${role} ${idx + 1}>", "colorOverride": "<hex>" }`);
            });
        });
        if (requiredRoles.length > 0) roleInstructions = requiredRoles.join(",\n");
    }

    return `\n[BUILD INSTRUCTIONS]:
1. NO TOOLS. 2. Match layers to blueprint zones exactly. 3. Contrast colors. 4. ASCII only. 5. Max 45 chars/layer.
<pin_json>
{
  "baseImageUrl": "<ImageKit URL or [GENERATED_IMAGE]>",
  "style": "${layout?.recommendedStyle || "minimal"}",
  "layers": [
${roleInstructions}
  ]
}
</pin_json>`;
}

/**
 * Build system prompt for a given phase
 */
export function buildPhasePrompt(
    phase: string,
    layout?: any,
    topicContext?: string,
    assetSummary?: string
): string {
    let prompt = UNIFIED_PROMPT;
    prompt += `\n\n[CURRENT_PHASE]: ${phase.toUpperCase()}`;
    if (topicContext) prompt += `\n${topicContext}`;
    if (assetSummary) prompt += `\n${assetSummary}`;
    if (phase === "build" || phase === "refine") prompt += getGenerationPrompt(layout);
    return prompt;
}

export function getIkEndpoint(): string { return IK_ENDPOINT; }

/**
 * Compress a single message to its key facts (max ~100 chars)
 */
function summarizeMessage(role: string, content: string): string {
    // Strip image data, markdown images, and JSON blobs
    let clean = content
        .replace(/data:image\/[^;]+;base64,[^"\s]+/g, "")
        .replace(/!\[.*?\]\(.*?\)/g, "")
        .replace(/<pin_json>[\s\S]*?<\/pin_json>/g, "[pin_json output]")
        .replace(/<phase_transition>.*?<\/phase_transition>/g, "")
        .replace(/\[IMAGE_DATA\]/g, "")
        .replace(/\[IMAGE_ATTACHED\]/g, "")
        .replace(/\n{2,}/g, "\n")
        .trim();

    // Try to parse JSON content (tool results etc)
    try {
        const parsed = JSON.parse(clean);
        if (parsed && typeof parsed === 'object') {
            if (parsed.url) return `[shared image]`;
            if (parsed.prompt) return parsed.prompt.substring(0, 100);
            return `[data]`;
        }
    } catch (e) { }

    // Truncate long messages to key content
    if (clean.length > 200) {
        // Keep first 150 chars + last 50 chars to preserve the conclusion
        clean = clean.substring(0, 150) + "..." + clean.substring(clean.length - 50);
    }

    return clean;
}

/**
 * Clean and compress context history to fit within token budget.
 * - Keeps last 2 messages at full length (most important for context)
 * - Summarizes older messages to key points
 * - Strips all binary data and long JSON
 */
export function cleanContextHistory(history: any[], depth: number = 4): any[] {
    const recent = history.slice(-depth);
    if (recent.length === 0) return [];

    return recent.map((msg: any, idx: number) => {
        const isRecent = idx >= recent.length - 2; // last 2 messages stay fuller
        let content = msg.content || "";

        if (isRecent) {
            // Recent messages: strip binary but keep text
            content = content
                .replace(/data:image\/[^;]+;base64,[^"\s]+/g, "[IMAGE_DATA]")
                .replace(/<pin_json>[\s\S]*?<\/pin_json>/g, "[pin design output]");
            try {
                const parsed = JSON.parse(content);
                if (parsed?.url) content = `${parsed.prompt || ""}\n[IMAGE_ATTACHED]`;
            } catch (e) { }

            // Still truncate if very long
            if (content.length > 400) {
                content = content.substring(0, 350) + "...[truncated]";
            }
        } else {
            // Older messages: aggressively summarize
            content = summarizeMessage(msg.role, content);
        }

        return { role: msg.role, content };
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
    if (imageDescription) message = `[REF_IMAGE: ${imageDescription.substring(0, 100)}]\n${message}`;
    if (pexelsSelectedImageDescription) message = `[SELECTED_STYLE: ${pexelsSelectedImageDescription.substring(0, 100)}]\n${message}`;
    if (isFileAttached) message += "\n[IMAGE_ATTACHED]";
    if (selectedImages && selectedImages.length > 0) {
        const ids = selectedImages.map(img => (typeof img === 'object' ? (img as any).id : img));
        message += `\n[SELECTED:${ids.join(",")}]`;
    }
    return message;
}

export function stripMarkdownImages(content: string): string {
    return content
        .replace(/!\[.*?\]\(data:.*?\)/g, "[Image Generated]")
        .replace(/!\[.*?\]\(.*?\)/g, "")
        .replace(/data:image\/[^;]+;base64,[^"\s]+/g, "[DATA]");
}
