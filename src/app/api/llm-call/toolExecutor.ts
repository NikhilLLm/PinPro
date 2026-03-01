import { tools } from "@/lib/llm/tools";
import { IPexelsPhoto } from "@/types/pexels";
import { analyzePexelsImages } from "./vision";

/**
 * Format tools for LLM consumption with proper parameters
 */
export function formatTools() {
    return tools.map(tool => {
        const isImageToImage = tool.name === "image_to_image_gen_tool";
        const paramName = isImageToImage ? "prompt" : "query";
        const paramDesc = isImageToImage
            ? "The text prompt describing the changes or additions to the reference image. Anchor the subject descriptively!"
            : "The search query or image generation prompt";

        const properties: any = {
            [paramName]: {
                type: "string",
                description: paramDesc
            }
        };

        if (isImageToImage) {
            properties.strength = {
                type: "number",
                description: "How much to change the image (0.0 to 1.0). Use 0.4 for subtle background swaps/edits, 0.8 for radical changes.",
                minimum: 0,
                maximum: 1
            };
        }

        return {
            type: "function" as const,
            function: {
                name: tool.name,
                description: tool.description,
                parameters: {
                    type: "object",
                    properties,
                    required: [paramName]
                }
            }
        };
    });
}

/**
 * Clean tool results before sending to LLM
 * Strips sensitive data and formats for token efficiency
 */
export async function cleanToolResult(toolName: string, result: any): Promise<any> {
    if (toolName === "Search_Images") {
        // Analyze Pexels images to provide visual context
        const photosWithAnalysis = await analyzePexelsImages(result.photos);
        return {
            ...result,
            photos: photosWithAnalysis.map((p: any) => ({
                id: p.id,
                alt: p.alt,
                url: p.src.original,
                photographer: p.photographer,
                analysis: p.analysis
            }))
        };
    } else if (toolName === "text_to_image_tool") {
        return {
            status: "success",
            message: "Image generated successfully (data hidden)."
        };
    } else if (toolName === "image_to_image_gen_tool") {
        return {
            status: "success",
            message: "Reference image processed and new image generated successfully (data hidden)."
        };
    }
    return result;
}

/**
 * Build image analysis context from tool results for chat history
 */
export function buildImageAnalysisContext(toolResults: any[]): string {
    let context = "";
    toolResults.forEach(tr => {
        if (tr.cleanedResult && tr.cleanedResult.photos) {
            context += "\n[SEARCH RESULTS ANALYSIS]:\n";
            tr.cleanedResult.photos.forEach((photo: any) => {
                context += `- Image ${photo.id}: ${photo.analysis || photo.alt || "Professional photography"}\n`;
            });
        }
    });
    return context;
}

/**
 * Separate tool results by type (images)
 */
export function separateResults(toolResults: any[], toolCalls: any[]) {
    const pexelsPhotos = toolResults
        .filter(tr => tr.result && "photos" in tr.result)
        .flatMap(tr => (tr.result as any).photos);

    const generatedImages = toolResults
        .filter(tr => tr.result && "format" in tr.result && (tr.result as any).format)
        .map(tr => {
            const res = tr.result as any;
            const toolCall = toolCalls.find(tc => tc.id === tr.id);
            const toolArgs = JSON.parse(toolCall?.function.arguments || "{}");

            return {
                url: res.format,
                prompt: toolArgs.query || toolArgs.prompt || "AI Generated"
            };
        });

    return { pexelsPhotos, generatedImages };
}
