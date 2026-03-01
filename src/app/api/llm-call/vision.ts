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
            model: "meta-llama/llama-4-maverick-17b-128e-instruct",
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
            model: "meta-llama/llama-4-maverick-17b-128e-instruct",
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
