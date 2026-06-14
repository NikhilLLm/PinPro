// /**
//  * GENERATOR AGENT
//  * Builds pin_json and renders final pin image
//  * Input: content + layout + background
//  * Output: GeneratorOutput with pin_json + URL
//  */

// import Groq from "groq-sdk";
// import ImageKit from "imagekit";
// import { AgentContext, AgentResult, GeneratorOutput } from "./types";

// const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
// const imagekit = new ImageKit({
//     publicKey: process.env.NEXT_PUBLIC_PUBLIC_KEY!,
//     privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
//     urlEndpoint: process.env.NEXT_PUBLIC_URL_ENDPOINT!
// });

// export async function runGeneratorAgent(
//     context: AgentContext
// ): Promise<AgentResult<GeneratorOutput>> {
//     const { state, input } = context;

//     console.log("[GENERATOR] Running generator agent...");

//     // Validate prerequisites
//     if (!state.selectedLayout || !state.selectedLayout.zones) {
//         return {
//             success: false,
//             error: "No layout selected. Cannot generate pin.",
//             validationErrors: ["Missing layout"]
//         };
//     }

//     if (!state.approvedContent) {
//         return {
//             success: false,
//             error: "No content approved. Cannot generate pin.",
//             validationErrors: ["Missing content"]
//         };
//     }

//     const bgUrl = state.approvedBackground?.url;
//     if (!bgUrl) {
//         return {
//             success: false,
//             error: "No background selected. Cannot generate pin.",
//             validationErrors: ["Missing background"]
//         };
//     }

//     // Build the generation prompt
//     const prompt = buildGenerationPrompt(state);

//     try {
//         console.log("[GENERATOR] Calling LLM to generate pin_json...");
//         const response = await client.chat.completions.create({
//             model: "openai/gpt-oss-120b",
//             messages: [
//                 {
//                     role: "system",
//                     content:
//                         "You are a Pinterest pin designer. Generate a valid pin_json with layers and styling. Return ONLY the JSON block in <pin_json> tags."
//                 },
//                 {
//                     role: "user",
//                     content: prompt
//                 }
//             ],
//             temperature: 0.7,
//             max_completion_tokens: 1000
//         });

//         const llmContent = response.choices[0].message.content || "";

//         // Extract pin_json
//         const jsonMatch = llmContent.match(/<pin_json>([\s\S]*?)<\/pin_json>/);
//         if (!jsonMatch) {
//             console.error("[GENERATOR] No pin_json found in LLM response");
//             return {
//                 success: false,
//                 error: "LLM did not return valid pin_json",
//                 validationErrors: ["Missing pin_json block"]
//             };
//         }

//         const pinJson = JSON.parse(jsonMatch[1].trim());

//         // Validate pin_json structure
//         if (!pinJson.baseImageUrl || !Array.isArray(pinJson.layers)) {
//             return {
//                 success: false,
//                 error: "pin_json missing required fields",
//                 validationErrors: ["Invalid pin_json structure"]
//             };
//         }

//         console.log("[GENERATOR] Generated pin_json with", pinJson.layers.length, "layers");

//         // For now, return the pin_json without rendering
//         // (rendering happens in route.ts via renderPin() function)
//         return {
//             success: true,
//             data: {
//                 pinJson: {
//                     baseImageUrl: bgUrl,
//                     style: pinJson.style || "minimalist",
//                     layers: pinJson.layers
//                 }
//             }
//         };
//     } catch (error: any) {
//         console.error("[GENERATOR] Error:", error.message);
//         return {
//             success: false,
//             error: "Pin generation failed: " + error.message
//         };
//     }
// }

// function buildGenerationPrompt(state: any): string {
//     const { selectedLayout, approvedContent, approvedBackground } = state;
//     const content = approvedContent || "";

//     return `Generate a Pinterest pin with the following:

// Background: ${approvedBackground?.url || "[BACKGROUND_PROVIDED]"}
// Layout: ${JSON.stringify({
//         name: selectedLayout?.name,
//         zones: selectedLayout?.zones
//     })}
// Content: ${content}

// Return valid pin_json:
// <pin_json>
// {
//   "baseImageUrl": "${approvedBackground?.url}",
//   "style": "modern",
//   "layers": [
//     { "role": "hook", "text": "YOUR_TEXT_HERE", "colorOverride": "#ffffff", "sizeOverride": 48 },
//     { "role": "body", "text": "YOUR_BODY_TEXT", "colorOverride": "#ffffff", "sizeOverride": 28 }
//   ]
// }
// </pin_json>`;
// }
/**
 * GENERATOR AGENT
 * Builds pin_json from selected content + layout + background
 * Compatible with PinProject architecture
 */

import Groq from "groq-sdk";
import ImageKit from "imagekit";

import {
    AgentContext,
    AgentResult,
    GeneratorOutput
} from "./types";

