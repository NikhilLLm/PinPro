//Input
export interface HuggingFluxInput {
    query: string;
}
//Output

export interface ImageOutput {
    format: string
}


//for image to image
export interface OpenRouterInput {
    data: {
        url: string | null,
        selected_images: selectedImages[],
        sessionId?: string | null,
        selectedLayout?: any,
        layouts?: any[],
        pexelsPhotos?: any[],
        generatedImages?: any[],
        approvedBackground?: { url: string; source: "pexels" | "ai" | "upload" } | null,
        approvedContent?: string | null,
        pinTopic?: string,
        event?: "layout_selected" | "background_selected" | "content_approved" | "reject_result" | "refine_request" | "build_request",
        hasBackground?: boolean,
        hasText?: boolean,
    },
    prompt: string,
    strength?: number
}

export interface selectedImages {
    id: string | number,
    url: string
}
