export interface IPexelsPhoto {
    id: number;
    width: number;
    height: number;
    url: string;
    photographer: string;
    photographer_url: string;
    photographer_id: string | null;
    avg_color: string | null;
    src: {
        original: string;
        large2x: string;
        large: string;
        medium: string;
        small: string;
        portrait: string;
        landscape: string;
        tiny: string;
    };
    alt: string | null;
}

export interface IPexelsResponse {
    total_results: number;
    page: number;
    per_page: number;
    photos: IPexelsPhoto[];
    next_page?: number | null;
}

//1.pexels tool
export interface PexelsInput {
    query: string
}
