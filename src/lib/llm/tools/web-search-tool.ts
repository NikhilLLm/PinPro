// To install: npm i @tavily/core
import { tavily } from '@tavily/core';
import { SearchWebInput, TavilySearchResponse } from '@/types/web-tool';
import { Tool } from '@/types/tool';
const client = tavily({ apiKey: process.env.TAVILY_API_KEY });



async function searchWeb(input: SearchWebInput) {
    const result = await client.search(input.query, {
        searchDepth: input.search_depth ?? "advanced",
        includeAnswer: input.include_answer ?? true,
        includeImages: input.include_images ?? true,
        includeRawContent: input.include_raw_content,
        maxResults: input.max_results ?? 5,
        excludeDomains: input.exclude_domains,
        includeDomains: input.include_domains,
    });
    console.log("Web search result:", result);
    return result;
}


export const webSearchTool: Tool<SearchWebInput, TavilySearchResponse> = {
    name: "web_search_tool",
    description: "Search the web for information.",
    execute: async (input) => {
        try {
            const result = await searchWeb(input);
            return result;
        } catch (error) {
            console.error("Error searching the web:", error);
            throw error;
        }
    }
}