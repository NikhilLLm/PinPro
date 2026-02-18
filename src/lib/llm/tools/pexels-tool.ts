import { IPexelsResponse, PexelsInput } from "@/types/pexels";
import { Tool } from "@/types/tool";
import { createClient } from "pexels"

const client = createClient(process.env.PEXELS_API_KEY!)

export const pexelsTool: Tool<PexelsInput, IPexelsResponse> = {
    name: "Search_Images",
    description: "Search for images on pexels , query should be keywords and adjective, always search  in english",
    execute: async (input: PexelsInput): Promise<IPexelsResponse> => {
        const result = await client.photos.search({ query: input.query, per_page: 15 })
        return result as IPexelsResponse
    }
}
