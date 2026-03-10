import { HuggingFluxInput, ImageOutput } from "@/types/hugging-flux";
import { Tool } from "@/types/tool";

const apiToken = process.env.CLOUDEFARE_TOKEN;
const accountId = process.env.ACCOUNT_ID;

async function generateImage(input: HuggingFluxInput): Promise<string> {
    try {
        const formData = new FormData();
        formData.append("prompt", input.query);
        formData.append("width", "1000");
        formData.append("height", "1500");

        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-2-klein-4b`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiToken}`,
                },
                body: formData,
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Cloudflare API error: ${response.status} ${errorText}`);
            throw new Error(`Cloudflare API error: ${response.statusText}`);
        }

        const result = await response.json();
        let rawImage = result.result?.image || result.result?.[0] || result.image;

        if (!rawImage) {
            console.error("Cloudflare response missing image data:", result);
            throw new Error("Missing image data in Cloudflare response");
        }

        // Strip whitespace from base64
        if (typeof rawImage === 'string') {
            rawImage = rawImage.replace(/\s/g, '');
        }

        // If already a data URI, return as-is
        if (typeof rawImage === 'string' && rawImage.startsWith('data:')) {
            return rawImage;
        }

        // Detect format
        let prefix = 'data:image/png;base64,';
        if (rawImage.startsWith('/9j/')) prefix = 'data:image/jpeg;base64,';
        else if (rawImage.startsWith('iVBORw')) prefix = 'data:image/png;base64,';
        else if (rawImage.startsWith('UklGR')) prefix = 'data:image/webp;base64,';

        return `${prefix}${rawImage}`;
    } catch (error) {
        console.error("Error generating image:", error);
        throw error;
    }
}

//tool

export const textToImageGenTool: Tool<HuggingFluxInput, ImageOutput> = {
    name: "text_to_image_tool",
    description: "Generate a high-quality image from a detailed visual prompt. Best results come from prompts that describe: composition/layout, specific objects, photography style, lighting, background surface, and quality keywords (4k, sharp focus). Never include text or quotes in the prompt.",
    execute: async (input) => {
        try {
            const base64 = await generateImage(input);
            return { format: base64 };
        } catch (error) {
            console.error("Error generating image:", error);
            throw error;
        }
    }
}