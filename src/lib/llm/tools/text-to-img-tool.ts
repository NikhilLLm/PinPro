import { HuggingFluxInput, ImageOutput } from "@/types/hugging-flux";
import { InferenceClient } from "@huggingface/inference";
import ImageKit from "imagekit";
import { Tool } from "@/types/tool";
import { Blob } from "buffer";
const client = new InferenceClient(process.env.HF_TOKEN);

async function generateImage(input: HuggingFluxInput): Promise<Blob | string> {
    try {
        const image: Blob | string = await client.textToImage({
            provider: "hf-inference",
            model: "black-forest-labs/FLUX.1-schnell",
            inputs: input.query,
            parameters: { num_inference_steps: 5 },
        })
        return image
    } catch (error) {
        console.error("Error generating image:", error);
        throw error;
    }
}

//this will generate the blob

const imagekit = new ImageKit({
    publicKey: process.env.NEXT_PUBLIC_PUBLIC_KEY!.trim(),
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY!.trim(),
    urlEndpoint: process.env.NEXT_PUBLIC_URL_ENDPOINT!.trim(),
});



//tool

export const textToImageGenTool: Tool<HuggingFluxInput, ImageOutput> = {
    name: "text_to_image_tool",
    description: "Generate image based on the prompt",
    execute: async (input) => {
        try {
            const image = await generateImage(input)
            //convert this image in base64
            const arrayBuffer = await (image as Blob).arrayBuffer();
            const buffer = Buffer.from(arrayBuffer)
            const base64 = "data:image/png;base64," + buffer.toString("base64")
            return { format:base64 }
        } catch (error) {
            console.error("Error generating image:", error);
            throw error;
        }
    }
}



//arrayBuffer convert binary to array style [12,312,...]
//then Buffer conver that arrayBuffer ready to convert in Node js usable format and then convert in the base 64