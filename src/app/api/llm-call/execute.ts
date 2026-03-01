import { tools } from "@/lib/llm/tools";
import { cleanToolResult } from "./toolExecutor";

/**
 * Execute all tool calls in parallel and return results with cleaned data
 */
export async function executeToolCalls(
    toolCalls: any[],
    referenceImageUrl?: string
): Promise<any[]> {
    const toolResults = await Promise.all(
        toolCalls.map(async (toolCall) => {
            const toolName = toolCall.function.name;
            console.log(`Executing tool: ${toolName}`);
            const toolArgs = JSON.parse(toolCall.function.arguments);

            // Inject reference image URL for image-to-image tool
            if (toolName === "image_to_image_gen_tool" && referenceImageUrl) {
                toolArgs.url = referenceImageUrl;
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
