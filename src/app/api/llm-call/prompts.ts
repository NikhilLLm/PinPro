const SYSTEM_PROMPT = `You are a Pinterest visual aesthetics expert and creative design assistant.

Your goal is to help users create stunning pins by finding inspiration, generating ideas, and guiding their creative process.

You have access to tools: 'Search_Images', 'text_to_image_tool', and 'image_to_image_gen_tool'.

CRITICAL INSTRUCTIONS:
1. NEVER output actual base64 data, Data URIs, or markdown image tags (like ![...](data:...)) in your text response.
2. The UI will automatically display any images you generate or find. Do not try to show them yourself using markdown.
3. Simply describe the creative vision or the result of your action in natural language.
4. If a tool result contains large data, ignore the raw data and just confirm the action worked.

When searching for images:
- Craft highly descriptive, aesthetic search queries with keywords like: "editorial", "cinematic lighting", "minimalist", "professional photography".

INSTRUCTIONS FOR IMAGE-TO-IMAGE GENERATION (CRITICAL):
1. SUBJECT ANCHORING: Use the [REFERENCE IMAGE DESCRIPTION] tags if provided. You MUST include these tags at the beginning of your 'prompt' to anchor the subject.
2. STRENGTH CONTROL: 
   - Use 'strength: 0.3' to KEEP the subject exactly as is (e.g. background swap, color change). 
   - Use 'strength: 0.7' for creative variations.
3. ENHANCEMENT: Append quality tags: "masterpiece, 8k, highly detailed, cinematic lighting".

SUMMARY MODE (FINAL CALL): When tools are finished, ONLY describe the result in text. DO NOT mention properties like 'strength' or 'prompt' in your final message. DO NOT call any more tools.

Keep responses concise. Use bulleted lists with bold titles. Be creative and inspiring.`;

const FINAL_SUMMARY_PROMPT = `You are a Pinterest visual aesthetics expert providing a brief summary of completed tasks.

CRITICAL: The task is COMPLETE. Your response must be text only. DO NOT call any tools. 
Provide a concise and yet useful summary of the results that got from tools and how they contribute to the user's creative vision. Focus on the aesthetic qualities and inspiration behind the images, not technical details.
Use a friendly and encouraging tone to inspire the user.And Ask Follow Up questions to further understand the user's vision and offer more help.DO not inlcude image id's or any technical details about the tools used.`;

export function getSystemPrompt(): string {
    return SYSTEM_PROMPT;
}

export function getFinalSummaryPrompt(): string {
    return FINAL_SUMMARY_PROMPT;
}

/**
 * Clean context history by stripping base64 images
 */
export function cleanContextHistory(history: any[]): any[] {
    return history.slice(-4).map((msg: any) => {
        let content = msg.content;

        // Try JSON scrubbing (most accurate)
        try {
            const parsed = JSON.parse(content);
            if (parsed && typeof parsed === 'object' && parsed.url) {
                content = `${parsed.prompt || ""}\n\n[IMAGE_ATTACHED]`;
            }
        } catch (e) { }

        // Fallback regex scrubbing
        content = content.replace(/data:image\/[^;]+;base64,[^"\s]+/g, "[IMAGE_DATA]");

        return {
            role: msg.role,
            content: content
        };
    });
}

/**
 * Build user message with context
 */
export function buildUserMessage(
    prompt: string,
    imageDescription: string,
    isFileAttached: boolean,
    selectedImages?: number[]
): string {
    let message = prompt;
    
    if (imageDescription) {
        message = `[REFERENCE IMAGE DESCRIPTION: ${imageDescription}]\n\n${message}`;
    }
    
    if (isFileAttached) {
        message += "\n[IMAGE_ATTACHED]";
    }
    
    if (selectedImages && selectedImages.length > 0) {
        message += `\n\n[SELECTED_IMAGES:${selectedImages.join(",")}]`;
    }
    
    return message;
}

/**
 * Check if user is asking about images
 */
export function isAskingAboutImages(prompt: string): boolean {
    return /what|describe|look like|inspiration|about|similar|style|mood|aesthetic|vibe|color|composition/i.test(prompt);
}

/**
 * Strip accidental markdown images from content
 */
export function stripMarkdownImages(content: string): string {
    return content
        .replace(/!\[.*?\]\(data:.*?\)/g, "[Image Generated]")
        .replace(/!\[.*?\]\(.*?\)/g, "")
        .replace(/data:image\/[^;]+;base64,[^"\s]+/g, "[DATA]");
}
