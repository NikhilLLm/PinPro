import { OpenRouterInput } from "@/types/hugging-flux"

export async function getLLMResponse(input:OpenRouterInput, history: any[] = []) {
    const response = await fetch("/api/llm-call", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ input, history })
    })
    if (!response.ok) {
        throw new Error("Failed to get LLM response")
    }
    const data = await response.json()
    return data
}