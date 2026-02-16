import { createClient } from "pexels";
import { IPexelsPhoto, IPexelsResponse } from "@/models/Pexels";
import { PexelsTool } from "../../../models/tooltype";

const client = createClient(process.env.PEXELS_API_KEY!)

export const pexelsTool: PexelsTool = {
    name: "Search_Images",
    description: "Fetch Image from Pexels API",

    execute: async (input) => {
        const res = await client.photos.search({
            query: input.query,
            per_page: 10
        });

        // type guard
        if ("photos" in res) {
            return res;
        }

        return {
            total_results: 0,
            page: 0,
            per_page: 0,
            photos: [],
            next_page: null
        } as IPexelsResponse
    }
};
