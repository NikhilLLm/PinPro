import { ImageOutput, OpenRouterInput } from "@/types/hugging-flux";
import { Tool } from "@/types/tool";

const apiToken = process.env.CLOUDEFARE_TOKEN;
const accountId = process.env.ACCOUNT_ID;

export async function generateImageCloudflare(input: OpenRouterInput): Promise<ImageOutput> {
    try {
        const formData = new FormData();

        // Add prompt and settings
        formData.append("prompt", input.prompt);
        formData.append("width", "1024");
        formData.append("height", "1024");
        if (input.strength !== undefined) {
            formData.append("strength", input.strength.toString());
        }

        // Convert Data URI to Blob for reference image
        if (input.url) {
            const response = await fetch(input.url);
            const blob = await response.blob();
            // Flux-2 models often use 'image' or index-based keys for reference images
            formData.append("image", blob, "reference.jpg");
        }

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

        // Cloudflare Flux results are usually in result.image or result[0]
        let rawImage = result.result?.image || result.result?.[0] || result.image;

        if (!rawImage) {
            console.error("Cloudflare response missing image data:", result);
            throw new Error("Missing image data in Cloudflare response");
        }

        // Strip any whitespace (newlines, spaces) that might be in the base64
        if (typeof rawImage === 'string') {
            rawImage = rawImage.replace(/\s/g, '');
        }

        // Handle case where it might already be a data URI
        if (typeof rawImage === 'string' && rawImage.startsWith('data:')) {
            return { format: rawImage };
        }

        // Detect format (default to PNG, but often JPEG for Flux)
        // Check for common headers in base64
        let prefix = 'data:image/png;base64,';
        if (rawImage.startsWith('/9j/')) prefix = 'data:image/jpeg;base64,';
        else if (rawImage.startsWith('iVBORw')) prefix = 'data:image/png;base64,';
        else if (rawImage.startsWith('UklGR')) prefix = 'data:image/webp;base64,';

        return { format: `${prefix}${rawImage}` };
    } catch (error) {
        console.error("Cloudflare Image Generation failed:", error);
    }
    return { format: "" };
}

// img to img tool using Cloudflare AI
export const ImagetoImageGen: Tool<OpenRouterInput, ImageOutput> = {
    name: "image_to_image_gen_tool",
    description: "Generation of image to image based on provided image plus prompt using Cloudflare Flux AI",
    execute: async (input) => {
        try {
            const res = await generateImageCloudflare(input);
            return { format: res.format };
        } catch (error) {
            console.error(error);
        }
        return { format: "" };
    }
};
