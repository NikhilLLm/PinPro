
export interface Tool<InputType, OutputType> {
    name: string,
    description: string;
    execute: (input: InputType) => Promise<OutputType>
}
