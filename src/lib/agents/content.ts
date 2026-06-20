
/**
 * CONTENT AGENT
 * Generates Pinterest content suggestions from a topic
 * Compatible with PinProject architecture
 */

import Groq from "groq-sdk";
import {
    AgentContext,
    AgentResult,
    ContentOutput
} from "./types";

const client = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

export async function runContentAgent(
    context: AgentContext
): Promise<AgentResult<ContentOutput>> {
    const { project, input } = context;

    console.log("[CONTENT] Running content agent...");
   

    // Use approved content if already selected
    if (input.approvedContent) {
        const existingContent = input.approvedContent;

        return {
            success: true,
            data: {
                id: crypto.randomUUID(),
                headline: existingContent
                    .split("\n")[0]
                    .substring(0, 60),
                steps: [existingContent.substring(0, 100)],
                cta: "Learn More"
            }
        };
    }

    // Determine topic
    const topic =
        input.topic ||
        input.prompt ||
        project.topic ||
        "";

    if (!topic.trim()) {
        return {
            success: false,
            error: "No topic provided",
            validationErrors: ["Topic is required"]
        };
    }

    const prompt = buildContentPrompt(topic);

    try {
        const response = await client.chat.completions.create({
            model: "llama-3.3-70b-versatile",

            messages: [
                {
                    role: "system",
                    content:
                        "You are a Pinterest content strategist. Return valid JSON only."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],

            temperature: 0.4,
            max_completion_tokens: 250
        });
        
        const content =
            response.choices?.[0]?.message?.content || "";

        console.log("content", content)

        const parsed = parseContentResponse(content);

        console.log("parsed content", parsed)

        if (!parsed) {
            return {
                success: false,
                error: "Failed to parse content",
                validationErrors: ["Invalid JSON response"]
            };
        }

        const validation = validateContentLengths(parsed);

        if (!validation.isValid) {
            return {
                success: false,
                error: "Generated content invalid",
                validationErrors: validation.errors
            };
        }

        console.log("[CONTENT] Generated content");

        return {
            success: true,
            data: parsed
        };
    } catch (error: any) {
        console.error(
            "[CONTENT] Generation failed:",
            error.message
        );

        return {
            success: false,
            error: error.message
        };
    }
}

function buildContentPrompt(topic: string): string {
    return `
Generate Pinterest content.

Topic:
${topic}

Return ONLY valid JSON.

{
  "headline": "max 60 chars",
  "steps": [
    "step 1",
    "step 2",
    "step 3",
    "step 4",
    "step 5"
  ],
  "cta": "max 30 chars"
}
`;
}

function parseContentResponse(
    response: string
): ContentOutput | null {
    try {
        const jsonMatch =
            response.match(/\{[\s\S]*\}/);

        if (!jsonMatch) return null;

        const parsed = JSON.parse(jsonMatch[0]);

        return {
            id: crypto.randomUUID(),

            headline: String(
                parsed.headline || ""
            ).substring(0, 60),

            steps: Array.isArray(parsed.steps)
                ? parsed.steps.map((s: string) =>
                      String(s).substring(0, 100)
                  )
                : [],

            cta: String(
                parsed.cta || "Learn More"
            ).substring(0, 30)
        };
    } catch {
        return null;
    }
}

function validateContentLengths(
    content: ContentOutput
): {
    isValid: boolean;
    errors: string[];
} {
    const errors: string[] = [];

    if (!content.headline) {
        errors.push("Headline missing");
    }

    if (content.headline.length > 60) {
        errors.push(
            `Headline exceeds 60 chars`
        );
    }

    if (
        content.steps.some(
            (step) => step.length > 100
        )
    ) {
        errors.push(
            "One or more steps exceed 100 chars"
        );
    }

    if (content.cta.length > 30) {
        errors.push(
            "CTA exceeds 30 chars"
        );
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

