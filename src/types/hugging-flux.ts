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
    data:{
        url:string | null,
        selected_images:(string | number)[],
    },
    prompt: string,
    strength?: number
}
