//Input
export interface HuggingFluxInput {
    query: string;
}
//Output

export interface ImageOutput{
    format:string
}


//for image to image
export interface OpenRouterInput{
    url:string | null,
    prompt:string
}
