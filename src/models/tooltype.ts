import { IPexelsResponse,PexelsInput } from "@/models/Pexels";
export interface Tool<InputType,OutputType>{
    name:string,
    description:string;
    execute:(input:InputType)=> Promise<OutputType>
}



//pexels tool
export type PexelsTool=Tool<PexelsInput,IPexelsResponse>