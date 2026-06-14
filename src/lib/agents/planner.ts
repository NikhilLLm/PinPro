/**
 * PLANNER AGENT
 * Extracts / refines the pin topic, audience, tone, confidence
 * Input: raw user prompt or persisted goal
 * Output: structured PinIdeaOutput
 */

import { AgentContext, AgentResult, PlannerOutput } from "./types";

export async function runPlannerAgent(
    context: AgentContext
): Promise<AgentResult<PlannerOutput>> {
    const { state, input } = context;

    console.log("[PLANNER] Running planner agent...");

    // If already have a structured idea, return it
    if (state.pinIdea && state.pinIdea.confidence > 0.7) {
        console.log("[PLANNER] Idea already exists with confidence:", state.pinIdea.confidence);
        return { success: true, data: state.pinIdea as PlannerOutput };
    }

    // Extract topic from input or state
    const topic = (input.topic || input.prompt || state.goal || "").trim();
    if (!topic || topic.length < 5) {
        return {
            success: false,
            error: "No clear pin topic provided. Please describe your pin idea.",
            validationErrors: ["Topic too short or empty"]
        };
    }

    // Heuristic classification for now (can enhance with LLM later)
    const idea = classifyPinTopic(topic);

    console.log("[PLANNER] Extracted idea:", idea);

    return {
        success: true,
        data: idea
    };
}

/**
 * Heuristic pin topic classifier
 * Extracts audience, tone, and confidence from topic
 */
function classifyPinTopic(topic: string): PlannerOutput {
    const lowerTopic = topic.toLowerCase();

    // Detect audience
    let audience = "General";
    if (
        lowerTopic.includes("dev") ||
        lowerTopic.includes("engineer") ||
        lowerTopic.includes("code") ||
        lowerTopic.includes("programmer")
    ) {
        audience = "Developers";
    } else if (
        lowerTopic.includes("business") ||
        lowerTopic.includes("entrepreneur") ||
        lowerTopic.includes("founder")
    ) {
        audience = "Entrepreneurs";
    } else if (
        lowerTopic.includes("design") ||
        lowerTopic.includes("creative")
    ) {
        audience = "Creatives";
    }

    // Detect tone
    let tone = "Professional";
    if (lowerTopic.includes("fun") || lowerTopic.includes("play")) {
        tone = "Playful";
    } else if (lowerTopic.includes("serious") || lowerTopic.includes("critical")) {
        tone = "Serious";
    } else if (lowerTopic.includes("inspiring") || lowerTopic.includes("motivat")) {
        tone = "Inspirational";
    }

    // Confidence score based on topic detail
    const confidence = Math.min(1, Math.max(0, (topic.length - 10) / 100));

    return {
        topic: topic.substring(0, 120),
        audience,
        tone,
        confidence,
        rationale: `Detected ${audience} audience with ${tone.toLowerCase()} tone. Based on topic: "${topic.substring(0, 50)}..."`
    };
}
