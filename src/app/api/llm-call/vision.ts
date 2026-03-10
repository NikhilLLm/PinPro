import Groq from "groq-sdk";
import { IPexelsPhoto } from "@/types/pexels";

const Groq_api = process.env.GROQ_API_KEY;
const client = new Groq({ apiKey: Groq_api });

/**
 * Analyze a single image with vision LLM to get aesthetic description
 * Used for Pexels search results to provide context
 */
export async function getImageDescription(url: string): Promise<string> {
    try {
        const visionResponse = await client.chat.completions.create({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Analyze this image briefly (1-2 sentences). Describe: mood/aesthetic, main subject, colors, lighting style, and vibe for Pinterest inspiration."
                        },
                        {
                            type: "image_url",
                            image_url: { url: url }
                        }
                    ]
                }
            ],
            max_completion_tokens: 150
        });
        return visionResponse.choices[0].message.content || "";
    } catch (error) {
        console.error("Vision Analysis failed:", error);
        return "";
    }
}

/**
 * Analyze a reference image to extract visual attributes
 * Used for user-uploaded reference images
 */
export async function analyzeReferenceImage(url: string): Promise<string> {
    try {
        const visionResponse = await client.chat.completions.create({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Analyze this image and provide a list of descriptive tags (subject, hair color, clothing details, expression, background) separated by commas. Focus on physical attributes so another AI can recreate this exact character."
                        },
                        {
                            type: "image_url",
                            image_url: { url: url }
                        }
                    ]
                }
            ],
            max_completion_tokens: 300
        });
        return visionResponse.choices[0].message.content || "";
    } catch (error) {
        console.error("Vision Analysis failed:", error);
        return "";
    }
}

/**
 * Analyze multiple Pexels images in parallel
 */
export async function analyzePexelsImages(photos: IPexelsPhoto[]): Promise<Array<IPexelsPhoto & { analysis: string }>> {
    const photosWithAnalysis = await Promise.all(
        photos.slice(0, 5).map(async (p: IPexelsPhoto) => {
            const description = await getImageDescription(p.src.large);
            return {
                ...p,
                analysis: description
            };
        })
    );
    return photosWithAnalysis;
}


//Analyze the core selected images 


export async function analyzeSelectedStyles(images: { id: string | number, url: string }[]): Promise<string> {
    if (!images || images.length === 0) return "";

    try {
        // For efficiency in MVP, we analyze the first 3 selected images
        const styleAnalysis = await Promise.all(
            images.slice(0, 3).map(async (img) => {
                const response = await client.chat.completions.create({
                    model: "meta-llama/llama-4-scout-17b-16e-instruct",
                    messages: [
                        {
                            role: "user",
                            content: [
                                {
                                    type: "text",
                                    text: "Describe the aesthetic, colors, and style of this image for Pinterest inspiration in 1 sentence."
                                },
                                {
                                    type: "image_url",
                                    image_url: { url: img.url }
                                }
                            ]
                        }
                    ],
                    max_completion_tokens: 100
                });
                return response.choices[0].message.content || "";
            })
        );

        return styleAnalysis.join(" | ");
    }
    catch (error) {
        console.error("Vision Analysis failed:", error);
        return "";
    }
}

/**
 * Extract a structured layout definition from a reference image
 */
export async function extractLayoutDefinition(url: string): Promise<any> {
    try {
        const visionResponse = await client.chat.completions.create({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Analyze this Pinterest pin layout and extract its structural blueprint.
Return ONLY a JSON object matching this TypeScript interface:

{
  "name": string,
  "description": string,
  "layoutType": "classic"|"overlay"|"split"|"three_column"|"two_col_list"|"card_grid"|"step_grid"|"magazine"|"custom",
  "columnCount": number,
  "zones": {
    "[unique_key]": { "x": 0-1000, "y": 0-1000, "width": 0-1000, "height": 0-1000, "align": "left"|"center"|"right", "role": "hook"|"subheading"|"body"|"tip"|"cta"|"step"|"column" }
  },
  "roleMap": {
    "hook": ["key1"],
    "body": ["key2", "key3"],
    "cta": ["key4"]
  },
  "recommendedStyle": "minimal"|"bold"|"editorial"|"dark"|"pastel"|"nature"
}

CRITICAL: 
1. Coordinates are normalized to 1000x1000.
2. If the design has 3 columns or steps, create unique zone keys like "step_1", "step_2", "step_3" and map them in roleMap.
3. Be precise with the 'align' property for each zone.`
                        },
                        {
                            type: "image_url",
                            image_url: { url: url }
                        }
                    ]
                }
            ],
            response_format: { type: "json_object" },
            max_completion_tokens: 800
        });

        const content = visionResponse.choices[0].message.content || "{}";
        console.log(content);
        return JSON.parse(content);
    } catch (error) {
        console.error("Layout Extraction failed:", error);
        return null;
    }
}