const client = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const imagekit = new ImageKit({
    publicKey:
        process.env.NEXT_PUBLIC_PUBLIC_KEY!,
    privateKey:
        process.env.IMAGEKIT_PRIVATE_KEY!,
    urlEndpoint:
        process.env.NEXT_PUBLIC_URL_ENDPOINT!
});

export async function runGeneratorAgent(
    context: AgentContext
): Promise<AgentResult<GeneratorOutput>> {
    const { project, input } = context;

    console.log(
        "[GENERATOR] Running generator agent..."
    );

    // ─────────────────────────────────────────
    // Resolve selections
    // ─────────────────────────────────────────

    const selectedContent =
        input.selectedContent ||
        project.selectedContent;

    const selectedLayout =
        input.selectedLayout ||
        project.selectedLayout;

    const selectedBackground =
        input.selectedBackground ||
        project.selectedBackground;

    // ─────────────────────────────────────────
    // Validation
    // ─────────────────────────────────────────

    if (!selectedContent) {
        return {
            success: false,
            error:
                "No content selected. Cannot generate pin.",
            validationErrors: [
                "Missing content"
            ]
        };
    }

    if (
        !selectedLayout ||
        !selectedLayout.layoutZones
    ) {
        return {
            success: false,
            error:
                "No layout selected. Cannot generate pin.",
            validationErrors: [
                "Missing layout"
            ]
        };
    }

    if (!selectedBackground) {
        return {
            success: false,
            error:
                "No background selected. Cannot generate pin.",
            validationErrors: [
                "Missing background"
            ]
        };
    }

    const bgUrl =
        selectedBackground.backgroundUrl;

    if (!bgUrl) {
        return {
            success: false,
            error:
                "Background image URL missing.",
            validationErrors: [
                "Invalid background"
            ]
        };
    }

    // ─────────────────────────────────────────
    // Build Prompt
    // ─────────────────────────────────────────

    const prompt =
        buildGenerationPrompt({
            selectedContent,
            selectedLayout,
            selectedBackground
        });

    try {
        console.log(
            "[GENERATOR] Calling LLM..."
        );

        const response =
            await client.chat.completions.create(
                {
                    model:
                        "openai/gpt-oss-120b",

                    messages: [
                        {
                            role: "system",

                            content:
                                "You are a Pinterest pin designer. Return ONLY a valid pin_json wrapped in <pin_json> tags."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],

                    temperature: 0.7,

                    max_completion_tokens:
                        1000
                }
            );

        const llmContent =
            response.choices?.[0]?.message
                ?.content || "";

        const jsonMatch =
            llmContent.match(
                /<pin_json>([\s\S]*?)<\/pin_json>/
            );

        if (!jsonMatch) {
            return {
                success: false,

                error:
                    "LLM did not return pin_json",

                validationErrors: [
                    "Missing pin_json"
                ]
            };
        }

        const pinJson = JSON.parse(
            jsonMatch[1].trim()
        );

        if (
            !Array.isArray(
                pinJson.layers
            )
        ) {
            return {
                success: false,

                error:
                    "Invalid pin_json structure",

                validationErrors: [
                    "layers missing"
                ]
            };
        }

        console.log(
            "[GENERATOR] Pin generated successfully"
        );

        return {
            success: true,

            data: {
                id: crypto.randomUUID(),

                pinJson: {
                    baseImageUrl:
                        bgUrl,

                    style:
                        pinJson.style ||
                        "modern",

                    layers:
                        pinJson.layers
                }
            }
        };
    } catch (error: any) {
        console.error(
            "[GENERATOR]",
            error.message
        );

        return {
            success: false,

            error:
                "Pin generation failed: " +
                error.message
        };
    }
}

// ─────────────────────────────────────────────
// Prompt Builder
// ─────────────────────────────────────────────

function buildGenerationPrompt(
    data: {
        selectedContent: any;
        selectedLayout: any;
        selectedBackground: any;
    }
): string {
    const {
        selectedContent,
        selectedLayout,
        selectedBackground
    } = data;

    return `
Generate a Pinterest pin design.

BACKGROUND:
${selectedBackground.backgroundUrl}

LAYOUT:
${JSON.stringify({
    name:
        selectedLayout.layoutName,
    zones:
        selectedLayout.layoutZones
})}

CONTENT:
${JSON.stringify({
    headline:
        selectedContent.headline,
    steps:
        selectedContent.steps,
    cta:
        selectedContent.cta
})}

Return ONLY:

<pin_json>
{
  "style": "modern",
  "layers": [
    {
      "role": "headline",
      "text": "Headline Here",
      "colorOverride": "#ffffff",
      "sizeOverride": 52
    },
    {
      "role": "body",
      "text": "Body Text Here",
      "colorOverride": "#ffffff",
      "sizeOverride": 28
    },
    {
      "role": "cta",
      "text": "Call To Action",
      "colorOverride": "#ffffff",
      "sizeOverride": 24
    }
  ]
}
</pin_json>
`;
}