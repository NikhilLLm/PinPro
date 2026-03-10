// ─── types/tavily.ts ─────────────────────────────────

export interface TavilyResult {
    title: string;
    url: string;
    content: string;
    raw_content?: string;
    score: number;
    published_date?: string;
}

export interface TavilyImage {
    url: string;
    description?: string;
}

export interface TavilySearchResponse {
    query: string;
    answer?: string;
    results: TavilyResult[];
    images?: TavilyImage[];
}

export interface SearchWebInput {
    query: string;
    search_depth?: "basic" | "advanced";
    include_answer?: boolean;
    include_images?: boolean;
    include_raw_content?: false | 'markdown' | 'text' | undefined;
    max_results?: number;
    exclude_domains?: string[];
    include_domains?: string[];
}