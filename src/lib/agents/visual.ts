/**
 * VISUAL AGENT
 * Searches for and validates background images
 * Input: pin topic + style preferences
 * Output: VisualOutput with selected background URL
 */

/**
 * VISUAL AGENT
 * Searches for and validates background images using real tools
 */

// import { AgentContext, AgentResult, VisualCandidate, VisualOutput } from "./types";
// import { executeToolCalls } from "@/app/api/llm-call/execute";

// export async function runVisualAgent(
//     context: AgentContext
// ): Promise<AgentResult<VisualOutput>> {
//     const { state, input } = context;

//     console.log("[VISUAL] Running visual agent...");

//     const existingCandidates = (state.backgroundCandidates || []) as VisualCandidate[];

//     // If user already approved a background, skip search
//     if (input.approvedBackground || state.selectedBackground) {
//         const bg = input.approvedBackground || state.selectedBackground || {};
//         if (bg.url) {
//             console.log("[VISUAL] Using existing approved background");
//             return {
//                 success: true,
//                 data: {
//                     backgroundUrl: bg.url,
//                     backgroundSource: bg.source || "user-selected",
//                     description: bg.description || "User selected background",
//                     candidates: existingCandidates
//                 }
//             };
//         }
//     }

//     // Build search query from planner output or raw input
//     const topic = state.pinIdea?.topic || input.topic || input.prompt || state.goal || "lifestyle";
//     const style = state.pinIdea?.tone || "professional clean";
//     const audience = state.pinIdea?.audience || "general";

//     console.log("[VISUAL] Searching for backgrounds for topic:", topic);

//     // ── STEP 1: Search Pexels images ──────────────────────────────
//     const searchToolCall = {
//         id: "visual-search-1",
//         function: {
//             name: "Search_Images",
//             arguments: JSON.stringify({
//                 query: `${topic} ${audience} photography background`
//             })
//         }
//     };

//     const searchResults = await executeToolCalls([searchToolCall]);
//     const searchResult = searchResults[0];

//     if (!searchResult.error && searchResult.result?.photos?.length > 0) {
//         const pexelsPhotos = searchResult.result.photos.slice(0, 6);
//         const candidates: VisualCandidate[] = pexelsPhotos.map((p: any, index: number) => {
//             const imageUrl = p?.src?.large || p?.src?.original || p?.url;
//             return {
//                 id: String(p?.id || `pexels-${index + 1}`),
//                 url: imageUrl,
//                 prompt: p?.alt || `${topic} background`,
//                 source: "pexels" as const,
//                 width: p?.width,
//                 height: p?.height,
//                 aspectRatio: p?.width && p?.height ? p.width / p.height : undefined
//             };
//         }).filter((c: VisualCandidate) => !!c.url);

//         const topPhoto = candidates[0];
//         if (!topPhoto) {
//             return {
//                 success: false,
//                 error: "Pexels returned photos but no usable URLs."
//             };
//         }
//         console.log("[VISUAL] Found Pexels background:", topPhoto.url);
//         return {
//             success: true,
//             data: {
//                 backgroundUrl: topPhoto.url,
//                 backgroundSource: "pexels",
//                 description: topPhoto.prompt || topic,
//                 candidates
//             }
//         };
//     }

//     console.log("[VISUAL] Pexels returned no results, falling back to AI generation...");

//     // ── STEP 2: Fallback — AI image generation ────────────────────
//     const generationVariants = [
//         `${style} cinematic background for ${topic}, no text, high quality`,
//         `${style} editorial background for ${topic}, no text, high quality`,
//         `${style} minimal clean background for ${topic}, no text, high quality`
//     ];

//     const genToolCalls = generationVariants.map((query, index) => ({
//         id: `visual-gen-${index + 1}`,
//         function: {
//             name: "text_to_image_tool",
//             arguments: JSON.stringify({ query })
//         }
//     }));

//     const genResults = await executeToolCalls(genToolCalls);
//     const aiCandidates: VisualCandidate[] = genResults
//         .filter((r: any) => !r.error && r.result?.format)
//         .map((r: any, index: number) => ({
//             id: `ai-${index + 1}`,
//             url: r.result.format,
//             prompt: generationVariants[index] || `AI generated background for ${topic}`,
//             source: "ai" as const
//         }));

//     const topGenerated = aiCandidates[0];

//     if (topGenerated) {
//         console.log("[VISUAL] AI generated background ready");
//         return {
//             success: true,
//             data: {
//                 backgroundUrl: topGenerated.url,
//                 backgroundSource: "ai-generated",
//                 description: `AI generated background for ${topic}`,
//                 candidates: aiCandidates
//             }
//         };
//     }

//     console.error("[VISUAL] Both search and generation failed");
//     return {
//         success: false,
//         error: "Could not find or generate a background image."
//     };
// }



