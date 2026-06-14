import { tools } from "@/lib/llm/tools";
import { cleanToolResult } from "./toolExecutor";

/**
 * Execute all tool calls in parallel and return results with cleaned data
 */
export async function executeToolCalls(
    toolCalls: any[],
    referenceImageUrl?: string,
    selectedImages?: { id: string | number, url: string }[]
): Promise<any[]> {
    const toolResults = await Promise.all(
        toolCalls.map(async (toolCall) => {
            const toolName = toolCall.function.name;
            console.log(`Executing tool: ${toolName}`);
            const toolArgs = JSON.parse(toolCall.function.arguments);

            // Sanitize search queries to prevent "push-pin" ambiguity
            if ((toolName === "web_search_tool" || toolName === "Search_Images") && toolArgs.query) {
                const original = toolArgs.query;
                // Strip standalone "pin", "pins", "generation" etc to avoid semantic confusion (e.g. "banana pin" -> "banana")
                // Use whitespace padding and strict boundaries to prevent eating chars from adjacent words (e.g. "aesthetic layout" -> "aesthetic")
                toolArgs.query = toolArgs.query
                    .replace(/\s*\b(pins?|generation|ideas?|template|layout|creative|design)\b\s*/gi, " ")
                    .replace(/\s+/g, " ")
                    .trim() || original; 

                // Minimum character check to ensure we don't return an empty or overly truncated query
                if (toolArgs.query.length < 2) toolArgs.query = original;
                if (toolArgs.query !== original) {
                    console.log(`[Sanitizer] "${original}" -> "${toolArgs.query}"`);
                }
            }

            // Inject reference image URL for image-to-image tool
            if (toolName === "image_to_image_gen_tool") {
                if (referenceImageUrl) {
                    toolArgs.url = referenceImageUrl;
                } else if (selectedImages && selectedImages.length > 0) {
                    // Fallback to the first selected image if no direct upload
                    toolArgs.url = selectedImages[0].url;
                }
            }

            const tool = tools.find((t) => t.name === toolName);

            if (!tool) {
                console.error(`Tool ${toolName} not found`);
                return { id: toolCall.id, error: "Tool not found" };
            }

            try {
                const result = await tool.execute(toolArgs) as any;
                const cleanedResult = await cleanToolResult(toolName, result);

                return {
                    id: toolCall.id,
                    result: result, // Full data for UI
                    cleanedResult: cleanedResult // Stripped data for LLM
                };
            } catch (error) {
                console.error(`Tool execution failed for ${toolName}:`, error);
                return {
                    id: toolCall.id,
                    error: `Tool execution failed: ${error}`
                };
            }
        })
    );

    return toolResults;
}
