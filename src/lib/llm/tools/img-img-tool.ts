import { ImageOutput, OpenRouterInput } from "@/types/hugging-flux";

import { Tool } from "@/types/tool";


const apiKey = process.env.OPENAI_API_KEY;

type ImageMessage = {
    images?: {
        image_format: {
            format: string;
        };
    }[];
};

export async function generateImageOpenRouter(input: OpenRouterInput): Promise<ImageOutput> {
    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: "black-forest-labs/flux.2-flex",
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: input.prompt,
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: input.url,
                                }
                            }
                        ]
                    }
                ],
                modalities: ['image']
            }),
        });

        const result = await response.json();

        console.log(result)

        if (result.choices?.[0]?.message) {
            const message = result.choices[0].message;

            // Path 1: Nested image_format (Standard for some providers)
            let base64 = (message as any).images?.[0]?.image_format?.format;

            // Path 2: Direct images[0].url if it's a data URI
            if (!base64 && (message as any).images?.[0]?.url?.startsWith('data:')) {
                return { format: (message as any).images[0].url };
            }

            // Path 3: Direct images[0].url if it's raw base64
            if (!base64 && (message as any).images?.[0]?.url) {
                base64 = (message as any).images[0].url;
            }

            if (base64) {
                // Return with required data URI prefix
                return { format: base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}` };
            }
        }
    } catch (error) {
        console.error("OpenRouter Image Generation failed:", error);
    }
    return { format: "" }
}


//img to img tool

export const ImagetoImageGen: Tool<OpenRouterInput, ImageOutput> = {
    name: "image_to_image_gen_tool",
    description: "Generation of image to image based on provided image plus prompt",
    execute: async (input) => {
        try {
            const res = await generateImageOpenRouter(input)
            return { format: res.format }
        }
        catch (error) {
            console.error(error)
        }
        return { format: "" }

    }

}