/**
 * VISUAL AGENT
 * Searches for and validates background images
 * Compatible with PinProject architecture
 */

import {
    AgentContext,
    AgentResult,
    VisualCandidate,
    VisualOutput
} from "./types";

import { executeToolCalls } from "@/app/api/llm-call/execute";

export async function runVisualAgent(
    context: AgentContext
): Promise<AgentResult<VisualOutput>> {
    const { project, input } = context;

    console.log("[VISUAL] Running visual agent...");

    // Existing selected background
    if (
        input.approvedBackground ||
        project.selectedBackground
    ) {
        const bg =
            input.approvedBackground ||
            project.selectedBackground;

        if (bg) {
            return {
                success: true,
                data: {
                    id: crypto.randomUUID(),
                    backgroundUrl:
                        (bg as any).url ||
                        (bg as any).backgroundUrl ||
                        "",
                    backgroundSource:
                        (bg as any).source ||
                        (bg as any).backgroundSource ||
                        "user-selected",
                    description:
                        (bg as any).description ||
                        "User selected background"
                }
            };
        }
    }

    // Build search context
    const topic =
        input.topic ||
        input.prompt ||
        project.topic ||
        "lifestyle";

    const style =
        project.selectedLayout?.layoutName ||
        "professional clean";

    const audience = "general";

    console.log(
        "[VISUAL] Searching backgrounds for:",
        topic
    );

    // ───────────────────────────────────────────
    // STEP 1: Search Images
    // ───────────────────────────────────────────

    const searchToolCall = {
        id: "visual-search-1",
        function: {
            name: "Search_Images",
            arguments: JSON.stringify({
                query: `${topic} ${audience} photography background`
            })
        }
    };

    const searchResults = await executeToolCalls([
        searchToolCall
    ]);

    const searchResult = searchResults?.[0];

    if (
        !searchResult?.error &&
        searchResult?.result?.photos?.length > 0
    ) {
        const photos =
            searchResult.result.photos.slice(0, 6);

        const candidates: VisualCandidate[] =
            photos
                .map(
                    (
                        photo: any,
                        index: number
                    ): VisualCandidate => ({
                        id:
                            String(photo?.id) ||
                            `pexels-${index + 1}`,

                        url:
                            photo?.src?.large ||
                            photo?.src?.original ||
                            photo?.url ||
                            "",

                        prompt:
                            photo?.alt ||
                            `${topic} background`,

                        source: "pexels",

                        width: photo?.width,

                        height: photo?.height,

                        aspectRatio:
                            photo?.width &&
                            photo?.height
                                ? photo.width /
                                  photo.height
                                : undefined
                    })
                )
                .filter(
                    (candidate:any) =>
                        candidate.url
                );

        const selected = candidates[0];

        if (selected) {
            console.log(
                "[VISUAL] Pexels image found"
            );

            return {
                success: true,
                data: {
                    id: selected.id,

                    backgroundUrl:
                        selected.url,

                    backgroundSource:
                        "pexels",

                    description:
                        selected.prompt,

                    candidates
                }
            };
        }
    }

    console.log(
        "[VISUAL] No search result. Falling back to AI generation."
    );

    // ───────────────────────────────────────────
    // STEP 2: AI Generation
    // ───────────────────────────────────────────

    const prompts = [
        `${style} cinematic background for ${topic}, no text, high quality`,
        `${style} editorial background for ${topic}, no text, high quality`,
        `${style} minimal clean background for ${topic}, no text, high quality`
    ];

    const generationCalls = prompts.map(
        (prompt, index) => ({
            id: `visual-gen-${index + 1}`,
            function: {
                name: "text_to_image_tool",
                arguments: JSON.stringify({
                    query: prompt
                })
            }
        })
    );

    const generationResults =
        await executeToolCalls(
            generationCalls
        );

    const generatedCandidates: VisualCandidate[] =
        generationResults
            .filter(
                (result: any) =>
                    !result.error &&
                    result.result?.format
            )
            .map(
                (
                    result: any,
                    index: number
                ): VisualCandidate => ({
                    id: `ai-${index + 1}`,

                    url:
                        result.result.format,

                    prompt:
                        prompts[index],

                    source: "ai"
                })
            );

    const selectedGenerated =
        generatedCandidates[0];

    if (selectedGenerated) {
        console.log(
            "[VISUAL] AI image generated"
        );

        return {
            success: true,
            data: {
                id: selectedGenerated.id,

                backgroundUrl:
                    selectedGenerated.url,

                backgroundSource:
                    "ai",

                description:
                    selectedGenerated.prompt,

                candidates:
                    generatedCandidates
            }
        };
    }

    console.error(
        "[VISUAL] Failed to retrieve any image"
    );

    return {
        success: false,
        error:
            "Could not find or generate a background image."
    };
}