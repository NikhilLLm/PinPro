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
            message: "Visual background generated successfully. It is ready for the final Pin layout."
        };
    } else if (toolName === "web_search_tool") {
        return {
            status: "success",
            answer: result.answer,
            results: result.results?.map((r: any) => ({ title: r.title, url: r.url })),
            images: result.images?.slice(0, 3).map((img: any) => img.url),
            message: result.answer || `Found trending layout examples.`
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
        if (tr.cleanedResult) {
            // Case 1: Pexels photos with analysis
            if (tr.cleanedResult.photos) {
                context += "\n[VISUAL CONTEXT (Staged Images)]:\n";
                tr.cleanedResult.photos.forEach((photo: any, index: number) => {
                    context += `- Option ${index + 1}: ${photo.analysis || photo.alt || "Professional photography"}\n`;
                });
            }
            // Case 2: AI Generated images
            else if (tr.cleanedResult.status === "success" && tr.cleanedResult.message) {
                // If it's web search, we might have image count but the tool executor handles message
                context += `\n[VISUAL CONTEXT]: ${tr.cleanedResult.message}\n`;
            }
        }
    });
    return context;
}

/**
 * Separate tool results by type (images)
 */
export function separateResults(toolResults: any[], toolCalls: any[]) {
    const pexelsPhotos = toolResults
        .filter(tr => {
            const toolCall = toolCalls.find(tc => tc.id === tr.id);
            return toolCall?.function.name === "Search_Images" && !!tr.result;
        })
        .flatMap(tr => (tr.result as any).photos || []);

    const generatedImages = toolResults
        .filter(tr => {
            const toolCall = toolCalls.find(tc => tc.id === tr.id);
            const name = toolCall?.function.name || "";
            return ["text_to_image_tool", "image_to_image_gen_tool"].includes(name) && !!tr.result;
        })
        .map(tr => {
            const res = tr.result as any;
            const toolCall = toolCalls.find(tc => tc.id === tr.id);
            const toolArgs = JSON.parse(toolCall?.function.arguments || "{}");

            return {
                url: res.format || res.image || "",
                prompt: toolArgs.query || toolArgs.prompt || "AI Generated"
            };
        });

    return { pexelsPhotos, generatedImages };
}
