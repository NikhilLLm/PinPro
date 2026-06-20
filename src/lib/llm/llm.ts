import { LayoutDefinition } from "@/types/llm-json";

export async function createProject(topic: string) {
    const response = await fetch("/api/llm-call/create", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ topic })
    });
    console.log("content response",response)
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`createProject failed (${response.status}): ${text}`);
    }


    return await response.json();
}

export async function generateMinimalContent(topic: string) {
    const response = await fetch("/api/llm-call/refine-content", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ topic })
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`generate-content failed (${response.status}): ${text}`);
    }

    return await response.json();
}

export async function generateBackground(topic: string, prompt?: string) {
    const response = await fetch("/api/llm-call/refine-bg", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ topic, prompt })
    });
    console.log("Topic",topic)

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`generate-bg failed (${response.status}): ${text}`);
    }

    return await response.json();
}

export async function generateLayout(topic: string, prompt?: string) {
    const response = await fetch("/api/llm-call/refine-layout", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ topic, prompt })
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`generate-layout failed (${response.status}): ${text}`);
    }

    return await response.json();
}

export async function generatePin(body: {
    
    projectId: string;
    topic: string;
    content: { headline: string; body: string[]; cta: string };
    layout: LayoutDefinition;
    background: { url: string; prompt: string };
}) {
    const response = await fetch("/api/llm-call/generate-pin", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`generate-pin failed (${response.status}): ${text}`);
    }

    return await response.json();
}