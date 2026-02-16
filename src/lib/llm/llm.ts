export async function getLLMResponse(prompt: string, history: any[] = []) {
    const response = await fetch("/api/llm-call", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ prompt, history })
    })
    if (!response.ok) {
        throw new Error("Failed to get LLM response")
    }
    const data = await response.json()
    return data
}